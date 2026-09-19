import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { decryptSecret, encryptSecret, safeEqual } from './security.js';
import { safeFetchUrl } from './url-security.js';
import { validateGeminiProposalWithJev } from './jev.js';
import {
  GoogleSessionStatus,
  PsiCruxData,
  GscAnalyticsData,
  Ga4MetricsData,
  GeminiProposalData,
  GoogleHubDataResponse,
  WebRiskData,
} from '@seo/shared';

// ブラウザー分離セッション管理用ストア
export interface GoogleSessionRecord {
  sessionId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // unix ms
  email?: string;
  name?: string;
  picture?: string;
  scopes: string[];
  connectedAt: string;
  googleId?: string;
}

const sessionStore = new Map<string, GoogleSessionRecord>();

// セッション永続化ディレクトリ (.data/google-sessions)
const sessionDir = path.resolve(process.cwd(), '.data', 'google-sessions');
try {
  fs.mkdirSync(sessionDir, { recursive: true });
  if (fs.existsSync(sessionDir)) {
    const files = fs.readdirSync(sessionDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        try {
          const raw = fs.readFileSync(path.join(sessionDir, f), 'utf8');
          const rec: GoogleSessionRecord = JSON.parse(decryptSecret(raw) || raw);
          // 期限切れ7日以上でなければ復元
          if (rec.expiresAt > Date.now() - 7 * 24 * 3600 * 1000) {
            sessionStore.set(rec.sessionId, rec);
          }
        } catch {}
      }
    }
  }
} catch {}

function saveSession(rec: GoogleSessionRecord) {
  sessionStore.set(rec.sessionId, rec);
  try {
    fs.writeFileSync(path.join(sessionDir, `${rec.sessionId}.json`), encryptSecret(JSON.stringify(rec)), { encoding: 'utf8', mode: 0o600 });
  } catch (error) {
    sessionStore.delete(rec.sessionId);
    throw error;
  }
}

// 既存の平文OAuthセッションも起動時に暗号化形式へ移行する。
for (const session of sessionStore.values()) saveSession(session);

export function deleteSession(sessionId: string) {
  sessionStore.delete(sessionId);
  try {
    const p = path.join(sessionDir, `${sessionId}.json`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {}
}

export function getSession(sessionId?: string): GoogleSessionRecord | null {
  if (!sessionId) return null;
  const rec = sessionStore.get(sessionId);
  if (!rec) return null;
  return rec;
}

export function getSessionStatus(sessionId?: string): GoogleSessionStatus {
  const rec = getSession(sessionId);
  if (!rec) {
    return { isConnected: false };
  }
  return {
    isConnected: true,
    userEmail: rec.email,
    userName: rec.name,
    userPicture: rec.picture,
    connectedAt: rec.connectedAt,
    scopes: rec.scopes,
  };
}

type OAuthPurpose = 'integration' | 'login';
const oauthStates = new Map<string, { purpose: OAuthPurpose; expiresAt: number }>();

// OAuth2 認証開始URL生成。stateは短時間だけ保持し、コールバックで一度だけ消費する。
export function createOAuthAuthUrl(redirectUri: string, purpose: OAuthPurpose = 'integration'): { url: string; state: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID が設定されていません');
  }

  const scopes = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];
  if (purpose === 'integration') {
    scopes.push(
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/indexing'
    );
  }

  const state = crypto.randomBytes(32).toString('base64url');
  oauthStates.set(state, { purpose, expiresAt: Date.now() + 10 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, state };
}

export function consumeOAuthState(state?: string, cookieState?: string): OAuthPurpose | null {
  if (!safeEqual(state, cookieState)) return null;
  const record = state ? oauthStates.get(state) : undefined;
  if (!record || record.expiresAt < Date.now()) return null;
  oauthStates.delete(state!);
  return record.purpose;
}

// OAuth2 認可コード交換 & セッション発行
export async function exchangeOAuthCode(code: string, redirectUri: string): Promise<GoogleSessionRecord> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID または GOOGLE_CLIENT_SECRET が未設定です');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const errData = await tokenRes.json().catch(() => ({}));
    throw new Error(`Googleトークン交換失敗: ${errData.error_description || tokenRes.statusText}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in || 3600;

  // ユーザープロファイル照会 (email, name)
  let email: string | undefined;
  let name: string | undefined;
  let picture: string | undefined;
  let googleId: string | undefined;
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userRes.ok) {
      const user = await userRes.json();
      email = user.email;
      name = user.name;
      picture = user.picture;
      googleId = user.id;
    }
  } catch {}

  const sessionId = crypto.randomUUID();
  const sessionRecord: GoogleSessionRecord = {
    sessionId,
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    email,
    name,
    picture,
    scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
    connectedAt: new Date().toISOString(),
    googleId,
  };

  saveSession(sessionRecord);
  return sessionRecord;
}

// トークン自動リフレッシュ
async function getFreshAccessToken(session: GoogleSessionRecord): Promise<string> {
  if (session.expiresAt > Date.now() + 60 * 1000) {
    return session.accessToken;
  }

  if (!session.refreshToken) {
    return session.accessToken;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return session.accessToken;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: session.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      session.accessToken = data.access_token;
      session.expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      saveSession(session);
      return session.accessToken;
    }
  } catch {}

  return session.accessToken;
}

// PageSpeed キャッシュ (URL単位・1時間有効)
interface PsiCacheEntry {
  data: PsiCruxData;
  cachedAt: number;
}
const psiMemoryCache = new Map<string, PsiCacheEntry>();
const psiInFlight = new Map<string, Promise<PsiCruxData>>();
const PSI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const psiCacheDir = path.resolve(process.cwd(), '.data', 'google-cache');

function psiCachePath(targetUrl: string): string {
  const key = crypto.createHash('sha256').update(targetUrl).digest('hex');
  return path.join(psiCacheDir, `psi-${key}.json`);
}

function readPsiCache(targetUrl: string): PsiCacheEntry | null {
  const memory = psiMemoryCache.get(targetUrl);
  if (memory) return memory;
  try {
    const parsed = JSON.parse(fs.readFileSync(psiCachePath(targetUrl), 'utf8')) as PsiCacheEntry;
    if (!parsed?.data || !Number.isFinite(parsed.cachedAt)) return null;
    psiMemoryCache.set(targetUrl, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writePsiCache(targetUrl: string, entry: PsiCacheEntry): void {
  psiMemoryCache.set(targetUrl, entry);
  try {
    fs.mkdirSync(psiCacheDir, { recursive: true });
    const destination = psiCachePath(targetUrl);
    const temporary = `${destination}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(entry), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, destination);
  } catch {}
}

