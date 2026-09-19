import Fastify from 'fastify';
import cors from '@fastify/cors';
import { analyzeHtml } from './analyzer.js';
import { checkSitemap } from './sitemap.js';
import {
  createOAuthAuthUrl,
  consumeOAuthState,
  exchangeOAuthCode,
  getSessionStatus,
  deleteSession,
  getGoogleHubData,
  inspectUrlInGsc,
  publishUrlToIndexingApi,
  getSession,
} from './google.js';
import {
  startCrawlSession,
  getCrawlSession,
  getCrawlGraphData,
  getCrawlBrokenData,
  getCrawlTreeData,
  generateLinkOptimizationReport,
  addProgressListener,
  removeProgressListener,
} from './crawler.js';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  recordAuditToProject,
  getProjectHistory,
  calculateAuditDiff,
  getProjectGoogleSettings,
  updateProjectGoogleSettings,
  listAllProjectsAdmin,
  countUserProjects,
  publicProject,
} from './projects.js';
import {
  getAlertSettings,
  saveAlertSettings,
  listTeamMembers,
  addTeamMember,
  removeTeamMember,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  verifyApiKey,
  listEnabledAlertOwners,
} from './settings.js';
import {
  registerWithPassword,
  loginWithPassword,
  loginOrCreateWithGoogle,
  verifySessionToken,
  logoutSession,
  updateUserProfile,
  changeUserPassword,
  changeUserEmail,
  verifyEmailCode,
  resendVerificationCode,
  listAllUsers,
  updateUserRole,
  rollbackRegistration,
  restoreUserEmail,
} from './auth.js';

import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';
import { safeFetchUrl } from './url-security.js';
import { evaluateAuditWithJev, getJevRuntimeStats } from './jev.js';
import { sendAlertEmail, sendTeamInvitationEmail, sendVerificationEmail } from './mailer.js';
import { createAuditPdf } from './pdf-report.js';

