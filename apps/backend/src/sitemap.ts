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
    const robotsRes = await fetch(robotsTxtUrl, {
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
    const sitemapRes = await fetch(primarySitemapUrl, {
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
            urls.push({ loc, lastmod, changefreq, priority, isValidUrl });
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
  };

  return {
    sitemapResult,
    metric,
  };
}