function metric(value: number | undefined, label: string, unit: string, good: number, poor: number): PsiCruxData['lcp'] {
  if (value === undefined || !Number.isFinite(value)) {
    return { value: '未取得', unit, status: 'unknown', label };
  }
  return {
    value,
    unit,
    status: value <= good ? 'good' : value <= poor ? 'needs_improvement' : 'poor',
    label,
  };
}

async function fetchCruxMetrics(targetUrl: string, apiKey?: string) {
  if (!apiKey) return null;
  const res = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: targetUrl, formFactor: 'PHONE' }),
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(`CrUX APIエラー (${res.status}): ${json.error?.message || res.statusText}`);
  }
  const json = await res.json();
  const metrics = json.record?.metrics || {};
  const p75 = (name: string): number | undefined => {
    const value = Number(metrics[name]?.percentiles?.p75);
    return Number.isFinite(value) ? value : undefined;
  };
  return {
    fcp: p75('first_contentful_paint'),
    lcp: p75('largest_contentful_paint'),
    cls: p75('cumulative_layout_shift'),
    inp: p75('interaction_to_next_paint'),
    ttfb: p75('experimental_time_to_first_byte'),
  };
}

// 1. PageSpeed Insights API (PSI v5)
export async function fetchPsiData(
  targetUrl: string,
  customApiKey?: string,
  allowSystemApiKey?: boolean
): Promise<PsiCruxData> {
  const normUrl = targetUrl.trim();
  const cached = readPsiCache(normUrl);
  if (cached && Date.now() - cached.cachedAt < PSI_CACHE_TTL_MS) {
    return cached.data;
  }

  const running = psiInFlight.get(normUrl);
  if (running) return running;

  const request = fetchPsiDataUncached(normUrl, customApiKey, allowSystemApiKey, cached);
  psiInFlight.set(normUrl, request);
  try {
    return await request;
  } finally {
    psiInFlight.delete(normUrl);
  }
}

