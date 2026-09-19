import { safeFetchUrl } from './url-security.js';
import * as cheerio from 'cheerio';
import { SitemapValidationResult, SitemapUrlEntry, SitemapIssue, AuditMetric } from '@seo/shared';

export interface SitemapCheckOutcome {
  sitemapResult: SitemapValidationResult;
  metric: AuditMetric;
}

export async function checkSitemap(targetUrlStr: string): Promise<SitemapCheckOutcome> {
  const targetUrl = new URL(targetUrlStr);
  const origin = targetUrl.origin;
  const robotsTxtUrl = `${origin}/robots.txt`;
  const defaultSitemapUrl = `${origin}/sitemap.xml`;

  let discoveredSitemapUrls: string[] = [];
  let hasRobotsTxtSitemap = false;
  const issues: SitemapIssue[] = [];

  // 1. robots.txt の取得と Sitemap ディレクティブの検証
  try {
    const robotsRes = await safeFetchUrl(robotsTxtUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/2.0; +https://seo.n-n.tokyo/bot)',
        'Accept': 'text/plain,*/*',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (robotsRes.ok) {
      const robotsContent = await robotsRes.text();
      const lines = robotsContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^sitemap:\s*/i.test(trimmed)) {
          const sUrl = trimmed.replace(/^sitemap:\s*/i, '').trim();
          if (sUrl) {
            discoveredSitemapUrls.push(sUrl);
            hasRobotsTxtSitemap = true;
          }
        }
      }
    }
  } catch {
    // robots.txt の取得タイムアウト等は後続で判定
  }

  if (!hasRobotsTxtSitemap) {
    issues.push({
      severity: 'warning',
      message: 'robots.txt に Sitemap: ディレクティブが指定されていません。検索エンジンのクローラーによる発見が遅れる可能性があります。',
      proposal: `robots.txt に "Sitemap: ${defaultSitemapUrl}" を追加してください。`,
    });
  }

  // 検証対象とするサイトマップURL
  const primarySitemapUrl = discoveredSitemapUrls.length > 0 ? discoveredSitemapUrls[0] : defaultSitemapUrl;

  let sitemapContent = '';
  let responseTimeMs = 0;
  let xmlSizeKb = 0;
  let status: 'found' | 'not_found' | 'error' = 'not_found';
  let isSitemapIndex = false;
  const urls: SitemapUrlEntry[] = [];

  try {
    const startTime = Date.now();
    const sitemapRes = await safeFetchUrl(primarySitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/2.0; +https://seo.n-n.tokyo/bot)',
        'Accept': 'application/xml,text/xml,application/xhtml+xml,*/*',
      },
      signal: AbortSignal.timeout(8000),
    });
    responseTimeMs = Date.now() - startTime;

    if (sitemapRes.status === 200) {
      status = 'found';
      sitemapContent = await sitemapRes.text();
      xmlSizeKb = Math.round((Buffer.byteLength(sitemapContent, 'utf8') / 1024) * 10) / 10;

      // サイズ上限チェック（50MB未圧縮制限）
      if (xmlSizeKb > 50 * 1024) {
        issues.push({
          severity: 'critical',
          message: `サイトマップのサイズが ${xmlSizeKb} KB です。プロトコル上限（50MB）を超えています。`,
          proposal: 'サイトマップを複数ファイルに分割し、<sitemapindex> を使用してください。',
        });
      }

      // XMLパース (Cheerio with xmlMode: true)
      const $ = cheerio.load(sitemapContent, { xmlMode: true });

      // sitemapindex か urlset かの判定
      const sitemapIndexTags = $('sitemapindex > sitemap');
      const urlTags = $('urlset > url');

      if (sitemapIndexTags.length > 0) {
        isSitemapIndex = true;
        sitemapIndexTags.each((_, el) => {
          const loc = $(el).find('loc').text().trim();
          const lastmod = $(el).find('lastmod').text().trim() || undefined;
          let isValidUrl = true;
          try {
            new URL(loc);
          } catch {
            isValidUrl = false;
          }
          if (loc) {
            urls.push({ loc, lastmod, isValidUrl });
          }
        });
      } else if (urlTags.length > 0) {
        isSitemapIndex = false;
        urlTags.each((_, el) => {
          const loc = $(el).find('loc').text().trim();
          const lastmod = $(el).find('lastmod').text().trim() || undefined;
          const changefreq = $(el).find('changefreq').text().trim() || undefined;
          const priority = $(el).find('priority').text().trim() || undefined;
          let isValidUrl = true;
          const companionUrls: import('@seo/shared').CompanionUrlInfo[] = [];

          // xhtml:link コンパニオンURL (hreflang, alternate, mobile) の抽出
          $(el).find('xhtml\\:link, link').each((__, linkEl) => {
            const rel = $(linkEl).attr('rel') || '';
            const href = $(linkEl).attr('href') || '';
            const hreflang = $(linkEl).attr('hreflang');
            const media = $(linkEl).attr('media');

            if (href) {
              if (rel.includes('alternate') && hreflang) {
                companionUrls.push({ type: 'hreflang', url: href, langOrMedia: hreflang });
              } else if (rel.includes('alternate') && media) {
                companionUrls.push({ type: 'amp', url: href, langOrMedia: media });
              } else if (rel.includes('alternate')) {
                companionUrls.push({ type: 'alternate', url: href });
              }
            }
          });

          try {
            const parsed = new URL(loc);
            // 異なるホスト名の混入チェック
            if (parsed.hostname !== targetUrl.hostname) {
              issues.push({
                severity: 'warning',
                message: `外部ホストのURL（${loc}）がサイトマップに含まれています。自サイトと同一ドメインのURLのみを記述してください。`,
              });
            }
          } catch {
            isValidUrl = false;
          }

          if (loc) {
            urls.push({
              loc,
              lastmod,
              changefreq,
              priority,
              isValidUrl,
              companionUrls: companionUrls.length > 0 ? companionUrls : undefined,
            });
          }
        });
      } else {
        // XMLタグが見つからない、またはHTMLの404ページが返されている可能性
        status = 'error';
        issues.push({
          severity: 'critical',
          message: 'サイトマップが空であるか、有効な <urlset> または <sitemapindex> 構文を含んでいません。',
          proposal: '標準的な sitemap.xml 形式で出力してください。',
        });
      }

      // 件数上限チェック（50,000件制限）
      if (urls.length > 50000) {
        issues.push({
          severity: 'critical',
          message: `登録URL数が ${urls.length} 件です。単一サイトマップの上限（50,000件）を超えています。`,
          proposal: 'サイトマップ分割と <sitemapindex> を導入してください。',
        });
      }

      // 対象URL自身が含まれているかの確認
      const containsTargetUrl = urls.some((u) => {
        try {
          const uNorm = new URL(u.loc).href.replace(/\/$/, '');
          const tNorm = targetUrl.href.replace(/\/$/, '');
          return uNorm === tNorm;
        } catch {
          return false;
        }
      });

      if (!isSitemapIndex && urls.length > 0 && !containsTargetUrl) {
        issues.push({
          severity: 'notice',
          message: `診断対象ページ（${targetUrl.href}）がサイトマップ内に見つかりませんでした。重要ページであればサイトマップに登録してください。`,
        });
      }
    } else {
      status = 'not_found';
      issues.push({
        severity: 'critical',
        message: `サイトマップ（${primarySitemapUrl}）にアクセスできませんでした（HTTP ${sitemapRes.status}）。`,
        proposal: `${origin}/sitemap.xml を配置し、robots.txt に URL を記載してください。`,
      });
    }
  } catch (err: any) {
    status = 'error';
    issues.push({
      severity: 'critical',
      message: `サイトマップ（${primarySitemapUrl}）へのアクセス中にエラーが発生しました: ${err.message || '接続エラー'}`,
    });
  }

  // Next.js App Router 推奨コード生成
  const generatedNextjsCode = `// app/sitemap.ts (Next.js 15 App Router)
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = '${origin}';
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: \`\${baseUrl}/tools/llms-txt\`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];
}
`;

  // TECH-006 メトリクス生成
  let metricScore = 100;
  let metricStatus: 'good' | 'warning' | 'critical' = 'good';
  let metricMessage = '';

  if (status === 'found' && hasRobotsTxtSitemap && issues.filter((i) => i.severity === 'critical').length === 0) {
    metricScore = 100;
    metricStatus = 'good';
    metricMessage = `有効なXMLサイトマップ（${urls.length}件登録）と robots.txt の Sitemap 記載が正常に連携しています。`;
  } else if (status === 'found' && !hasRobotsTxtSitemap) {
    metricScore = 80;
    metricStatus = 'warning';
    metricMessage = `XMLサイトマップ（${urls.length}件登録）は存在しますが、robots.txt に Sitemap: の記載がありません。`;
  } else if (status === 'found' && issues.filter((i) => i.severity === 'critical').length > 0) {
    metricScore = 50;
    metricStatus = 'critical';
    metricMessage = 'XMLサイトマップは存在しますが、構文エラーまたはプロトコル違反が検出されました。';
  } else {
    metricScore = 0;
    metricStatus = 'critical';
    metricMessage = 'XMLサイトマップが見つかりません。検索エンジンのクローラーによる新規ページの発見や巡回頻度が著しく低下します。';
  }

  const metric: AuditMetric = {
    id: 'TECH-006',
    name: 'XMLサイトマップ連携 & 健全性',
    category: 'technical',
    score: metricScore,
    status: metricStatus,
    message: metricMessage,
    proposal: metricScore < 100 ? 'robots.txt に Sitemap URL を指定し、正確な XML サイトマップを生成してください。' : undefined,
    codeDiff: metricScore < 100 ? {
      before: `<!-- sitemap.xml または robots.txt 連携が不完全 -->`,
      after: generatedNextjsCode,
    } : undefined,
  };

  // --- サイトマップ統計・深層分析 (Sitemap Deep Analytics) ---
  let analytics: import('@seo/shared').SitemapAnalytics | undefined = undefined;

  if (status === 'found' && urls.length > 0) {
    const nowMs = Date.now();
    let recentUpdatedCount = 0;
    let outdatedCount = 0;
    let httpsCount = 0;
    let httpCount = 0;
    const pathDepthDistribution: Record<string, number> = {
      'トップ階層 (depth 0)': 0,
      '第1階層 (depth 1)': 0,
      '第2階層 (depth 2)': 0,
      '第3階層以上 (depth 3+)': 0,
    };
    const changefreqDistribution: Record<string, number> = {};
    const priorityDistribution: Record<string, number> = {};

    for (const u of urls) {
      if (u.loc.startsWith('https://')) httpsCount++;
      else if (u.loc.startsWith('http://')) httpCount++;

      try {
        const p = new URL(u.loc);
        const segments = p.pathname.split('/').filter(Boolean);
        const depth = segments.length;
        if (depth === 0) pathDepthDistribution['トップ階層 (depth 0)']++;
        else if (depth === 1) pathDepthDistribution['第1階層 (depth 1)']++;
        else if (depth === 2) pathDepthDistribution['第2階層 (depth 2)']++;
        else pathDepthDistribution['第3階層以上 (depth 3+)']++;
      } catch {}

      if (u.lastmod) {
        const lastmodTime = new Date(u.lastmod).getTime();
        if (!isNaN(lastmodTime)) {
          const diffDays = (nowMs - lastmodTime) / (1000 * 60 * 60 * 24);
          if (diffDays <= 30) recentUpdatedCount++;
          else if (diffDays >= 180) outdatedCount++;
        } else {
          outdatedCount++;
        }
      } else {
        outdatedCount++;
      }

      if (u.changefreq) {
        changefreqDistribution[u.changefreq] = (changefreqDistribution[u.changefreq] || 0) + 1;
      }
      if (u.priority) {
        const pr = parseFloat(u.priority);
        const key = pr >= 0.8 ? '高優先度 (0.8 - 1.0)' : pr >= 0.5 ? '通常 (0.5 - 0.7)' : '低優先度 (0.1 - 0.4)';
        priorityDistribution[key] = (priorityDistribution[key] || 0) + 1;
      }
    }

    // 更新鮮度スコア (0-100)
    const freshnessRatio = (urls.length - outdatedCount) / urls.length;
    const freshnessScore = Math.max(20, Math.min(100, Math.round(freshnessRatio * 100)));

    if (httpCount > 0) {
      issues.push({
        severity: 'critical',
        message: `サイトマップ内に非HTTPS（http://）のURLが ${httpCount} 件含まれています。正規URLはすべてHTTPSで統一してください。`,
        proposal: 'http:// をすべて https:// に置き換えてください。',
      });
    }

    if (outdatedCount > 0 && urls.length > 5 && (outdatedCount / urls.length) > 0.7) {
      issues.push({
        severity: 'notice',
        message: `登録URLの過半数（${outdatedCount}件）に lastmod が未指定、または180日以上更新がありません。クローラーに更新頻度を伝えるため適切な最終更新日時を指定してください。`,
      });
    }

    // 1. ハブページ（トピッククラスター）分析
    // ディレクトリ共通プレフィックス（/tools, /blog, /docs, /products 等）からハブURLと子ページ群を抽出
    const clusterMap: Record<string, {
      hubPath: string;
      hubUrl: string;
      childUrls: string[];
      lastmods: string[];
      priorities: number[];
    }> = {};

    // 2. カノニカル & コンパニオン整合性集計
    let companionUrlsTotal = 0;
    let hreflangCount = 0;
    let ampCount = 0;
    let parameterUrlCount = 0;
    let trailingSlashMismatchCount = 0;

    for (const u of urls) {
      // コンパニオンURL集計
      if (u.companionUrls && u.companionUrls.length > 0) {
        companionUrlsTotal += u.companionUrls.length;
        for (const comp of u.companionUrls) {
          if (comp.type === 'hreflang') hreflangCount++;
          else if (comp.type === 'amp') ampCount++;
        }
      }

      // パラメータ付きURL（非正規混入の可能性）
      try {
        const uObj = new URL(u.loc);
        if (uObj.search && (uObj.search.includes('utm_') || uObj.search.includes('session') || uObj.search.includes('filter'))) {
          parameterUrlCount++;
          u.canonicalStatus = 'non_canonical_warning';
        } else {
          u.canonicalStatus = 'self_canonical';
        }

        // クラスタリング (親パスの特定)
        const segments = uObj.pathname.split('/').filter(Boolean);
        if (segments.length >= 1) {
          const parentPrefix = `/${segments[0]}`;
          if (!clusterMap[parentPrefix]) {
            clusterMap[parentPrefix] = {
              hubPath: parentPrefix,
              hubUrl: `${uObj.origin}${parentPrefix}`,
              childUrls: [],
              lastmods: [],
              priorities: [],
            };
          }
          if (segments.length > 1) {
            clusterMap[parentPrefix].childUrls.push(u.loc);
          }
          if (u.lastmod) clusterMap[parentPrefix].lastmods.push(u.lastmod);
          if (u.priority) clusterMap[parentPrefix].priorities.push(parseFloat(u.priority));
        }

        if (segments.length === 1 && !uObj.pathname.endsWith('/') && urls.some((other) => other.loc === `${u.loc}/`)) {
          trailingSlashMismatchCount++;
        }
      } catch {}
    }

    // ハブページフラグの付与とクラスタ情報整形
    const hubClusters: import('@seo/shared').HubClusterInfo[] = [];
    for (const [prefix, data] of Object.entries(clusterMap)) {
      if (data.childUrls.length > 0) {
        // ハブページ自身がサイトマップに存在するか確認
        const hubEntry = urls.find((u) => {
          try {
            const p = new URL(u.loc).pathname.replace(/\/$/, '');
            return p === prefix;
          } catch {
            return false;
          }
        });
        if (hubEntry) {
          hubEntry.isHubPage = true;
        } else {
          issues.push({
            severity: 'notice',
            message: `トピックハブ（${prefix}）の配下に ${data.childUrls.length} 件の子ページが存在しますが、親ハブページ自身がサイトマップに記載されていません。`,
            proposal: `サイトマップにハブ親URL（${origin}${prefix}）を追加してください。`,
          });
        }

        const avgPriority = data.priorities.length > 0
          ? Math.round((data.priorities.reduce((a, b) => a + b, 0) / data.priorities.length) * 10) / 10
          : undefined;

        hubClusters.push({
          hubPath: data.hubPath,
          hubUrl: data.hubUrl,
          childPageCount: data.childUrls.length,
          sampleChildren: data.childUrls.slice(0, 3),
          lastUpdated: data.lastmods.sort().reverse()[0],
          avgPriority,
        });
      }
    }

    if (parameterUrlCount > 0) {
      issues.push({
        severity: 'warning',
        message: `サイトマップ内にトラッキングパラメータ付きのURLが ${parameterUrlCount} 件検出されました。サイトマップには正規（Canonical）URLのみを記載してください。`,
        proposal: 'URLからクエリパラメータを除去した正規URLで登録してください。',
      });
    }

    const canonicalCompanion: import('@seo/shared').CanonicalCompanionAnalytics = {
      selfCanonicalCount: urls.length - parameterUrlCount,
      potentialCanonicalConflictCount: parameterUrlCount,
      companionUrlsTotal,
      hreflangCount,
      ampCount,
      trailingSlashMismatchCount,
      parameterUrlCount,
    };

    analytics = {
      freshnessScore,
      recentUpdatedCount,
      outdatedCount,
      protocol: {
        httpsCount,
        httpCount,
      },
      pathDepthDistribution,
      changefreqDistribution,
      priorityDistribution,
      hubClusters: hubClusters.length > 0 ? hubClusters : undefined,
      canonicalCompanion,
    };
  }

  const sitemapResult: SitemapValidationResult = {
    status,
    sitemapUrl: status === 'found' ? primarySitemapUrl : null,
    robotsTxtUrl,
    hasRobotsTxtSitemap,
    isSitemapIndex,
    totalUrls: urls.length,
    urls: urls.slice(0, 100), // 先頭100件
    issues,
    xmlSizeKb,
    responseTimeMs,
    generatedNextjsCode,
    analytics,
  };

  return {
    sitemapResult,
    metric,
  };
}
