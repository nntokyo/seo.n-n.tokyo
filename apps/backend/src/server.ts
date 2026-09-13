import Fastify from 'fastify';
import cors from '@fastify/cors';
import { analyzeHtml } from './analyzer.js';
import { checkSitemap } from './sitemap.js';
import {
  createOAuthAuthUrl,
  exchangeOAuthCode,
  getSessionStatus,
  deleteSession,
  getGoogleHubData,
} from './google.js';
import {
  startCrawlSession,
  getCrawlSession,
  getCrawlGraphData,
  getCrawlBrokenData,
  getCrawlTreeData,
  addProgressListener,
  removeProgressListener,
} from './crawler.js';
import {
  listProjects,
  getProject,
  createProject,
  recordAuditToProject,
  getProjectHistory,
  calculateAuditDiff,
} from './projects.js';

import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const fastify = Fastify({
    logger: true,
  });

  await fastify.register(cors, {
    origin: true,
  });

  // 永続化ディレクトリ設定 (.data/audits)
  const baseDataDir = process.env.DATA_DIR || path.resolve(process.cwd(), '.data', 'audits');
  try {
    fs.mkdirSync(baseDataDir, { recursive: true });
  } catch {}

  // インメモリ診断結果キャッシュ (直近500件)
  const auditCache = new Map<string, any>();

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
        fetch(targetUrl, {
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

      const result = analyzeHtml(targetUrl, html, responseTimeMs, httpStatus, undefined, sitemapOutcome);

      // メモリ & ディスクに永続保存
      auditCache.set(result.id, result);
      try {
        fs.writeFileSync(path.join(baseDataDir, `${result.id}.json`), JSON.stringify(result), 'utf8');
      } catch {}

      // プロジェクト自動記録 (同一ドメインのプロジェクトがある、または自動生成)
      try {
        const proj = createProject(new URL(targetUrl).hostname, targetUrl);
        recordAuditToProject(proj.id, result);
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
          fetch(targetUrl, {
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
        const result = analyzeHtml(targetUrl, html, responseTimeMs, response.status, undefined, sitemapOutcome);
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
      const response = await fetch(targetUrl, {
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
      const response = await fetch(siteUrl, {
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
      const url = createOAuthAuthUrl(redirectUri);
      return { url };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to generate OAuth URL', message: err.message });
    }
  });

  // 2. Google OAuth2 コールバック処理
  fastify.get('/api/v1/integrations/google/callback', async (request, reply) => {
    const query = request.query as { code?: string; error?: string };
    if (query.error) {
      return reply.redirect(`/google/hub?error=${encodeURIComponent(query.error)}`);
    }
    if (!query.code) {
      return reply.redirect('/google/hub?error=missing_code');
    }

    try {
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://seo.n-n.tokyo/api/v1/integrations/google/callback';
      const session = await exchangeOAuthCode(query.code, redirectUri);
      // セッションIDをクエリとCookieに載せて /google/hub にリダイレクト
      return reply
        .header('Set-Cookie', `google_session_id=${session.sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`)
        .redirect(`/google/hub?session_id=${session.sessionId}`);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.redirect(`/google/hub?error=${encodeURIComponent(err.message || 'auth_failed')}`);
    }
  });

  // 3. 現在のブラウザのGoogle連携ステータス照会
  fastify.get('/api/v1/integrations/google/session', async (request, reply) => {
    const query = request.query as { session_id?: string };
    const cookieHeader = request.headers.cookie || '';
    const cookieMatch = cookieHeader.match(/google_session_id=([^;]+)/);
    const sessionId = (request.headers['x-google-session'] as string) || query.session_id || (cookieMatch ? cookieMatch[1] : undefined);

    const status = getSessionStatus(sessionId);
    return status;
  });

  // 4. 現在のブラウザのGoogle連携解除
  fastify.post('/api/v1/integrations/google/disconnect', async (request, reply) => {
    const body = (request.body || {}) as { session_id?: string };
    const cookieHeader = request.headers.cookie || '';
    const cookieMatch = cookieHeader.match(/google_session_id=([^;]+)/);
    const sessionId = (request.headers['x-google-session'] as string) || body.session_id || (cookieMatch ? cookieMatch[1] : undefined);

    if (sessionId) {
      deleteSession(sessionId);
    }

    return reply
      .header('Set-Cookie', `google_session_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
      .send({ success: true, message: 'Google連携を解除しました' });
  });

  // 5. Google統合ハブデータ取得 (PSI + GSC + GA4 + Gemini)
  fastify.post('/api/v1/google/hub-data', async (request, reply) => {
    const body = request.body as { url?: string; session_id?: string };
    let targetUrl = (body?.url || 'https://seo.n-n.tokyo').trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    const cookieHeader = request.headers.cookie || '';
    const cookieMatch = cookieHeader.match(/google_session_id=([^;]+)/);
    const sessionId = (request.headers['x-google-session'] as string) || body?.session_id || (cookieMatch ? cookieMatch[1] : undefined);

    try {
      const hubData = await getGoogleHubData(sessionId, targetUrl);
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

  // ==============================================================================
  // プロジェクト管理 & 履歴推移 (SCR-15 〜 SCR-17)
  // ==============================================================================

  // プロジェクト一覧 (SCR-15)
  fastify.get('/api/v1/projects', async () => {
    return { projects: listProjects() };
  });

  // プロジェクト作成 (SCR-15)
  fastify.post('/api/v1/projects', async (request, reply) => {
    const body = (request.body || {}) as { name?: string; url?: string };
    if (!body.url) return reply.status(400).send({ error: 'url is required' });
    const p = createProject(body.name || '', body.url);
    return p;
  });

  // プロジェクト詳細 & 履歴 (SCR-16)
  fastify.get('/api/v1/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = getProject(id);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    const history = getProjectHistory(id);
    return { project, history };
  });

  // Time-Travel 履歴差分比較 (SCR-17)
  fastify.get('/api/v1/projects/:id/diff', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { baseId?: string; compareId?: string };
    const project = getProject(id);
    if (!project) return reply.status(404).send({ error: 'Project not found' });

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