async function fetchPsiDataUncached(
  normUrl: string,
  customApiKey?: string,
  allowSystemApiKey?: boolean,
  staleCache?: PsiCacheEntry | null
): Promise<PsiCruxData> {

  // スーパー管理者のみ環境変数のシステムキーを使用可能。一般ユーザーはプロジェクト独自キーが必要
  const apiKey = customApiKey || (allowSystemApiKey ? (process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_API_KEY) : undefined);
  if (!apiKey) {
    throw new Error('PageSpeed APIキーが利用できません。ログイン後にプロジェクト専用キーを設定してください');
  }
  const urlParams = new URLSearchParams({
    url: normUrl,
    strategy: 'mobile',
    category: 'performance',
  });
  if (apiKey) urlParams.set('key', apiKey);

  const endpoint = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${urlParams.toString()}`;

  // 最大2回試行 (タイムアウトは28秒)
  let lastError: any = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(28000) });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const error = new Error(`PageSpeed APIエラー (${res.status}): ${errJson.error?.message || '診断に失敗しました'}`) as Error & { status?: number };
        error.status = res.status;
        throw error;
      }

      const data = await res.json();
      const lighthouse = data.lighthouseResult;
      const perfScore = Math.round((lighthouse?.categories?.performance?.score || 0) * 100);

      const audits = lighthouse?.audits || {};
      const fcpMs = Math.round(audits['first-contentful-paint']?.numericValue || 0);
      const lcpMs = Math.round(audits['largest-contentful-paint']?.numericValue || 0);
      const clsRaw = audits['cumulative-layout-shift']?.numericValue;
      const clsVal = typeof clsRaw === 'number' ? Number(clsRaw.toFixed(3)) : undefined;
      const ttfbMs = Math.round(audits['server-response-time']?.numericValue || 0);
      const inpMs = Math.round(audits['interaction-to-next-paint']?.numericValue || 0);
      const crux = await fetchCruxMetrics(normUrl, apiKey).catch(() => null);

      // 改善機会 (Opportunities)
      const opps = [
        'render-blocking-resources',
        'unused-javascript',
        'unused-css-rules',
        'modern-image-formats',
        'offscreen-images',
        'unminified-javascript',
      ];

      const opportunities = opps
        .map((id) => audits[id])
        .filter((a) => a && a.score !== null && a.score < 0.9)
        .map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description?.split('[')[0] || a.title,
          savingsBytes: a.details?.overallSavingsBytes,
          savingsMs: a.details?.overallSavingsMs,
        }));

      const psiResult: PsiCruxData = {
        performanceScore: perfScore,
        accessibilityScore: lighthouse?.categories?.accessibility ? Math.round(lighthouse.categories.accessibility.score * 100) : undefined,
        seoScore: lighthouse?.categories?.seo ? Math.round(lighthouse.categories.seo.score * 100) : undefined,
        fcp: metric(crux?.fcp ?? (fcpMs || undefined), 'FCP (First Contentful Paint)', 'ms', 1800, 3000),
        lcp: metric(crux?.lcp ?? (lcpMs || undefined), 'LCP (Largest Contentful Paint)', 'ms', 2500, 4000),
        cls: metric(crux?.cls ?? clsVal, 'CLS (Cumulative Layout Shift)', '', 0.1, 0.25),
        inp: metric(crux?.inp ?? (inpMs || undefined), 'INP (Interaction to Next Paint)', 'ms', 200, 500),
        ttfb: metric(crux?.ttfb ?? (ttfbMs || undefined), 'TTFB (Time to First Byte)', 'ms', 800, 1800),
        opportunities,
        testedUrl: normUrl,
        strategy: 'mobile',
        fetchedAt: new Date().toISOString(),
      };

      writePsiCache(normUrl, { data: psiResult, cachedAt: Date.now() });
      return psiResult;
    } catch (err: any) {
      lastError = err;
      if (err?.status === 429 && staleCache) {
        return staleCache.data;
      }
      const retryable = !err?.status || err.status >= 500;
      if (attempt === 1 && retryable) {
        // 短い待機後に再試行
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        break;
      }
    }
  }

  throw lastError || new Error('PageSpeed API診断タイムアウト (Googleサーバーの応答が遅延しています)');
}

// 2. Google Search Console API (Analytics & Inspection)
export async function fetchGscData(session: GoogleSessionRecord, targetUrl: string, requestedSiteUrl?: string): Promise<GscAnalyticsData> {
  const token = await getFreshAccessToken(session);
  const parsed = new URL(targetUrl);
  const origin = parsed.origin;
  const siteUrlCandidates = Array.from(new Set([
    ...(requestedSiteUrl ? [requestedSiteUrl] : []),
    origin + '/',
    origin,
    `sc-domain:${parsed.hostname}`,
  ]));

  // 日付範囲 (直近28日間)
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 28);
  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];

  let aggregateData: any = null;
  let queryData: any = null;
  let pageData: any = null;
  let matchedSiteUrl = siteUrlCandidates[0];

  // ユーザーが権限を持つプロパティを照合
  for (const candidate of siteUrlCandidates) {
    try {
      const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(candidate)}/searchAnalytics/query`;
      const requestReport = async (dimensions: string[], rowLimit = 10) => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate, dimensions, rowLimit, dataState: 'final' }),
        });
        if (!res.ok) throw new Error(`GSC ${res.status}`);
        return res.json();
      };
      const reports = await Promise.all([
        requestReport([], 1),
        requestReport(['query'], 10),
        requestReport(['page'], 10),
      ]);
      if (reports[0]) {
        [aggregateData, queryData, pageData] = reports;
        matchedSiteUrl = candidate;
        break;
      }
    } catch {}
  }

  if (!aggregateData) {
    throw new Error(`Google Search Consoleでサイト「${origin}」の権限が確認できませんでした`);
  }

  const topQueries = (queryData?.rows || []).map((r: any) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: Number((r.ctr * 100).toFixed(2)),
    position: Number(r.position.toFixed(1)),
  }));

  const aggregate = aggregateData.rows?.[0] || {};
  const totalClicks = Number(aggregate.clicks || 0);
  const totalImpressions = Number(aggregate.impressions || 0);
  const averageCtr = Number((Number(aggregate.ctr || 0) * 100).toFixed(2));
  const averagePosition = Number(Number(aggregate.position || 0).toFixed(1));
  const topPages = (pageData?.rows || []).map((r: any) => ({
    page: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: Number((r.ctr * 100).toFixed(2)),
    position: Number(r.position.toFixed(1)),
  }));

  // URL Inspection 試行
  let indexStatus: GscAnalyticsData['indexStatus'] = undefined;
  try {
    const inspectRes = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inspectionUrl: targetUrl,
        siteUrl: matchedSiteUrl,
      }),
    });
    if (inspectRes.ok) {
      const inspectJson = await inspectRes.json();
      const statusRes = inspectJson.inspectionResult?.indexStatusResult;
      if (statusRes) {
        indexStatus = {
          verdict: statusRes.verdict === 'PASS' ? 'PASS' : statusRes.verdict === 'FAIL' ? 'FAIL' : 'NEUTRAL',
          coverageState: statusRes.coverageState || 'Submitted and indexed',
          robotsTxtState: statusRes.robotsTxtState === 'DISALLOWED' ? 'DISALLOWED' : 'ALLOWED',
          indexingState: statusRes.indexingState || 'INDEXING_ALLOWED',
          lastCrawlTime: statusRes.lastCrawlTime,
        };
      }
    }
  } catch {}

  return {
    siteUrl: matchedSiteUrl,
    totalClicks,
    totalImpressions,
    averageCtr,
    averagePosition,
    topQueries,
    topPages,
    indexStatus,
    startDate,
    endDate,
  };
}

