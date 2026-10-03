import * as cheerio from 'cheerio';
import { AuditMetric, AuditArea, FullAuditResult, CrawlLink, PageMeta, CwvEstimates } from '@seo/shared';
import { collectPageFindings, isGenericAnchor, readJsonLd, PageSignals } from './page-findings.js';
import { buildActionPlan, weightedAreaScore } from './ranked-audit.js';
import { SitemapCheckOutcome } from './sitemap.js';

export function analyzeHtml(
  url: string,
  html: string,
  responseTimeMs: number,
  httpStatus: number,
  responseHeaders?: Record<string, string>,
  sitemapData?: SitemapCheckOutcome
): FullAuditResult {
  const $ = cheerio.load(html);
  const metrics: AuditMetric[] = [];
  const parsedUrl = new URL(url);

  // 1. メタタグ・ヘッド情報抽出
  const title = $('title').first().text().trim() || null;
  const description = $('meta[name="description"]').attr('content')?.trim() || null;
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() || null;
  const robots = $('meta[name="robots"]').attr('content')?.trim() || null;
  const googlebot = $('meta[name="googlebot"]').attr('content')?.trim() || null;
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || null;
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || null;
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || null;
  const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() || null;
  const viewport = $('meta[name="viewport"]').attr('content')?.trim() || null;
  const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content') || null;
  const lang = $('html').attr('lang')?.trim() || null;

  // 2. 見出し構造抽出
  const headings: Array<{ tag: string; text: string }> = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text) {
      headings.push({ tag, text });
    }
  });
  const h1Elements = $('h1');
  const h1Count = h1Elements.length;

  // 3. 画像とAlt属性
  const images = $('img');
  const imageCount = images.length;
  let missingAltCount = 0;
  let imagesMissingDimensions = 0;
  images.each((_, el) => {
    if ($(el).attr('alt') === undefined) missingAltCount++;
    if (!$(el).attr('width') || !$(el).attr('height')) imagesMissingDimensions++;
  });

  // 4. 本文文字数概算
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText.length;

  // 5. 構造化データ (JSON-LD)
  const jsonLdRaw: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    jsonLdRaw.push($(el).html() || '');
  });
  const jsonLd = readJsonLd(jsonLdRaw);
  const schemaTypes = jsonLd.types;

  // 6. リンク抽出 (内部 / 外部リンク)
  const links: CrawlLink[] = [];
  const seenUrls = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim();
    const anchorText = $(el).text().trim().replace(/\s+/g, ' ') || '(テキストなし)';
    const rel = $(el).attr('rel') || '';
    const isNofollow = rel.includes('nofollow');

    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    try {
      const absoluteUrl = new URL(href, url).href;
      if (!seenUrls.has(absoluteUrl)) {
        seenUrls.add(absoluteUrl);
        const targetHost = new URL(absoluteUrl).hostname;
        const isInternal = targetHost === parsedUrl.hostname;
        links.push({
          url: absoluteUrl,
          anchorText: anchorText.slice(0, 100),
          isInternal,
          isNofollow,
        });
      }
    } catch {
      // 無効なURL
    }
  });

  // ==========================================
  // 診断ルール評価 (150+基準から主要項目を網羅)
  // ==========================================

  // --- Content & Headings ---
  if (!title) {
    metrics.push({
      id: 'CONT-001',
      name: 'Titleタグの存在',
      category: 'content',
      score: 0,
      status: 'critical',
      message: 'Titleタグが存在しません。検索エンジンやAIがページ内容を特定できません。',
      proposal: '<title>サイト名やページの要約</title> を設定してください。',
    });
  } else if (title.length < 15 || title.length > 70) {
    metrics.push({
      id: 'CONT-002',
      name: 'Titleの表示幅の目安',
      category: 'content',
      score: 90,
      status: 'notice',
      message: `Titleは${title.length}文字です。Google は文字数の上限を定めておらず、端末の表示幅で切れます。15〜70文字は画面上の目安であり、合格・不合格ではありません。`,
      proposal: 'そのページの内容が分かる題名にする。キーワードの詰め込みはしない。',
    });
  } else {
    metrics.push({
      id: 'CONT-001',
      name: 'Titleタグの存在',
      category: 'content',
      score: 100,
      status: 'good',
      message: `Titleがあります（${title.length}文字）。文字数だけでは合否を付けていません。`,
    });
  }

  if (!description) {
    metrics.push({
      id: 'CONT-003',
      name: 'Meta Descriptionの存在',
      category: 'content',
      score: 70,
      status: 'warning',
      message: 'meta description がありません。スニペットは主に本文から作られ、description は本文よりそのページを正確に説明できるときに使われます。',
      proposal: 'ページ固有の説明を書く。文字数の枠では合否を付けない。',
    });
  } else {
    metrics.push({
      id: 'CONT-003',
      name: 'Meta Descriptionの存在',
      category: 'content',
      score: 100,
      status: 'good',
      message: `meta description があります（${description.length}文字）。文字数は合否にしていません。`,
    });
  }

  if (h1Count === 0) {
    metrics.push({
      id: 'CONT-004',
      name: 'H1見出しの存在',
      category: 'content',
      score: 80,
      status: 'notice',
      message: 'H1 がありません。見出しの個数は順位の固定条件ではありません。主題が画面上で分かるか、という編集上の目安です。',
      proposal: 'ページの主題が分かる見出しを置く。',
    });
  } else if (h1Count > 1) {
    metrics.push({
      id: 'CONT-004',
      name: 'H1見出しが複数',
      category: 'content',
      score: 90,
      status: 'notice',
      message: `H1 が ${h1Count} 個あります。複数であること自体は順位の減点条件ではありません。`,
      proposal: '主見出しを一つにすると、読者には伝わりやすい。',
    });
  } else {
    metrics.push({
      id: 'CONT-004',
      name: '単一H1見出しの設計',
      category: 'content',
      score: 100,
      status: 'good',
      message: 'ページに適切な単一のH1タグが配置されています。',
    });
  }

  if (missingAltCount > 0) {
    metrics.push({
      id: 'CONT-006',
      name: '画像Alt属性の欠落',
      category: 'content',
      score: Math.max(30, 100 - missingAltCount * 15),
      status: missingAltCount > 3 ? 'critical' : 'warning',
      message: `${imageCount}個中${missingAltCount}個の画像に alt 属性自体がありません。装飾画像の空の alt は正しい指定です。`,
      proposal: '情報を持つ画像には内容が分かる alt を付ける。装飾なら alt=""。',
    });
  } else if (imageCount > 0) {
    metrics.push({
      id: 'CONT-006',
      name: '画像Alt属性の網羅性',
      category: 'content',
      score: 100,
      status: 'good',
      message: `全${imageCount}個の画像にAlt属性が設定されています。`,
    });
  }

  // --- Technical & Meta ---
  const canonicalTags = $('link[rel="canonical"]');
  if (canonicalTags.length > 1) {
    metrics.push({
      id: 'META-001',
      name: 'Canonicalタグの重複競合',
      category: 'technical',
      score: 0,
      status: 'critical',
      message: `Canonicalタグが${canonicalTags.length}件検出されました。競合する正規URLはクローラーに無視される危険があります。`,
      proposal: '単一の正規URLのみを指定してください。',
      codeDiff: {
        before: '<link rel="canonical" href="..." />\n<link rel="canonical" href="..." />',
        after: `export const metadata: Metadata = {\n  alternates: {\n    canonical: '${url}',\n  },\n};`,
      },
    });
  } else if (canonical && !canonical.startsWith('http://') && !canonical.startsWith('https://')) {
    metrics.push({
      id: 'META-002',
      name: 'Canonicalタグの相対パス指定',
      category: 'technical',
      score: 40,
      status: 'warning',
      message: `Canonicalに相対パス（${canonical}）が指定されています。完全な絶対URL（https://...）を指定してください。`,
      proposal: '完全な絶対URLに変更してください。',
    });
  } else if (canonical) {
    metrics.push({
      id: 'META-001',
      name: 'Canonicalタグの整合性',
      category: 'technical',
      score: 100,
      status: 'good',
      message: '正規化された絶対URL Canonical が正しく設定されています。',
    });
  } else {
    metrics.push({
      id: 'META-003',
      name: 'Canonicalタグの未設定',
      category: 'technical',
      score: 60,
      status: 'warning',
      message: 'Canonicalタグが設定されていません。パラメータ付きURLなどで重複コンテンツと判定されるリスクがあります。',
      proposal: '正規URLを指定するCanonicalタグを追加してください。',
      codeDiff: {
        before: '<!-- canonical 未設定 -->',
        after: `<link rel="canonical" href="${url}" />`,
      },
    });
  }

  // OGP & Twitter
  if (!ogTitle || !ogImage) {
    metrics.push({
      id: 'META-010',
      name: 'OpenGraph (SNS共有) メタタグ',
      category: 'technical',
      score: 50,
      status: 'warning',
      message: 'og:title または og:image が未設定です。SNS共有時やチャットツールでのカード表示が崩れます。',
      proposal: 'og:title, og:description, og:image, og:type を定義してください。',
    });
  } else if (ogImage && !ogImage.startsWith('http://') && !ogImage.startsWith('https://')) {
    metrics.push({
      id: 'META-014',
      name: 'og:image の相対パス指定',
      category: 'technical',
      score: 50,
      status: 'warning',
      message: `og:image に相対パス（${ogImage}）が指定されています。仕様上、完全な絶対URLが必須です。`,
      proposal: `https://${parsedUrl.hostname}${ogImage.startsWith('/') ? '' : '/'}${ogImage} のように絶対URLで指定してください。`,
    });
  } else {
    metrics.push({
      id: 'META-010',
      name: 'OpenGraphプロトコル準拠',
      category: 'technical',
      score: 100,
      status: 'good',
      message: 'OGPタグ（Title, Image等）が正しく構成されています。',
    });
  }

  // --- AEO / AIO / LLMO / GEO (Next-Gen AI Optimization) ---
  const hasMaxSnippet = (robots && robots.includes('max-snippet:-1')) || (googlebot && googlebot.includes('max-snippet:-1'));
  const hasMaxImagePreview = (robots && robots.includes('max-image-preview:large')) || (googlebot && googlebot.includes('max-image-preview:large'));

  if (hasMaxSnippet && hasMaxImagePreview) {
    metrics.push({
      id: 'AIO-001',
      name: 'AIスニペット最大表示許可タグ',
      category: 'aeo_llmo',
      score: 100,
      status: 'good',
      message: 'max-snippet:-1 と max-image-preview:large は入っています。これはスニペットの任意の制御であり、AI Overviews への掲載や順位を保証しません。',
    });
  } else {
    metrics.push({
      id: 'AIO-001',
      name: 'スニペット制御メタタグ',
      category: 'aeo_llmo',
      score: 100,
      status: 'notice',
      message: 'max-snippet と max-image-preview は任意の制御です。Google は生成 AI の検索結果に、特別なマークアップや llms.txt を要求していません。未設定でも減点しません。',
      proposal: 'スニペットを意図して短くしたいときだけ指定する。',
    });
  }

  // AEO Answerability (見出し直後の結論定義文)
  let definitionCount = 0;
  $('h1, h2, h3').each((_, el) => {
    const nextP = $(el).next('p').text().trim();
    if (nextP && (nextP.includes('とは') || nextP.includes('です') || nextP.includes('である') || nextP.includes('means') || nextP.includes('is a'))) {
      definitionCount++;
    }
  });

  if (definitionCount > 0) {
    metrics.push({
      id: 'AEO-001',
      name: '結論ファースト定義文 (Answerability)',
      category: 'aeo_llmo',
      score: 95,
      status: 'good',
      message: `主要見出し直下に定義らしい文が ${definitionCount} 箇所あります。編集上の観察であり、引用や掲載の予測ではありません。`,
    });
  } else {
    metrics.push({
      id: 'AEO-001',
      name: '見出し直下の定義文',
      category: 'aeo_llmo',
      score: 100,
      status: 'notice',
      message: '見出し直下の定型的な定義文は見当たりません。これは編集上の観察であり、Google の要件でも引用の予測でもありません。',
      proposal: '読者が最初に答えを必要とするページなら、結論を先に書く。',
    });
  }

  // リスト・テーブル構造 (LLM引用性)
  const hasStructuredLists = $('ul, ol, table').length > 0;
  if (hasStructuredLists) {
    metrics.push({
      id: 'AEO-002',
      name: '構造化リスト/テーブルによる情報整理',
      category: 'aeo_llmo',
      score: 90,
      status: 'good',
      message: 'リストまたはテーブルによる構造化データが含まれており、LLMが要約・比較表として参照しやすいレイアウトです。',
    });
  }

  // Schema.org JSON-LD
  if (schemaTypes.length > 0) {
    metrics.push({
      id: 'TRUST-001',
      name: '構造化データ (JSON-LD) 実装',
      category: 'technical',
      score: 100,
      status: 'good',
      message: `Schema.org JSON-LD (${schemaTypes.join(', ')}) が検出されました。ナレッジグラフおよびAIエンティティの認識に最適です。`,
    });
  } else {
    metrics.push({
      id: 'TRUST-001',
      name: '構造化データ (JSON-LD) 未設定',
      category: 'technical',
      score: 45,
      status: 'warning',
      message: 'JSON-LD がありません。生成 AI の検索結果に構造化データは必須ではありません。リッチリザルトに出したい型だけ、見える内容と一致させて追加します。',
      proposal: 'リッチリザルトの対象になる型があるときだけ、その型の必須プロパティを足す。',
      codeDiff: {
        before: '<!-- JSON-LD なし -->',
        after: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "${title || 'My Site'}",\n  "url": "${url}"\n}\n</script>`,
      },
    });
  }

  // --- Security & Technical Base ---
  const isHttps = url.startsWith('https://');
  if (isHttps) {
    metrics.push({
      id: 'SEC-001',
      name: 'HTTPS 暗号化通信',
      category: 'security',
      score: 100,
      status: 'good',
      message: '通信がTLS/HTTPSで安全に暗号化されています。',
    });
  } else {
    metrics.push({
      id: 'SEC-001',
      name: 'HTTPS 非対応',
      category: 'security',
      score: 0,
      status: 'critical',
      message: 'HTTPプロトコルで配信されています。ブラウザ警告が表示されSEO評価が大きく低下します。',
      proposal: 'SSL証明書を導入しHTTPSへリダイレクトしてください。',
    });
  }

  if (viewport) {
    metrics.push({
      id: 'TECH-001',
      name: 'モバイル Viewport 最適化',
      category: 'technical',
      score: 100,
      status: 'good',
      message: 'meta viewport が正しく設定され、モバイルフレンドリーに対応しています。',
    });
  } else {
    metrics.push({
      id: 'TECH-001',
      name: 'モバイル Viewport 未設定',
      category: 'technical',
      score: 20,
      status: 'critical',
      message: 'meta viewport が存在しません。モバイル端末で極小表示される危険があります。',
      proposal: '<meta name="viewport" content="width=device-width, initial-scale=1"> を追加してください。',
    });
  }

  // --- XML Sitemap (TECH-006) ---
  if (sitemapData) {
    metrics.push(sitemapData.metric);
  }

  // --- Core Web Vitals & Performance Estimates ---
  const pageSizeBytes = Buffer.byteLength(html, 'utf8');
  const pageSizeKb = Math.round(pageSizeBytes / 1024);
  const estimatedFcp = Math.max(120, Math.round(responseTimeMs * 0.7));
  const estimatedLcp = Math.max(300, Math.round(responseTimeMs * 1.4 + (pageSizeKb > 500 ? 600 : 150)));
  const estimatedCls = 0.02;

  const cwv: CwvEstimates = {
    fcp: estimatedFcp,
    lcp: estimatedLcp,
    cls: estimatedCls,
    ttfb: responseTimeMs,
    totalSizeKb: pageSizeKb,
  };

  if (responseTimeMs < 800) {
    metrics.push({
      id: 'CWV-001',
      name: 'サーバー応答速度 (TTFB)',
      category: 'cwv',
      score: 100,
      status: 'good',
      message: `TTFB ${responseTimeMs}ms で高速に応答しています（推奨 < 800ms）。`,
    });
  } else if (responseTimeMs < 1800) {
    metrics.push({
      id: 'CWV-001',
      name: 'サーバー応答速度 (TTFB)',
      category: 'cwv',
      score: 75,
      status: 'warning',
      message: `TTFB ${responseTimeMs}ms です。CDNキャッシュの適用やエッジサーバーの導入を推奨します。`,
    });
  } else {
    metrics.push({
      id: 'CWV-001',
      name: 'サーバー応答遅延 (TTFB)',
      category: 'cwv',
      score: 40,
      status: 'critical',
      message: `TTFBが${responseTimeMs}msと低速です。Core Web VitalsのLCP悪化の主原因になります。`,
    });
  }

  // --- 順位付き施策（領域点・インパクト・工数） ---
  const headerMap: Record<string, string> = {};
  if (responseHeaders) {
    for (const [key, value] of Object.entries(responseHeaders)) {
      headerMap[key.toLowerCase()] = value;
    }
  }
  const titleCount = $('title').length;
  const canonicals: string[] = [];
  $('link[rel="canonical"]').each((_, el) => {
    const href = $(el).attr('href')?.trim();
    if (href) canonicals.push(href);
  });
  const genericAnchors: string[] = [];
  $('a[href]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && isGenericAnchor(text) && genericAnchors.length < 8 && !genericAnchors.includes(text)) {
      genericAnchors.push(text);
    }
  });
  const mixedContent: string[] = [];
  if (isHttps) {
    $('img[src], script[src], iframe[src], video[src], audio[src], source[src]').each((_, el) => {
      const src = $(el).attr('src')?.trim();
      if (!src || mixedContent.length >= 5) return;
      try {
        const absolute = new URL(src, url).href;
        if (absolute.startsWith('http://')) mixedContent.push(absolute);
      } catch {
        // 壊れた URL は別問題
      }
    });
  }
  const hreflangHrefs: string[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const href = $(el).attr('href')?.trim();
    if (href) {
      try {
        hreflangHrefs.push(new URL(href, url).href);
      } catch {
        hreflangHrefs.push(href);
      }
    }
  });
  const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
  const signals: PageSignals = {
    url,
    httpStatus,
    responseTimeMs,
    pageSizeBytes,
    https: isHttps,
    headers: headerMap,
    headersKnown: Boolean(responseHeaders),
    title,
    titleCount,
    description,
    canonicals,
    robotsMeta: robots,
    googlebot,
    viewport,
    lang,
    h1Count,
    headings,
    imagesMissingAlt: missingAltCount,
    imagesMissingDimensions,
    textLength: wordCount,
    jsonLdErrors: jsonLd.errors,
    schemaNodes: jsonLd.nodes,
    ogTitle,
    ogImage,
    hreflangCount: hreflangHrefs.length,
    hreflangSelf: hreflangHrefs.some((href) => {
      try {
        const left = new URL(href);
        const right = new URL(url);
        const path = (value: string) => (value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value);
        return left.host === right.host && path(left.pathname) === path(right.pathname);
      } catch {
        return false;
      }
    }),
    genericAnchors,
    mixedContent,
    favicon,
    robots: sitemapData?.robots,
    sitemapStatus: sitemapData?.sitemapResult.status,
    sitemapInRobots: sitemapData?.sitemapResult.hasRobotsTxtSitemap,
    sitemapHttpUrls: sitemapData?.sitemapResult.analytics?.protocol.httpCount,
  };
  const pageFindings = collectPageFindings(signals);
  const partialReasons = [
    '単一 URL の取得です。重複タイトル、孤立ページ、リダイレクトチェーン、サイト全体の内部リンクは見ていません。',
    'Core Web Vitals のフィールドデータはありません。応答時間はこの 1 回の取得です。',
  ];
  if (!responseHeaders) partialReasons.push('応答ヘッダーを渡されていないため、HSTS とセキュリティヘッダーは未評価です。');
  if (!sitemapData) partialReasons.push('robots.txt とサイトマップを取得していないため、その項目は未評価です。');
  const actionPlan = buildActionPlan(pageFindings.findings, {
    https: isHttps,
    robotsBlocksAll: Boolean(sitemapData?.robots.disallowAll),
    noindex: pageFindings.noindex,
    pageCount: 1,
    assessedIds: pageFindings.assessedIds,
    assessedAreas: pageFindings.assessedAreas,
    partialReasons,
  });
  const areaScore = (id: AuditArea) => actionPlan.areas.find((area) => area.id === id)?.score ?? actionPlan.overall;
  const overallScore = actionPlan.overall;
  const seoScore = weightedAreaScore(actionPlan, ['crawl', 'onpage', 'links']);
  const performanceScore = Math.round(areaScore('performance'));
  const metaScore = Math.round(areaScore('structured'));
  const aeoScore = Math.round(areaScore('ai'));
  const securityScore = Math.round(areaScore('security'));

  const pageMeta: PageMeta = {
    title,
    description,
    canonical,
    robots,
    googlebot,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    viewport,
    charset,
    lang,
    schemaTypes,
    h1Count,
    headings,
    wordCount,
    imageCount,
    missingAltCount,
  };

  const answerabilityScore = Math.min(100, Math.round((definitionCount * 25) + (hasMaxSnippet ? 30 : 0) + (schemaTypes.length > 0 ? 20 : 0) + 25));

  const recommendations = actionPlan.actions
    .filter((action) => action.severity !== 'info')
    .slice(0, 3)
    .map((action) => action.fix);

  const generatedId = `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: generatedId,
    url,
    timestamp: new Date().toISOString(),
    httpStatus,
    responseTimeMs,
    pageSizeBytes,
    overallScore,
    scores: {
      seo: seoScore,
      performance: performanceScore,
      meta: metaScore,
      aeo_llmo: aeoScore,
      security: securityScore,
    },
    actionPlan,
    metrics,
    meta: pageMeta,
    links,
    cwv,
    sitemap: sitemapData?.sitemapResult,
    aiOverview: {
      summary: `${parsedUrl.hostname} のこの URL を、検索の技術要件と内部の作業順ルーブリックで見ました。P1 は ${actionPlan.actions.filter((action) => action.priority === 'P1').length} 件です。点数は掲載や順位の予測ではありません。`,
      answerabilityScore,
      citations: [
        { title: title || parsedUrl.hostname, url, domain: parsedUrl.hostname },
        ...links.filter((l) => l.isInternal).slice(0, 2).map((l) => ({
          title: l.anchorText || l.url,
          url: l.url,
          domain: parsedUrl.hostname,
        })),
      ],
      recommendations,
    },
  };
}