async function main() {
  const fastify = Fastify({
    logger: true,
  });

  const allowedOrigins = new Set([
    process.env.NEXT_PUBLIC_APP_URL || 'https://seo.n-n.tokyo',
    ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000']),
  ]);
  await fastify.register(cors, {
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  });

  // 永続化ディレクトリ設定 (.data/audits)
  const baseDataDir = process.env.DATA_DIR || path.resolve(process.cwd(), '.data', 'audits');
  try {
    fs.mkdirSync(baseDataDir, { recursive: true });
  } catch {}

  // インメモリ診断結果キャッシュ (直近500件)
  const auditCache = new Map<string, any>();

  const readCookie = (request: any, name: string): string | undefined => {
    const raw = request.headers.cookie || '';
    const item = raw.split(';').map((part: string) => part.trim()).find((part: string) => part.startsWith(`${name}=`));
    return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
  };
  const authToken = (request: any): string | undefined =>
    request.headers.authorization || readCookie(request, 'seo_auth_token');
  const currentUser = (request: any) => verifySessionToken(authToken(request));
  const googleSessionId = (request: any): string | undefined => readCookie(request, 'google_session_id');
  const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const assertPublicWebhook = async (rawUrl: string) => {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') throw new Error('Webhook URLはHTTPSで指定してください');
    const addresses = await dns.lookup(parsed.hostname, { all: true });
    const privateIp = (address: string) => {
      if (net.isIPv4(address)) {
        const [a, b] = address.split('.').map(Number);
        return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
      }
      const value = address.toLowerCase();
      return value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:');
    };
    if (!addresses.length || addresses.some(({ address }) => privateIp(address))) {
      throw new Error('内部ネットワーク宛てのWebhook URLは使用できません');
    }
  };

  // 起動時にディスク上の既存レポートを復元
  try {
    if (fs.existsSync(baseDataDir)) {
      const files = fs.readdirSync(baseDataDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const id = file.replace('.json', '');
          try {
            const raw = fs.readFileSync(path.join(baseDataDir, file), 'utf8');
            auditCache.set(id, JSON.parse(raw));
          } catch {}
        }
      }
    }
  } catch {}

  fastify.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'seo-backend',
      version: '1.2.1',
      cachedAudits: auditCache.size,
      jevShadowEnabled: process.env.JEV_ENABLED === 'true' && Boolean(process.env.TYPESAFE_API_KEY),
      jevShadowStats: getJevRuntimeStats(),
      timestamp: new Date().toISOString(),
    };
  });

  // 即時URL診断エンドポイント (Cheerio 実スクレイピング & 150+ルール解析)
  fastify.post('/api/v1/audit/quick', async (request, reply) => {
    const body = request.body as { url?: string };
    if (!body || !body.url) {
      return reply.status(400).send({ error: 'URL is required' });
    }

    let targetUrl = body.url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      const startTime = Date.now();
      const [response, sitemapOutcome] = await Promise.all([
        safeFetchUrl(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/2.0; +https://seo.n-n.tokyo/bot)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(12000),
        }),
        checkSitemap(targetUrl).catch((err) => {
          fastify.log.warn({ err }, 'Sitemap check failed');
          return undefined;
        }),
      ]);

      const responseTimeMs = Date.now() - startTime;
      const html = await response.text();
      const httpStatus = response.status;

      const result = await evaluateAuditWithJev(
        analyzeHtml(targetUrl, html, responseTimeMs, httpStatus, undefined, sitemapOutcome),
      );

      // メモリ & ディスクに永続保存
      auditCache.set(result.id, result);
      try {
        fs.writeFileSync(path.join(baseDataDir, `${result.id}.json`), JSON.stringify(result), 'utf8');
      } catch {}

      // ログイン中のユーザーの場合のみ、プロジェクトへ自動記録（未ログイン時はパブリック汚染防止）
      try {
        const user = currentUser(request);
        if (user) {
          const proj = createProject(new URL(targetUrl).hostname, targetUrl, user.id);
          recordAuditToProject(proj.id, result);
        }
      } catch {}

      if (auditCache.size > 500) {
        const oldestKey = auditCache.keys().next().value;
        if (oldestKey) auditCache.delete(oldestKey);
      }

      return result;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ 
        error: 'Failed to fetch target URL', 
        message: err.message || 'Unknown network error' 
      });
    }
  });

  // 外部連携向けAPIキー認証付き即時診断
  fastify.post('/api/v1/api/audit/quick', async (request, reply) => {
    const rawKey = request.headers['x-api-key'];
    const verified = typeof rawKey === 'string' ? verifyApiKey(rawKey, 'write') : null;
    if (!verified) return reply.status(401).send({ error: '有効な書き込み権限付きAPIキーが必要です' });
    const body = (request.body || {}) as { url?: string };
    if (!body.url) return reply.status(400).send({ error: 'URL is required' });
    let targetUrl = body.url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl}`;
    try {
      const startedAt = Date.now();
      const [response, sitemapOutcome] = await Promise.all([
        safeFetchUrl(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/2.0; +https://seo.n-n.tokyo/bot)' },
          signal: AbortSignal.timeout(12_000),
        }),
        checkSitemap(targetUrl).catch(() => undefined),
      ]);
      const result = await evaluateAuditWithJev(
        analyzeHtml(targetUrl, await response.text(), Date.now() - startedAt, response.status, undefined, sitemapOutcome),
      );
      auditCache.set(result.id, result);
      fs.writeFileSync(path.join(baseDataDir, `${result.id}.json`), JSON.stringify(result), 'utf8');
      const project = createProject(new URL(targetUrl).hostname, targetUrl, verified.ownerId);
      recordAuditToProject(project.id, result);
      return result;
    } catch (err: any) {
      return reply.status(502).send({ error: 'Failed to fetch target URL', message: err.message });
    }
  });

  // 診断結果詳細取得エンドポイント (自動リカバリー対応)
  fastify.get('/api/v1/audit/results/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { url?: string };
    let cached = auditCache.get(id);

    if (!cached) {
      // ディスクから読み込み試行
      try {
        const filePath = path.join(baseDataDir, `${id}.json`);
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf8');
          cached = JSON.parse(raw);
          auditCache.set(id, cached);
        }
      } catch {}
    }

    // クエリパラメータに url がある場合、見つからなければその場で即時診断して復元
    if (!cached && query.url) {
      let targetUrl = query.url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
      }
      try {
        const startTime = Date.now();
        const [response, sitemapOutcome] = await Promise.all([
          safeFetchUrl(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/2.0; +https://seo.n-n.tokyo/bot)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(12000),
          }),
          checkSitemap(targetUrl).catch((err) => {
            fastify.log.warn({ err }, 'Sitemap check failed in recovery');
            return undefined;
          }),
        ]);
        const responseTimeMs = Date.now() - startTime;
        const html = await response.text();
        const result = await evaluateAuditWithJev(
          analyzeHtml(targetUrl, html, responseTimeMs, response.status, undefined, sitemapOutcome),
        );
        result.id = id; // 要求されたIDで保存
        auditCache.set(id, result);
        try {
          fs.writeFileSync(path.join(baseDataDir, `${id}.json`), JSON.stringify(result), 'utf8');
        } catch {}
        return result;
      } catch (err: any) {
        fastify.log.error(err);
      }
    }

    if (!cached) {
      return reply.status(404).send({ error: 'Audit result not found or expired' });
    }
    return cached;
  });

  fastify.get('/api/v1/audit/results/:id/pdf', async (request, reply) => {
    const { id } = request.params as { id: string };
    let audit = auditCache.get(id);
    if (!audit) {
      try { audit = JSON.parse(fs.readFileSync(path.join(baseDataDir, `${id}.json`), 'utf8')); } catch {}
    }
    if (!audit) return reply.status(404).send({ error: 'Audit result not found' });
    const pdf = await createAuditPdf(audit);
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="seo-report-${id.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf"`)
      .send(pdf);
  });

  // 内部/外部リンク一覧取得エンドポイント
  fastify.post('/api/v1/crawl/links', async (request, reply) => {
    const body = request.body as { url?: string };
    if (!body || !body.url) {
      return reply.status(400).send({ error: 'URL is required' });
    }

    let targetUrl = body.url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      const startTime = Date.now();
      const response = await safeFetchUrl(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/2.0; +https://seo.n-n.tokyo/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(12000),
      });

      const responseTimeMs = Date.now() - startTime;
      const html = await response.text();
      const result = analyzeHtml(targetUrl, html, responseTimeMs, response.status);

      return {
        url: targetUrl,
        totalLinks: result.links.length,
        internalLinks: result.links.filter((l) => l.isInternal),
        externalLinks: result.links.filter((l) => !l.isInternal),
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to crawl links', message: err.message });
    }
  });

  // llms.txt 動的生成ツールエンドポイント
  fastify.post('/api/v1/tools/generate-llms-txt', async (request, reply) => {
    const body = request.body as { url?: string; title?: string; description?: string };
    let siteUrl = (body.url || 'https://seo.n-n.tokyo').trim();
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      siteUrl = `https://${siteUrl}`;
    }

    let siteTitle = body.title || '';
    let siteDesc = body.description || '';
    let keyLinks: Array<{ text: string; url: string }> = [];

    // 実URLが指定された場合はメタ情報と内部リンクを自動取得
    try {
      const response = await safeFetchUrl(siteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/2.0; +https://seo.n-n.tokyo/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      });
      const html = await response.text();
      const analysis = analyzeHtml(siteUrl, html, 200, response.status);

      if (!siteTitle) siteTitle = analysis.meta.title || new URL(siteUrl).hostname;
      if (!siteDesc) siteDesc = analysis.meta.description || 'AI時代の次世代Webサイト';
      keyLinks = analysis.links
        .filter((l) => l.isInternal && l.anchorText.length > 2 && !l.anchorText.includes('テキストなし'))
        .slice(0, 8)
        .map((l) => ({ text: l.anchorText, url: l.url }));
    } catch {
      if (!siteTitle) siteTitle = new URL(siteUrl).hostname;
      if (!siteDesc) siteDesc = 'Webサイトの概要情報';
    }

    const linksSection = keyLinks.length > 0
      ? keyLinks.map((l) => `- [${l.text}](${l.url}): ${l.text}の詳細ページ`).join('\n')
      : `- [トップページ](${siteUrl}): メインポータル`;

    const llmsTxt = `# ${siteTitle}

> ${siteDesc}

## 主要ページ・リソース
${linksSection}

## 技術仕様 & 問い合わせ
- 運営URL: ${siteUrl}
- AI利用規約: 本サイトの構造化データおよび要約はLLMの参照・引用を歓迎します。
`.trim();

    return {
      url: siteUrl,
      llmsTxt,
      recommendedPath: '/llms.txt',
    };
  });

  // XMLサイトマップ単体検証エンドポイント
  fastify.post('/api/v1/tools/validate-sitemap', async (request, reply) => {
    const body = request.body as { url?: string };
    let siteUrl = (body?.url || 'https://seo.n-n.tokyo').trim();
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      siteUrl = `https://${siteUrl}`;
    }

    try {
      const outcome = await checkSitemap(siteUrl);
      return outcome;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: 'Failed to validate sitemap',
        message: err.message || 'Unknown validation error',
      });
    }
  });

  // ==============================================================================
  // Google公式API連携 & ブラウザー分離セッションエンドポイント群
  // ==============================================================================

  // 1. Google OAuth2 認証開始URL取得
  fastify.get('/api/v1/integrations/google/auth-url', async (request, reply) => {
    try {
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://seo.n-n.tokyo/api/v1/integrations/google/callback';
      const { url, state } = createOAuthAuthUrl(redirectUri, 'integration');
      return reply
        .header('Set-Cookie', `google_oauth_state=${encodeURIComponent(state)}; Path=/api/v1/integrations/google/callback; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=600`)
        .send({ url });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to generate OAuth URL', message: err.message });
    }
  });

  // 2. Google OAuth2 コールバック処理
  fastify.get('/api/v1/integrations/google/callback', async (request, reply) => {
    const query = request.query as { code?: string; error?: string; state?: string };
    const purpose = consumeOAuthState(query.state, readCookie(request, 'google_oauth_state'));
    const failurePath = purpose === 'login' ? '/login' : '/google/hub';
    if (!purpose) {
      return reply.redirect('/login?error=invalid_state');
    }
    if (query.error) {
      return reply.redirect(`${failurePath}?error=${encodeURIComponent(query.error)}`);
    }
    if (!query.code) {
      return reply.redirect(`${failurePath}?error=missing_code`);
    }

    try {
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://seo.n-n.tokyo/api/v1/integrations/google/callback';
      const session = await exchangeOAuthCode(query.code, redirectUri);
      if (purpose === 'login') {
        if (!session.email || !session.googleId) {
          return reply.redirect('/login?error=google_profile_missing');
        }
        const authRes = loginOrCreateWithGoogle({
          googleId: session.googleId,
          email: session.email,
          name: session.name || session.email.split('@')[0],
          picture: session.picture,
        });
        deleteSession(session.sessionId);
        return reply
          .header('Set-Cookie', `seo_auth_token=${encodeURIComponent(authRes.token)}; Path=/; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=${30 * 24 * 3600}`)
          .redirect('/login?google_login=success');
      }
      return reply
        .header('Set-Cookie', `google_session_id=${encodeURIComponent(session.sessionId)}; Path=/; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=${7 * 24 * 3600}`)
        .redirect('/google/hub?connected=1');
    } catch (err: any) {
      fastify.log.error(err);
      return reply.redirect(`${failurePath}?error=${encodeURIComponent(err.message || 'auth_failed')}`);
    }
  });

  // 3. 現在のブラウザのGoogle連携ステータス照会
  fastify.get('/api/v1/integrations/google/session', async (request, reply) => {
    const status = getSessionStatus(googleSessionId(request));
    return status;
  });

  // 4. 現在のブラウザのGoogle連携解除
  fastify.post('/api/v1/integrations/google/disconnect', async (request, reply) => {
    const sessionId = googleSessionId(request);

    if (sessionId) {
      deleteSession(sessionId);
    }

    return reply
      .header('Set-Cookie', `google_session_id=; Path=/; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=0`)
      .send({ success: true, message: 'Google連携を解除しました' });
  });

  // 5. Google統合ハブデータ取得 (PSI + GSC + GA4 + Gemini)
  fastify.post('/api/v1/google/hub-data', async (request, reply) => {
    const body = request.body as { url?: string; session_id?: string; projectId?: string };
    let targetUrl = (body?.url || 'https://seo.n-n.tokyo').trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    const user = currentUser(request);
    const isSuperAdmin = user?.role === 'ADMIN';
    const publicSiteUrl = process.env.PUBLIC_SITE_URL || 'https://seo.n-n.tokyo';
    let isSystemSite = false;
    try {
      isSystemSite = new URL(targetUrl).origin === new URL(publicSiteUrl).origin;
    } catch {}

    // プロジェクト設定の読み込み
    let projectGoogleApiKey: string | undefined;
    let projectGeminiApiKey: string | undefined;
    let gscSiteUrl: string | undefined;
    let ga4PropertyId: string | undefined;

    if (body?.projectId) {
      const p = getProject(body.projectId, user?.id);
      if (p?.googleSettings) {
        projectGoogleApiKey = p.googleSettings.googleApiKey;
        projectGeminiApiKey = p.googleSettings.geminiApiKey;
        gscSiteUrl = p.googleSettings.gscSiteUrl;
        ga4PropertyId = p.googleSettings.ga4PropertyId;
      }
    } else {
      // URLから該当プロジェクトを検索
      const parsed = new URL(targetUrl);
      const userProjects = listProjects(user?.id);
      const matched = userProjects.find((p) => p.targetDomain === parsed.hostname);
      if (matched?.googleSettings) {
        projectGoogleApiKey = matched.googleSettings.googleApiKey;
        projectGeminiApiKey = matched.googleSettings.geminiApiKey;
        gscSiteUrl = matched.googleSettings.gscSiteUrl;
        ga4PropertyId = matched.googleSettings.ga4PropertyId;
      }
    }

    const sessionId = googleSessionId(request);

    try {
      const hubData = await getGoogleHubData(sessionId, targetUrl, {
        customGoogleApiKey: projectGoogleApiKey,
        customGeminiKey: projectGeminiApiKey,
        gscSiteUrl,
        ga4PropertyId,
        isSuperAdmin,
        allowSystemApiKey: isSystemSite,
      });
      return hubData;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: 'Failed to fetch Google Hub data',
        message: err.message || 'Unknown error',
      });
    }
  });

  // ==============================================================================
  // ディープクロール & 内部リンク有向グラフ (SCR-10 〜 SCR-14)
  // ==============================================================================

  // クロール開始 (SCR-10)
  fastify.post('/api/v1/crawl/start', async (request, reply) => {
    const body = (request.body || {}) as { url?: string; maxPages?: number };
    if (!body.url) {
      return reply.status(400).send({ error: 'url is required' });
    }
    try {
      const sessionId = await startCrawlSession(body.url, body.maxPages || 60);
      return { sessionId, status: 'started' };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to start crawl', message: err.message });
    }
  });

  // クロール進捗取得 (ポーリング用)
  fastify.get('/api/v1/crawl/:sessionId/status', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const state = getCrawlSession(sessionId);
    if (!state) {
      return reply.status(404).send({ error: 'Crawl session not found' });
    }
    return state.session;
  });

  // クロール進捗 Server-Sent Events (SCR-11)
  fastify.get('/sse/crawl/:sessionId', (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no'); // Nginx / Caddyバッファ無効化

    const listener = (event: any) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.status === 'completed' || event.status === 'failed') {
        removeProgressListener(sessionId, listener);
        reply.raw.end();
      }
    };

    addProgressListener(sessionId, listener);

    request.raw.on('close', () => {
      removeProgressListener(sessionId, listener);
    });
  });

  // 内部リンク有向グラフ (SCR-12)
  fastify.get('/api/v1/crawl/:sessionId/graph', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const data = getCrawlGraphData(sessionId);
    if (!data) {
      return reply.status(404).send({ error: 'Crawl graph data not found' });
    }
    return data;
  });

  // リンク切れ404一覧 (SCR-13)
  fastify.get('/api/v1/crawl/:sessionId/broken', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const data = getCrawlBrokenData(sessionId);
    if (!data) {
      return reply.status(404).send({ error: 'Crawl broken links not found' });
    }
    return data;
  });

  // サイト構造階層ツリー (SCR-14)
  fastify.get('/api/v1/crawl/:sessionId/tree', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const data = getCrawlTreeData(sessionId);
    if (!data) {
      return reply.status(404).send({ error: 'Crawl tree data not found' });
    }
    return data;
  });

  // 内部リンク & トピッククラスター最適化レポート (18項目準拠)
  fastify.get('/api/v1/crawl/:sessionId/clusters', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const data = generateLinkOptimizationReport(sessionId);
    if (!data) {
      return reply.status(404).send({ error: 'Internal link optimization report not found for this session' });
    }
    return data;
  });

  // ==============================================================================
  // プロジェクト管理 & 履歴推移 (SCR-15 〜 SCR-17) - アカウント紐付け対応
  // ==============================================================================

  // プロジェクト一覧 (SCR-15: ログインユーザー紐付け & メール認証チェック)
  fastify.get('/api/v1/projects', async (request, reply) => {
    const user = currentUser(request);
    if (!user) {
      return { projects: [] };
    }
    if (!user.emailVerified) {
      return reply.status(403).send({
        error: 'メールアドレスの認証が必要です。マイページから認証コードを確認・入力してください。',
        emailVerified: false,
      });
    }
    return { projects: listProjects(user.id).map(publicProject) };
  });

  // プロジェクト作成 (SCR-15: ログインユーザー必須 & メール認証必須)
  fastify.post('/api/v1/projects', async (request, reply) => {
    const user = currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'プロジェクト作成にはログインが必要です' });
    }
    if (!user.emailVerified) {
      return reply.status(403).send({
        error: 'メールアドレスが未認証です。プロジェクト作成にはメール認証を完了してください。',
        emailVerified: false,
      });
    }

    const body = (request.body || {}) as { name?: string; url?: string };
    if (!body.url) return reply.status(400).send({ error: 'url is required' });

    const p = createProject(body.name || '', body.url, user.id);
    return publicProject(p);
  });

  // プロジェクト編集 (SCR-15: 所有者ログイン必須 & メール認証必須)
  fastify.put('/api/v1/projects/:id', async (request, reply) => {
    const user = currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'プロジェクト編集にはログインが必要です' });
    }
    if (!user.emailVerified) {
      return reply.status(403).send({
        error: 'メールアドレスが未認証です。メール認証を完了してください。',
        emailVerified: false,
      });
    }

    const { id } = request.params as { id: string };
    const body = (request.body || {}) as { name?: string; rootUrl?: string };

    try {
      const updated = updateProject(id, body, user.id);
      return publicProject(updated);
    } catch (err: any) {
      return reply.status(403).send({ error: err.message });
    }
  });

  // プロジェクト削除 (SCR-15: 所有者ログイン必須 & メール認証必須)
  fastify.delete('/api/v1/projects/:id', async (request, reply) => {
    const user = currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'プロジェクト削除にはログインが必要です' });
    }
    if (!user.emailVerified) {
      return reply.status(403).send({
        error: 'メールアドレスが未認証です。メール認証を完了してください。',
        emailVerified: false,
      });
    }

    const { id } = request.params as { id: string };
    try {
      const ok = deleteProject(id, user.id);
      if (!ok) return reply.status(404).send({ error: 'プロジェクトが見つかりません' });
      return { success: true, message: 'プロジェクトを削除しました' };
    } catch (err: any) {
      return reply.status(403).send({ error: err.message });
    }
  });

  // プロジェクト詳細 & 履歴 (SCR-16: 所有者認可 & メール認証必須)
  fastify.get('/api/v1/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = currentUser(request);
    if (user && !user.emailVerified) {
      return reply.status(403).send({
        error: 'メールアドレスが未認証です。マイページからメール認証を完了してください。',
        emailVerified: false,
      });
    }

    const project = getProject(id, user?.id);
    if (!project) return reply.status(404).send({ error: 'Project not found or access denied' });
    const history = getProjectHistory(id);
    return { project: publicProject(project), history };
  });

  // プロジェクト個別Google API設定取得
  fastify.get('/api/v1/projects/:id/google-settings', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = currentUser(request);

    const settings = getProjectGoogleSettings(id, user?.id);
    if (!settings) {
      return reply.status(404).send({ error: 'プロジェクトが見つからないか、アクセス権がありません' });
    }

    // セキュリティ: APIキーの一部をマスクして返却 (先頭4文字と末尾4文字のみ残す)
    const maskKey = (key?: string) => {
      if (!key) return '';
      if (key.length <= 8) return '********';
      return `${key.slice(0, 4)}...${key.slice(-4)}`;
    };

    return {
      settings: {
        gscSiteUrl: settings.gscSiteUrl,
        ga4PropertyId: settings.ga4PropertyId,
        updatedAt: settings.updatedAt,
        googleApiKeyMasked: maskKey(settings.googleApiKey),
        geminiApiKeyMasked: maskKey(settings.geminiApiKey),
        hasGoogleApiKey: Boolean(settings.googleApiKey),
        hasGeminiApiKey: Boolean(settings.geminiApiKey),
        hasServiceAccountJson: Boolean(settings.serviceAccountJson),
      },
    };
  });

  // プロジェクト個別Google API設定保存
  fastify.post('/api/v1/projects/:id/google-settings', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: '設定を保存するにはログインが必要です' });
    }

    const body = (request.body || {}) as {
      googleApiKey?: string;
      geminiApiKey?: string;
      gscSiteUrl?: string;
      ga4PropertyId?: string;
      serviceAccountJson?: string;
    };

    try {
      const updated = updateProjectGoogleSettings(id, body, user.id);
      return {
        success: true,
        settings: {
          gscSiteUrl: updated.gscSiteUrl,
          ga4PropertyId: updated.ga4PropertyId,
          updatedAt: updated.updatedAt,
          hasGoogleApiKey: Boolean(updated.googleApiKey),
          hasGeminiApiKey: Boolean(updated.geminiApiKey),
          hasServiceAccountJson: Boolean(updated.serviceAccountJson),
        },
      };
    } catch (err: any) {
      return reply.status(403).send({ error: err.message });
    }
  });

  // Time-Travel 履歴差分比較 (SCR-17: 所有者認可)
  fastify.get('/api/v1/projects/:id/diff', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = currentUser(request);

    const project = getProject(id, user?.id);
    if (!project) return reply.status(404).send({ error: 'Project not found or access denied' });

    const query = request.query as { baseId?: string; compareId?: string };
    const history = getProjectHistory(id);
    if (history.length < 2 && (!query.baseId || !query.compareId)) {
      return reply.status(400).send({ error: '履歴が2件以上必要です。複数回診断を実行してください。' });
    }

    const baseAuditId = query.baseId || history[history.length - 1]?.auditId;
    const compAuditId = query.compareId || history[0]?.auditId;

    // ディスクまたはキャッシュから取得
    let baseAudit = auditCache.get(baseAuditId);
    if (!baseAudit) {
      try {
        baseAudit = JSON.parse(fs.readFileSync(path.join(baseDataDir, `${baseAuditId}.json`), 'utf8'));
      } catch {}
    }

    let compAudit = auditCache.get(compAuditId);
    if (!compAudit) {
      try {
        compAudit = JSON.parse(fs.readFileSync(path.join(baseDataDir, `${compAuditId}.json`), 'utf8'));
      } catch {}
    }

    if (!baseAudit || !compAudit) {
      return reply.status(404).send({ error: '指定された監査データが見つかりません' });
    }

    const diff = calculateAuditDiff(project, baseAudit, compAudit);
    return diff;
  });

  // ==============================================================================
  // Google URL Inspection & Indexing API (SCR-18, SCR-19)
  // ==============================================================================

  // SCR-18: GSC URL Inspection
  fastify.post('/api/v1/google/inspect', async (request, reply) => {
    const body = (request.body || {}) as { url?: string; siteUrl?: string };
    if (!body.url) return reply.status(400).send({ error: 'url is required' });

    const session = getSession(googleSessionId(request));
    if (!session) return reply.status(401).send({ error: 'Googleアカウント連携が必要です' });
    try {
      return await inspectUrlInGsc(session, body.url.trim(), body.siteUrl);
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || 'URL検査に失敗しました' });
    }
  });

  // SCR-19: Google Indexing API 即時通知
  fastify.post('/api/v1/google/index-publish', async (request, reply) => {
    const body = (request.body || {}) as { url?: string; type?: 'URL_UPDATED' | 'URL_DELETED' };
    if (!body.url) return reply.status(400).send({ error: 'url is required' });

    const session = getSession(googleSessionId(request));
    if (!session) return reply.status(401).send({ error: 'Googleアカウント連携が必要です' });
    const type = body.type || 'URL_UPDATED';
    const result = await publishUrlToIndexingApi(session, body.url.trim(), type);
    return result;
  });

  // ==============================================================================
  // 監視・アラート & チーム & APIキー管理 (SCR-22, SCR-24, SCR-25)
  // ==============================================================================

  // SCR-22: アラート設定取得
  fastify.get('/api/v1/settings/alerts', async (request, reply) => {
    const user = currentUser(request);
    if (!user) return reply.status(401).send({ error: 'ログインが必要です' });
    return getAlertSettings(user.id);
  });

  // SCR-22: アラート設定保存
  fastify.post('/api/v1/settings/alerts', async (request, reply) => {
    const user = currentUser(request);
    if (!user) return reply.status(401).send({ error: 'ログインが必要です' });
    const body = request.body || {};
    return saveAlertSettings(user.id, body);
  });

  // SCR-22: Webhook テスト送信 (SCR-22)
  fastify.post('/api/v1/projects/:id/notify/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = currentUser(request);
    if (!user) return reply.status(401).send({ error: 'ログインが必要です' });
    if (!getProject(id, user.id)) return reply.status(404).send({ error: 'プロジェクトが見つかりません' });
    const body = (request.body || {}) as { webhookUrl?: string };
    const webhookUrl = body.webhookUrl || getAlertSettings(user.id).webhookUrl;

    if (!webhookUrl) {
      return reply.status(400).send({ error: 'Webhook URLが設定されていません' });
    }

    try {
      await assertPublicWebhook(webhookUrl);
      const payload = {
        text: `🚨 [SEO Analyzer] 監視アラートテスト通知 (プロジェクトID: ${id})\n本番スコア監視システムのテスト配信です。正常にWebhookを受信しました。`,
        project: id,
        timestamp: new Date().toISOString(),
      };
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      return { success: true, status: res.status, message: 'テスト通知を送信しました' };
    } catch (err: any) {
      return reply.status(500).send({ error: `Webhook送信失敗: ${err.message}` });
    }
  });

  // SCR-24: チームメンバー一覧
  fastify.get('/api/v1/team/members', async (request, reply) => {
    const user = currentUser(request);
    if (!user) return reply.status(401).send({ error: 'ログインが必要です' });
    return { members: listTeamMembers(user.id, user) };
  });

  // SCR-24: チームメンバー追加
  fastify.post('/api/v1/team/members', async (request, reply) => {
    const body = (request.body || {}) as { name?: string; email?: string; role?: any };
    const user = currentUser(request);
    if (!user) return reply.status(401).send({ error: 'ログインが必要です' });
    if (!body.name || !body.email) return reply.status(400).send({ error: 'name and email are required' });
    try {
      const member = addTeamMember(user.id, body.name, body.email, body.role || 'viewer', user);
      try {
        await sendTeamInvitationEmail(member.email, user.name);
      } catch (error) {
        removeTeamMember(user.id, member.id);
        throw error;
      }
      return member;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // SCR-24: チームメンバー削除
  fastify.delete('/api/v1/team/members/:id', async (request, reply) => {
    const user = currentUser(request);
    if (!user) return reply.status(401).send({ error: 'ログインが必要です' });
    const { id } = request.params as { id: string };
    const ok = removeTeamMember(user.id, id);
    return { success: ok };
  });

  // SCR-25: APIキー一覧
  fastify.get('/api/v1/settings/api-keys', async (request, reply) => {
    const user = currentUser(request);
    if (!user) return reply.status(401).send({ error: 'ログインが必要です' });
    return { keys: listApiKeys(user.id) };
  });

  // SCR-25: APIキー新規発行
  fastify.post('/api/v1/settings/api-keys', async (request, reply) => {
    const body = (request.body || {}) as { name?: string; scopes?: any };
    const user = currentUser(request);
    if (!user) return reply.status(401).send({ error: 'ログインが必要です' });
    if (!body.name) return reply.status(400).send({ error: 'name is required' });
    const key = createApiKey(user.id, body.name, body.scopes || ['read']);
    return key;
  });

  // SCR-25: APIキー失効
  fastify.delete('/api/v1/settings/api-keys/:id', async (request, reply) => {
    const user = currentUser(request);
    if (!user) return reply.status(401).send({ error: 'ログインが必要です' });
    const { id } = request.params as { id: string };
    const ok = revokeApiKey(user.id, id);
    return { success: ok };
  });

  // ==============================================================================
  // ユーザー認証 & セッション (SCR-28: メール/パスワード & Googleログイン)
  // ==============================================================================

  // メール＋パスワード新規登録
  fastify.post('/api/v1/auth/register', async (request, reply) => {
    const body = (request.body || {}) as { email?: string; password?: string; name?: string };
    if (!body.email || !body.password) {
      return reply.status(400).send({ error: 'メールアドレスとパスワードは必須です' });
    }
    try {
      const authRes = registerWithPassword({
        email: body.email,
        password: body.password,
        name: body.name,
      });
      if (authRes.verificationCode) {
        try {
          await sendVerificationEmail(authRes.user.email, authRes.verificationCode);
        } catch (error) {
          rollbackRegistration(authRes.user.id, authRes.token);
          throw error;
        }
      }
      const { verificationCode: _verificationCode, ...publicAuthRes } = authRes;
      return reply
        .header('Set-Cookie', `seo_auth_token=${encodeURIComponent(authRes.token)}; Path=/; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=${30 * 24 * 3600}`)
        .send(publicAuthRes);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // メール＋パスワードログイン
  fastify.post('/api/v1/auth/login', async (request, reply) => {
    const body = (request.body || {}) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return reply.status(400).send({ error: 'メールアドレスとパスワードを入力してください' });
    }
    try {
      const authRes = loginWithPassword({
        email: body.email,
        password: body.password,
      });
      return reply
        .header('Set-Cookie', `seo_auth_token=${encodeURIComponent(authRes.token)}; Path=/; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=${30 * 24 * 3600}`)
        .send(authRes);
    } catch (err: any) {
      return reply.status(401).send({ error: err.message });
    }
  });

  // Googleログイン認証URL発行
  fastify.get('/api/v1/auth/google/url', async (_request, reply) => {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://seo.n-n.tokyo/api/v1/integrations/google/callback';
    const { url: authUrl, state } = createOAuthAuthUrl(redirectUri, 'login');
    return reply
      .header('Set-Cookie', `google_oauth_state=${encodeURIComponent(state)}; Path=/api/v1/integrations/google/callback; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=600`)
      .send({ authUrl });
  });

  // Googleログイン コールバック検証
  fastify.post('/api/v1/auth/google/callback', async (_request, reply) => {
    return reply.status(410).send({ error: 'Google OAuthコールバックは共通の安全なエンドポイントへ移行しました' });
  });

  // ログイン中ユーザー情報照会
  fastify.get('/api/v1/auth/me', async (request, reply) => {
    const user = currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: '未ログインまたはセッションが有効期限切れです' });
    }
    return { user };
  });

  // プロファイル（表示名）更新
  fastify.put('/api/v1/auth/profile', async (request, reply) => {
    const user = currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'ログインが必要です' });
    }

    const body = (request.body || {}) as { name?: string };
    if (!body.name || !body.name.trim()) {
      return reply.status(400).send({ error: '名前を入力してください' });
    }

    try {
      const updatedUser = updateUserProfile(user.id, { name: body.name.trim() });
      return { success: true, user: updatedUser };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // パスワード変更
  fastify.put('/api/v1/auth/password', async (request, reply) => {
    const user = currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'ログインが必要です' });
    }

    const body = (request.body || {}) as { currentPassword?: string; newPassword?: string };
    if (!body.currentPassword || !body.newPassword) {
      return reply.status(400).send({ error: '現在のパスワードと新しいパスワードを入力してください' });
    }

    try {
      changeUserPassword(user.id, body.currentPassword, body.newPassword);
      return { success: true, message: 'パスワードを変更しました' };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // メールアドレス変更 (SCR-29)
  fastify.put('/api/v1/auth/email', async (request, reply) => {
    const user = currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'ログインが必要です' });
    }

    const body = (request.body || {}) as { newEmail?: string };
    if (!body.newEmail || !body.newEmail.trim()) {
      return reply.status(400).send({ error: '新しいメールアドレスを入力してください' });
    }

    try {
      const result = changeUserEmail(user.id, body.newEmail.trim());
      try {
        await sendVerificationEmail(result.user.email, result.verificationCode);
      } catch (error) {
        restoreUserEmail(user.id, user.email, Boolean(user.emailVerified));
        throw error;
      }
      return {
        success: true,
        message: '確認コードを送信しました。認証を完了してください。',
      };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // メール認証コード検証 (SCR-29)
  fastify.post('/api/v1/auth/verify-email', async (request, reply) => {
    const user = currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'ログインが必要です' });
    }

    const body = (request.body || {}) as { code?: string };
    if (!body.code) {
      return reply.status(400).send({ error: '認証コードを入力してください' });
    }

    try {
      const updatedUser = verifyEmailCode(user.id, body.code.trim());
      return { success: true, message: 'メールアドレスが認証されました', user: updatedUser };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // メール認証コード再送信 (SCR-29)
  fastify.post('/api/v1/auth/resend-verification', async (request, reply) => {
    const user = currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'ログインが必要です' });
    }

    try {
      const result = resendVerificationCode(user.id);
      await sendVerificationEmail(user.email, result.verificationCode);
      return {
        success: true,
        message: '認証コードを再送信しました',
      };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // ログアウト
  fastify.post('/api/v1/auth/logout', async (request, reply) => {
    logoutSession(authToken(request));
    return reply
      .header('Set-Cookie', `seo_auth_token=; Path=/; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=0`)
      .send({ success: true });
  });

  // ==============================================================================
  // プラットフォーム管理者向けAPI (SCR-30: Role === 'ADMIN' 必須)
  // ==============================================================================

  // プラットフォーム統計情報取得
  fastify.get('/api/v1/admin/stats', async (request, reply) => {
    const user = currentUser(request);
    if (!user || user.role !== 'ADMIN') {
      return reply.status(403).send({ error: '管理者権限(ADMIN)が必要です' });
    }

    const users = listAllUsers();
    const verifiedUsers = users.filter((u) => u.emailVerified).length;
    const allProjects = listAllProjectsAdmin().map(publicProject);

    // 診断キャッシュ/ディスクから全診断数をカウント
    let totalAudits = auditCache.size;
    try {
      if (fs.existsSync(baseDataDir)) {
        const files = fs.readdirSync(baseDataDir).filter((f) => f.endsWith('.json') && !f.startsWith('project_') && !f.startsWith('users') && !f.startsWith('sessions'));
        totalAudits = Math.max(totalAudits, files.length);
      }
    } catch {
      // ignore
    }

    return {
      totalUsers: users.length,
      verifiedUsers,
      unverifiedUsers: users.length - verifiedUsers,
      totalProjects: allProjects.length,
      totalAudits,
      uptimeSeconds: Math.floor(process.uptime()),
    };
  });

  // プラットフォーム全ユーザー一覧取得
  fastify.get('/api/v1/admin/users', async (request, reply) => {
    const user = currentUser(request);
    if (!user || user.role !== 'ADMIN') {
      return reply.status(403).send({ error: '管理者権限(ADMIN)が必要です' });
    }

    const users = listAllUsers();
    const adminUserRecords = users.map((u) => ({
      ...u,
      projectCount: countUserProjects(u.id),
    }));

    return { users: adminUserRecords };
  });

  // ユーザー権限変更 (ADMIN / MEMBER)
  fastify.put('/api/v1/admin/users/:id/role', async (request, reply) => {
    const user = currentUser(request);
    if (!user || user.role !== 'ADMIN') {
      return reply.status(403).send({ error: '管理者権限(ADMIN)が必要です' });
    }

    const { id } = request.params as { id: string };
    const body = (request.body || {}) as { role?: 'ADMIN' | 'MEMBER' };
    if (!body.role || (body.role !== 'ADMIN' && body.role !== 'MEMBER')) {
      return reply.status(400).send({ error: '有効な権限(ADMINまたはMEMBER)を指定してください' });
    }

    try {
      const updated = updateUserRole(id, body.role);
      return { success: true, user: updated };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // プラットフォーム全プロジェクト一覧取得
  fastify.get('/api/v1/admin/projects', async (request, reply) => {
    const user = currentUser(request);
    if (!user || user.role !== 'ADMIN') {
      return reply.status(403).send({ error: '管理者権限(ADMIN)が必要です' });
    }

    const projects = listAllProjectsAdmin().map(publicProject);
    return { projects };
  });

  let alertMonitorRunning = false;
  const runAlertMonitor = async () => {
    if (alertMonitorRunning) return;
    alertMonitorRunning = true;
    try {
      for (const ownerId of listEnabledAlertOwners()) {
        const settings = getAlertSettings(ownerId);
        for (const project of listProjects(ownerId)) {
          try {
            const startedAt = Date.now();
            const response = await safeFetchUrl(project.rootUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerMonitor/1.0; +https://seo.n-n.tokyo/bot)' },
              signal: AbortSignal.timeout(12_000),
            });
            const result = analyzeHtml(project.rootUrl, await response.text(), Date.now() - startedAt, response.status);
            const shouldNotify = result.overallScore < settings.scoreThreshold &&
              (project.auditCount === 0 || project.lastScore >= settings.scoreThreshold);
            recordAuditToProject(project.id, result);
            if (!shouldNotify) continue;
            if (settings.webhookUrl) {
              await assertPublicWebhook(settings.webhookUrl);
              await fetch(settings.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: `[SEO Analyzer] ${project.name}: ${result.overallScore}/100\n${project.rootUrl}`, projectId: project.id, score: result.overallScore }),
                signal: AbortSignal.timeout(5_000),
              });
            }
            if (settings.emailNotifications && settings.notificationEmail) {
              await sendAlertEmail(settings.notificationEmail, project.name, result.overallScore, project.rootUrl);
            }
          } catch (error) {
            fastify.log.warn({ error, projectId: project.id }, 'Alert monitor check failed');
          }
        }
      }
    } finally {
      alertMonitorRunning = false;
    }
  };
  const alertTimer = setInterval(runAlertMonitor, Number(process.env.ALERT_MONITOR_INTERVAL_MS || 15 * 60 * 1000));
  alertTimer.unref();

  const port = Number(process.env.BACKEND_PORT || (process.env.PORT && process.env.PORT !== '5600' ? process.env.PORT : 5601));
  const host = process.env.HOST || '127.0.0.1';

  try {
    await fastify.listen({ port, host });
    console.log(`Backend server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