// 3. Google Analytics 4 (GA4 Data API)
export async function fetchGa4Data(session: GoogleSessionRecord, requestedPropertyId?: string): Promise<Ga4MetricsData> {
  const token = await getFreshAccessToken(session);
  let propertyId: string | null = requestedPropertyId?.replace(/^properties\//, '') || null;
  let propertyName = 'Google Analytics 4 Property';

  // プロジェクトでIDが未指定の場合だけAdmin APIから候補を探索する。
  if (!propertyId) {
    const accountsRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!accountsRes.ok) {
      const errJson = await accountsRes.json().catch(() => ({}));
      throw new Error(`GA4プロパティIDが未設定で、一覧も取得できませんでした (${accountsRes.status}): ${errJson.error?.message || 'Google Analytics Admin APIを有効にしてください'}`);
    }
    const accountsJson = await accountsRes.json();
    for (const acc of accountsJson.accountSummaries || []) {
      if (acc.propertySummaries?.length) {
        const p = acc.propertySummaries[0];
        propertyId = p.property.replace('properties/', '');
        propertyName = p.displayName || propertyName;
        break;
      }
    }
  }

  if (!propertyId) {
    throw new Error('利用可能なGoogle Analytics 4プロパティが見つかりませんでした');
  }

  // runReport 呼び出し
  const reportRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'bounceRate' },
        { name: 'userEngagementDuration' },
      ],
    }),
  });

  if (!reportRes.ok) {
    const err = await reportRes.json().catch(() => ({}));
    throw new Error(`GA4レポート取得失敗: ${err.error?.message || reportRes.statusText}`);
  }

  const reportJson = await reportRes.json();
  const row = reportJson.rows?.[0]?.metricValues || [];

  const activeUsers = Number(row[0]?.value || 0);
  const sessions = Number(row[1]?.value || 0);
  const screenPageViews = Number(row[2]?.value || 0);
  const engagementRate = Number((Number(row[3]?.value || 0) * 100).toFixed(1));
  const bounceRate = Number((Number(row[4]?.value || 0) * 100).toFixed(1));
  const totalDurationSec = Number(row[5]?.value || 0);
  const averageSessionDurationSec = sessions > 0 ? Math.round(totalDurationSec / sessions) : 0;

  return {
    propertyId,
    propertyName,
    activeUsers,
    sessions,
    screenPageViews,
    engagementRate,
    bounceRate,
    averageSessionDurationSec,
    period: '直近28日間',
  };
}

