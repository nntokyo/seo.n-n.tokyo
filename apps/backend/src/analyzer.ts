import * as cheerio from 'cheerio';
import { AuditMetric, FullAuditResult, CrawlLink, PageMeta, CwvEstimates } from '@seo/shared';

export function analyzeHtml(
  url: string,
  html: string,
  responseTimeMs: number,
  httpStatus: number,
  responseHeaders?: Record<string, string>
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
  images.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || alt === null || alt.trim() === '') {
      missingAltCount++;
    }
  });

  // 4. 本文文字数概算
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText.length;

  // 5. 構造化データ (JSON-LD)
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html() || '';
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item['@type']) schemaTypes.push(item['@type']);
        });
      } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        parsed['@graph'].forEach((item: any) => {
          if (item['@type']) schemaTypes.push(item['@type']);
        });
      } else if (parsed['@type']) {
        schemaTypes.push(parsed['@type']);
      }
    } catch {
      // JSON構文エラー
    }
  });

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
  } else if (title.length < 15 || title.length > 60) {
    metrics.push({
      id: 'CONT-002',
      name: 'Title文字数の最適化',
      category: 'content',
      score: 75,
      status: 'warning',
      message: `Title文字数が${title.length}文字です。検索結果で省略されない30〜35文字前後を推奨します。`,
      proposal: '主要キーワードを含めつつ適切な長さに調整してください。',
    });
  } else {
    metrics.push({
      id: 'CONT-001',
      name: 'Titleタグの最適化',
      category: 'content',
      score: 100,
      status: 'good',
      message: `適切なTitle文字数（${title.length}文字）が設定されています。`,
    });
  }

  if (!description) {
    metrics.push({
      id: 'CONT-003',
      name: 'Meta Descriptionの存在',
      category: 'content',
      score: 30,
      status: 'critical',
      message: 'Meta Descriptionが設定されていません。検索結果スニペットのクリック率に影響します。',
      proposal: '<meta name="description" content="ページ概要（80〜120文字）"> を記述してください。',
    });
  } else if (description.length < 50 || description.length > 160) {
    metrics.push({
      id: 'CONT-003',
      name: 'Meta Description文字数',
      category: 'content',
      score: 75,
      status: 'warning',
      message: `Description文字数が${description.length}文字です。80〜130文字程度が最適です。`,
    });
  } else {
    metrics.push({
      id: 'CONT-003',
      name: 'Meta Descriptionの最適化',
      category: 'content',
      score: 100,
      status: 'good',
      message: `適切なDescription（${description.length}文字）が記述されています。`,
    });
  }

  if (h1Count === 0) {
    metrics.push({
      id: 'CONT-004',
      name: 'H1見出しの存在',
      category: 'content',
      score: 20,
      status: 'critical',
      message: 'ページ内にH1タグが存在しません。主要テーマの伝達力が低下します。',
      proposal: 'ページの本質を表すH1タグを1つ配置してください。',
    });
  } else if (h1Count > 1) {
    metrics.push({
      id: 'CONT-004',
      name: 'H1見出しの複数重複',
      category: 'content',
      score: 65,
      status: 'warning',
      message: `H1タグが${h1Count}個存在します。1ページにつき主要なH1を1つに絞る設計が推奨されます。`,
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
      message: `${imageCount}個中${missingAltCount}個の画像にalt属性が設定されていません。画像検索やスクリーンリーダーで不利になります。`,
      proposal: 'すべてのimgタグに意味のある代替テキストalt属性を付与してください。',
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
      message: 'max-snippet:-1 および max-image-preview:large が正しく設定されており、Google AI Overviewsで最大サイズの引用・サムネイル表示が可能です。',
    });
  } else {
    metrics.push({
      id: 'AIO-001',
      name: 'AIスニペット最大表示メタタグの付与推奨',
      category: 'aeo_llmo',
      score: 35,
      status: 'critical',
      message: 'max-snippet:-1 や max-image-preview:large タグが未設定です。Google AI Overviewsで要約文が省略され、サムネイル画像が除外される恐れがあります。',
      proposal: '<meta name="robots" content="max-snippet:-1, max-image-preview:large"> を付与してください。',
      codeDiff: {
        before: '<!-- max-snippet / max-image-preview 未設定 -->',
        after: `export const metadata: Metadata = {\n  robots: {\n    googleBot: {\n      'max-image-preview': 'large',\n      'max-snippet': -1,\n    },\n  },\n};`,
      },
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
      message: `主要見出し直下に結論定義文（${definitionCount}箇所）が検出され、AI回答エンジン（Perplexity/SearchGPT）がダイレクト回答として抽出しやすい構造です。`,
    });
  } else {
    metrics.push({
      id: 'AEO-001',
      name: '結論ファースト定義文の不足',
      category: 'aeo_llmo',
      score: 55,
      status: 'warning',
      message: '見出し直下に「〜とは、〜である」形式の明確な結論定義文が見当たりません。AIによる引用獲得率が低下します。',
      proposal: '見出しの直後に100〜160文字程度で結論・定義を述べるパラグラフを配置してください。',
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
      message: 'Schema.org JSON-LD が検出されませんでした。AI Overviewsやリッチリザルトの獲得チャンスを逃しています。',
      proposal: 'Organization, Article, WebSite 等の構造化データを追加してください。',
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

  // --- スコア集計 ---
  const criticalCount = metrics.filter((m) => m.status === 'critical').length;
  const warningCount = metrics.filter((m) => m.status === 'warning').length;

  const penalty = criticalCount * 12 + warningCount * 4;
  const overallScore = Math.max(25, Math.min(100, 100 - penalty));

  const seoScore = Math.max(30, Math.min(100, 100 - (criticalCount > 0 ? 15 : 0) - (title ? 0 : 25) - (canonical ? 0 : 10)));
  const performanceScore = responseTimeMs < 800 ? 98 : responseTimeMs < 2000 ? 82 : 55;
  const metaScore = Math.max(30, 100 - (description ? 0 : 20) - (ogImage ? 0 : 15) - (canonical ? 0 : 15));
  const aeoScore = Math.max(35, (hasMaxSnippet ? 50 : 15) + (definitionCount > 0 ? 30 : 15) + (schemaTypes.length > 0 ? 20 : 5));
  const securityScore = isHttps ? 100 : 20;

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

  const recommendations: string[] = [];
  if (!hasMaxSnippet) {
    recommendations.push('Google AI Overviewsで引用を最大化するため `max-snippet:-1` と `max-image-preview:large` メタタグを設定してください。');
  }
  if (definitionCount === 0) {
    recommendations.push('主要な見出しの直下に「〜とは」などの簡潔な定義文（100〜160文字）を配置し、回答枠の抽出性を高めてください。');
  }
  if (schemaTypes.length === 0) {
    recommendations.push('Schema.org (JSON-LD) 構造化データを実装し、AIクローラーが組織・記事・著者を正確にエンティティ認識できるようにしてください。');
  }
  if (!canonical) {
    recommendations.push('正規URLを指示する `<link rel="canonical">` を設定し、重複コンテンツの評価分散を防いでください。');
  }

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
    metrics,
    meta: pageMeta,
    links,
    cwv,
    aiOverview: {
      summary: `${parsedUrl.hostname} のコンテンツは、${title || 'Webページ'} に関する情報を発信しており、${aeoScore >= 80 ? '最新のAI検索・AEO基準に高水準で最適化されています。' : 'AIによる要約や引用の獲得に向けて改善の余地が存在します。'}`,
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