// 4. Google Gemini API (公式実測データに基づく修正案生成)
export async function generateGeminiProposals(
  targetUrl: string,
  psi: PsiCruxData | null,
  gsc: GscAnalyticsData | null,
  customGeminiKey?: string,
  isSuperAdmin?: boolean
): Promise<GeminiProposalData> {
  // スーパー管理者のみ環境変数のシステムキーを使用可能。一般ユーザーはプロジェクト独自キーが必要
  const apiKey = customGeminiKey || (isSuperAdmin ? process.env.GEMINI_API_KEY : undefined);
  const parsed = new URL(targetUrl);
  if (!apiKey) {
    throw new Error('Gemini APIキーが設定されていないため改善案を生成できません');
  }

  const contextData = {
    targetUrl,
    domain: parsed.hostname,
    psiPerfScore: psi ? psi.performanceScore : '未取得',
    lcpMs: psi?.lcp.value || '未取得',
    cls: psi?.cls.value || '未取得',
    totalClicks: gsc?.totalClicks ?? '未取得',
    topQueries: gsc?.topQueries.map((q) => q.query).slice(0, 5) || [],
  };

  try {
      const prompt = `あなたはWebパフォーマンスとGoogle SEO/AEOの最高技術顧問です。
以下のGoogle公式診断データを元に、検索順位とCore Web Vitalsを改善するための具体的アクション案とタイトル改善案を日本語JSON形式で作成してください。

診断データ:
${JSON.stringify(contextData, null, 2)}

回答は必ず以下のJSONスキーマ形式のみで出力してください（Markdownの\`\`\`jsonブロック等も可）：
{
  "summary": "総合評価の概要（120文字程度）",
  "strengths": ["優れている点1", "優れている点2"],
  "actionItems": [
    {
      "title": "改善アクション名",
      "priority": "high",
      "impact": "改善による効果",
      "suggestion": "具体的な実装アドバイス",
      "codeSnippet": "推奨Next.jsまたはHTMLコード（任意）"
    }
  ],
  "titleProposals": [
    "改善タイトル案1（30文字前後）",
    "改善タイトル案2",
    "改善タイトル案3"
  ],
  "metaDescriptionProposal": "推奨メタディスクリプション（100文字前後）"
}`;

      const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1200,
          },
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(`Gemini APIエラー (${res.status}): ${errorJson.error?.message || res.statusText}`);
      }
      const geminiJson = await res.json();
      const text = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini APIから回答本文を取得できませんでした');
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedProposal = JSON.parse(cleanJson);
      const proposal: GeminiProposalData = {
        summary: parsedProposal.summary || `${parsed.hostname} のGoogle公式データ分析に基づく改善案です。`,
        strengths: parsedProposal.strengths || ['高速なサーバー初期応答 (TTFB)', 'モバイルフレンドリー設計'],
        actionItems: parsedProposal.actionItems || [],
        titleProposals: parsedProposal.titleProposals || [],
        metaDescriptionProposal: parsedProposal.metaDescriptionProposal,
        generatedAt: new Date().toISOString(),
      };

      proposal.jevValidation = await validateGeminiProposalWithJev(contextData, proposal);
      return proposal;
  } catch (error: any) {
    throw new Error(error?.message || 'Gemini改善案の生成に失敗しました');
  }
}

async function fetchWebRiskData(targetUrl: string, apiKey?: string): Promise<WebRiskData> {
  if (!apiKey) throw new Error('GOOGLE_WEB_RISK_API_KEY が設定されていません');
  const params = new URLSearchParams({ uri: targetUrl, key: apiKey });
  params.append('threatTypes', 'MALWARE');
  params.append('threatTypes', 'SOCIAL_ENGINEERING');
  const res = await fetch(`https://webrisk.googleapis.com/v1/uris:search?${params}`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(`Web Risk APIエラー (${res.status}): ${json.error?.message || res.statusText}`);
  }
  const json = await res.json();
  return {
    isThreat: Boolean(json.threat),
    threatTypes: json.threat?.threatTypes || [],
    expireTime: json.threat?.expireTime,
    checkedAt: new Date().toISOString(),
  };
}

// 5. 統合データ集約メイン関数
export async function getGoogleHubData(
  sessionId: string | undefined,
  targetUrl: string,
  options?: {
    customGoogleApiKey?: string;
    customGeminiKey?: string;
    gscSiteUrl?: string;
    ga4PropertyId?: string;
    isSuperAdmin?: boolean;
    allowSystemApiKey?: boolean;
  }
): Promise<GoogleHubDataResponse> {
  const session = getSession(sessionId);
  const sessionStatus = getSessionStatus(sessionId);
  const errors: GoogleHubDataResponse['errors'] = {};

  // 並列実行 (PSI, GSC, GA4, Gemini)
  const [psiResult, gscResult, ga4Result, webRiskResult] = await Promise.allSettled([
    fetchPsiData(targetUrl, options?.customGoogleApiKey, options?.isSuperAdmin || options?.allowSystemApiKey).catch((err) => {
      errors.psi = err.message || 'PageSpeedデータの取得に失敗しました';
      return null;
    }),
    session
      ? fetchGscData(session, targetUrl, options?.gscSiteUrl).catch((err) => {
          errors.gsc = err.message || 'Search Consoleデータの取得に失敗しました';
          return null;
        })
      : Promise.resolve().then(() => {
          errors.gsc = 'Googleアカウント未連携（OAuth認証が必要です）';
          return null;
        }),
    session
      ? fetchGa4Data(session, options?.ga4PropertyId).catch((err) => {
          errors.ga4 = err.message || 'GA4データの取得に失敗しました';
          return null;
        })
      : Promise.resolve().then(() => {
          errors.ga4 = 'Googleアカウント未連携（OAuth認証が必要です）';
          return null;
        }),
    options?.isSuperAdmin
      ? fetchWebRiskData(targetUrl, process.env.GOOGLE_WEB_RISK_API_KEY).catch((err) => {
          errors.webRisk = err.message || 'Web Riskデータの取得に失敗しました';
          return null;
        })
      : Promise.resolve(null),
  ]);

  const psi = psiResult.status === 'fulfilled' ? psiResult.value : null;
  const gsc = gscResult.status === 'fulfilled' ? gscResult.value : null;
  const ga4 = ga4Result.status === 'fulfilled' ? ga4Result.value : null;
  const webRisk = webRiskResult.status === 'fulfilled' ? webRiskResult.value : null;

  // Gemini改善案の生成 (PSI/GSCの取得結果を入力)
  let gemini: GeminiProposalData | null = null;
  try {
    gemini = await generateGeminiProposals(targetUrl, psi, gsc, options?.customGeminiKey, options?.isSuperAdmin);
  } catch (err: any) {
    errors.gemini = err.message || 'Gemini改善案の生成に失敗しました';
  }

  return {
    url: targetUrl,
    session: sessionStatus,
    psi,
    gsc,
    ga4,
    gemini,
    webRisk,
    errors,
    fetchedAt: new Date().toISOString(),
  };
}

// 6. SCR-18: GSC URL Inspection 詳細取得関数
export async function inspectUrlInGsc(session: GoogleSessionRecord | null, inspectionUrl: string, siteUrl?: string) {
  const parsed = new URL(inspectionUrl);
  const origin = parsed.origin;
  const siteUrlCandidates = siteUrl
    ? [siteUrl]
    : [origin + '/', origin, `sc-domain:${parsed.hostname}`];

  if (!session) {
    throw new Error('Googleアカウント連携が必要です');
  }

  // 認証済みセッションがある場合は公式 Inspection API を呼び出し
  const token = await getFreshAccessToken(session);
  let matchedSite = siteUrlCandidates[0];
  let apiData: any = null;
  let lastError: any = null;

  for (const candidate of siteUrlCandidates) {
    try {
      const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inspectionUrl,
          siteUrl: candidate,
        }),
      });
      if (res.ok) {
        apiData = await res.json();
        matchedSite = candidate;
        break;
      } else {
        const e = await res.json().catch(() => ({}));
        lastError = e.error?.message || `HTTP ${res.status}`;
      }
    } catch (e: any) {
      lastError = e.message;
    }
  }

  if (apiData?.inspectionResult) {
    const ir = apiData.inspectionResult;
    const isr = ir.indexStatusResult || {};
    const mur = ir.mobileUsabilityResult || {};
    const rri = ir.richResultsResult?.detectedItems || [];

    return {
      inspectionUrl,
      verdict: isr.verdict || 'NEUTRAL',
      coverageState: isr.coverageState || 'Crawled - currently not indexed',
      robotsTxtState: isr.robotsTxtState || 'ALLOWED',
      indexingState: isr.indexingState || 'INDEXING_ALLOWED',
      lastCrawlTime: isr.lastCrawlTime,
      pageFetchState: isr.pageFetchState || 'SUCCESSFUL',
      googleCanonical: isr.googleCanonical,
      userCanonical: isr.userCanonical,
      mobileUsabilityResult: {
        verdict: mur.verdict || 'PASS',
        issues: (mur.issues || []).map((i: any) => i.issueType || String(i)),
      },
      richResults: rri.map((r: any) => ({
        name: r.richResultType || 'Structured Data',
        status: (r.items?.[0]?.issues?.length ? 'WARNING' : 'VALID') as 'VALID' | 'WARNING' | 'ERROR',
      })),
      siteUrl: matchedSite,
      isSimulated: false,
    };
  }

  throw new Error(lastError || 'Search Consoleプロパティの所有権を確認できませんでした');
}

// 7. SCR-19: Google Indexing API 通知処理
export async function publishUrlToIndexingApi(session: GoogleSessionRecord | null, url: string, type: 'URL_UPDATED' | 'URL_DELETED') {
  if (!session) throw new Error('Googleアカウント連携が必要です');

  if (type === 'URL_UPDATED') {
    const page = await safeFetchUrl(url, { signal: AbortSignal.timeout(10_000) });
    if (!page.ok) throw new Error(`対象ページを確認できませんでした (HTTP ${page.status})`);
    const html = await page.text();
    const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const eligible = jsonLdBlocks.some((match) => {
      try {
        const raw = JSON.parse(match[1]);
        const nodes = Array.isArray(raw) ? raw : raw?.['@graph'] || [raw];
        return nodes.some((node: any) => {
          const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
          if (types.includes('JobPosting')) return true;
          if (!types.includes('VideoObject')) return false;
          const events = Array.isArray(node.publication) ? node.publication : [node.publication];
          return events.some((event: any) => {
            const eventTypes = Array.isArray(event?.['@type']) ? event['@type'] : [event?.['@type']];
            return eventTypes.includes('BroadcastEvent');
          });
        });
      } catch {
        return false;
      }
    });
    if (!eligible) {
      throw new Error('Google Indexing APIの対象は JobPosting または BroadcastEvent を含むページだけです');
    }
  }

  const token = await getFreshAccessToken(session);
  try {
    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        type,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      return {
        url,
        type,
        status: 'SUBMITTED' as const,
        notifyTime: json.urlNotificationMetadata?.latestUpdate?.notifyTime || new Date().toISOString(),
        message: 'Google Indexing APIへ正常にURL通知を送信しました。クローラーの即時巡回がリクエストされました。',
      };
    } else {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.error?.message || `HTTP ${res.status}`;
      return {
        url,
        type,
        status: 'ERROR' as const,
        notifyTime: new Date().toISOString(),
        message: `Indexing APIエラー: ${msg}（※GCPコンソールでIndexing APIが有効化され、サービスアカウントまたはOAuthユーザーに所有権が付与されている必要があります）`,
      };
    }
  } catch (err: any) {
    return {
      url,
      type,
      status: 'ERROR' as const,
      notifyTime: new Date().toISOString(),
      message: `通信エラー: ${err.message}`,
    };
  }
}
