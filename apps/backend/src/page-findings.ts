import { AuditArea } from '@seo/shared';
import { FindingDraft } from './ranked-audit.js';
import { RobotsSnapshot } from './robots.js';

const G = 'https://developers.google.com/search/docs/';

const SRC = {
  title: G + 'appearance/title-link?hl=ja',
  snippet: G + 'appearance/snippet?hl=ja',
  canonical: G + 'crawling-indexing/consolidate-duplicate-urls?hl=ja',
  noindex: G + 'crawling-indexing/block-indexing?hl=ja',
  robots: G + 'crawling-indexing/robots/intro?hl=ja',
  sitemap: G + 'crawling-indexing/sitemaps/build-sitemap?hl=ja',
  links: G + 'crawling-indexing/links-crawlable?hl=ja',
  images: G + 'appearance/google-images?hl=ja',
  hreflang: G + 'specialty/international/localized-versions?hl=ja',
  mobile: G + 'crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=ja',
  helpful: G + 'fundamentals/creating-helpful-content?hl=ja',
  starter: G + 'fundamentals/seo-starter-guide?hl=ja',
  https: G + 'appearance/page-experience?hl=ja',
  aiGuide: G + 'fundamentals/ai-optimization-guide?hl=ja',
  sd: G + 'appearance/structured-data/intro-structured-data?hl=ja',
  product: G + 'appearance/structured-data/product-snippet?hl=ja',
  software: G + 'appearance/structured-data/software-app?hl=ja',
  breadcrumb: G + 'appearance/structured-data/breadcrumb?hl=ja',
  local: G + 'appearance/structured-data/local-business?hl=ja',
  faqNews: 'https://developers.google.com/search/news?hl=ja',
  favicon: G + 'appearance/favicon-in-search?hl=ja',
  http: 'https://developers.google.com/crawling/docs/troubleshooting/http-status-codes?hl=ja',
  hsts: 'https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security',
  headers: 'https://owasp.org/www-project-secure-headers/',
  mixed: 'https://developer.mozilla.org/ja/docs/Web/Security/Mixed_content',
  cls: 'https://web.dev/articles/optimize-cls',
  ttfb: 'https://web.dev/articles/ttfb',
  cwv: 'https://developers.google.com/search/docs/appearance/core-web-vitals?hl=ja',
  lang: 'https://developer.mozilla.org/ja/docs/Web/HTML/Reference/Global_attributes/lang',
  crawlers: 'https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers?hl=ja',
  og: 'https://ogp.me/',
};

const GENERIC_ANCHORS = new Set([
  'click here',
  'here',
  'read more',
  'learn more',
  'more',
  'this',
  'link',
  'go',
  'details',
  'continue',
  'see more',
  'view more',
  'こちら',
  'ここ',
  '詳細',
  '詳細はこちら',
  '詳しくはこちら',
  '続きを読む',
  'もっと見る',
  'こちらをクリック',
  'リンク',
]);

const LOCAL_TYPES = new Set([
  'LocalBusiness',
  'Restaurant',
  'Store',
  'FoodEstablishment',
  'MedicalBusiness',
  'Dentist',
  'Attorney',
  'Plumber',
  'Hotel',
  'LodgingBusiness',
]);

export interface SchemaNode {
  types: string[];
  keys: string[];
  offersPrice: boolean;
  listItemsOk: boolean;
}

export interface PageSignals {
  url: string;
  httpStatus: number;
  responseTimeMs: number;
  pageSizeBytes: number;
  https: boolean;
  headers: Record<string, string>;
  title: string | null;
  titleCount: number;
  description: string | null;
  canonicals: string[];
  robotsMeta: string | null;
  googlebot: string | null;
  viewport: string | null;
  lang: string | null;
  h1Count: number;
  headings: Array<{ tag: string; text: string }>;
  imagesMissingAlt: number;
  imagesMissingDimensions: number;
  textLength: number;
  jsonLdErrors: string[];
  schemaNodes: SchemaNode[];
  ogTitle: string | null;
  ogImage: string | null;
  hreflangCount: number;
  hreflangSelf: boolean;
  genericAnchors: string[];
  mixedContent: string[];
  favicon: boolean;
  /** 応答ヘッダーを実際に見たか。見ていないときは欠落扱いにしない。 */
  headersKnown: boolean;
  robots?: RobotsSnapshot | null;
  sitemapStatus?: 'found' | 'not_found' | 'error' | null;
  sitemapInRobots?: boolean;
  sitemapHttpUrls?: number;
}

export interface PageFindingResult {
  findings: FindingDraft[];
  assessedIds: string[];
  assessedAreas: AuditArea[];
  noindex: boolean;
}

function typeName(value: string): string {
  const part = value.split(/[#/]/).pop() || value;
  return part;
}

function hasType(node: SchemaNode, name: string): boolean {
  return node.types.some((type) => typeName(type) === name);
}

function sameUrl(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    const path = (value: string) => (value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value);
    return left.protocol === right.protocol && left.host.toLowerCase() === right.host.toLowerCase() && path(left.pathname) === path(right.pathname) && left.search === right.search;
  } catch {
    return false;
  }
}

function finding(
  id: string,
  category: FindingDraft['category'],
  severity: FindingDraft['severity'],
  title: string,
  evidence: string,
  fix: string,
  source: string,
  effort: FindingDraft['effort'],
  heuristic: boolean,
  urls: string[],
  siteWide = false,
): FindingDraft {
  return { id, category, severity, title, evidence, fix, source, effort, heuristic, urls, siteWide };
}

export function readJsonLd(rawScripts: string[]): { errors: string[]; nodes: SchemaNode[]; types: string[] } {
  const errors: string[] = [];
  const nodes: SchemaNode[] = [];
  const types: string[] = [];

  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj['@graph'])) visit(obj['@graph']);
    const declared = obj['@type'];
    if (!declared) return;
    const list = (Array.isArray(declared) ? declared : [declared]).filter((item): item is string => typeof item === 'string');
    if (!list.length) return;
    types.push(...list.map(typeName));
    const keys = Object.keys(obj);
    let offersPrice = false;
    const offers = obj.offers;
    const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
    for (const offer of offerList) {
      if (!offer || typeof offer !== 'object') continue;
      const record = offer as Record<string, unknown>;
      if ('price' in record || 'lowPrice' in record || 'highPrice' in record || 'priceSpecification' in record) {
        offersPrice = true;
      }
    }
    let listItemsOk = true;
    if (list.some((type) => typeName(type) === 'BreadcrumbList')) {
      const items = obj.itemListElement;
      const arr = Array.isArray(items) ? items : items ? [items] : [];
      listItemsOk = arr.length > 0 && arr.every((item) => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Record<string, unknown>;
        return 'position' in record && ('name' in record || 'item' in record);
      });
    }
    nodes.push({ types: list, keys, offersPrice, listItemsOk });
  };

  rawScripts.forEach((raw, index) => {
    const text = raw.trim();
    if (!text) return;
    try {
      visit(JSON.parse(text));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'parse error';
      errors.push(`JSON-LD ${index + 1} 件目を読めません: ${message}`);
    }
  });

  return { errors, nodes, types };
}

export function isGenericAnchor(anchor: string): boolean {
  const normalized = anchor.replace(/\s+/g, ' ').trim().toLowerCase();
  return GENERIC_ANCHORS.has(normalized);
}

function headingSkips(headings: Array<{ tag: string }>): boolean {
  let previous = 0;
  for (const heading of headings) {
    const level = Number(heading.tag.replace(/\D/g, ''));
    if (!level) continue;
    if (previous && level > previous + 1) return true;
    previous = level;
  }
  return false;
}

function robotsNoindex(signals: PageSignals): boolean {
  const meta = `${signals.robotsMeta || ''} ${signals.googlebot || ''} ${signals.headers['x-robots-tag'] || ''}`.toLowerCase();
  return meta.includes('noindex');
}

export function collectPageFindings(signals: PageSignals): PageFindingResult {
  const findings: FindingDraft[] = [];
  const assessedIds: string[] = [];
  const assessedAreas = new Set<AuditArea>();
  const url = signals.url;
  const noindex = robotsNoindex(signals);
  const assess = (id: string, area: AuditArea) => {
    assessedIds.push(id);
    assessedAreas.add(area);
  };
  const add = (item: FindingDraft) => findings.push(item);

  assess('http_status', 'crawl');
  if (signals.httpStatus >= 400 || signals.httpStatus === 0) {
    add(finding('http_status', 'crawl', 'high', 'ページが HTTP エラーを返している', `ステータス ${signals.httpStatus || '取得失敗'}。`, '生きている URL に直すか、最も近いページへ恒久リダイレクトし、リンクを更新する。', SRC.http, 2, false, [url]));
  }

  assess('noindex', 'crawl');
  if (noindex) {
    add(finding('noindex', 'crawl', 'high', 'noindex で検索対象外になっている', 'meta robots、googlebot、または X-Robots-Tag に noindex がある。意図した設定か確認する。', '検索結果に出したいページからは noindex を外す。robots.txt で塞いだ URL には noindex は届かない。', SRC.noindex, 1, false, [url]));
  }

  assess('canonical_missing', 'crawl');
  assess('canonical_multiple', 'crawl');
  assess('canonical_relative', 'crawl');
  assess('canonical_elsewhere', 'crawl');
  if (signals.canonicals.length > 1) {
    add(finding('canonical_multiple', 'crawl', 'high', 'canonical が複数ある', `${signals.canonicals.length} 件の rel=canonical がある。`, '正規 URL は 1 つにし、href は絶対 URL にする。', SRC.canonical, 1, false, [url]));
  } else if (signals.canonicals.length === 0) {
    add(finding('canonical_missing', 'crawl', 'low', 'canonical がない', 'rel=canonical が無い。', 'このページ自身を指す絶対 URL の rel=canonical を置く。', SRC.canonical, 1, false, [url]));
  } else if (!/^https?:\/\//i.test(signals.canonicals[0])) {
    add(finding('canonical_relative', 'crawl', 'medium', 'canonical が相対 URL', `href は ${signals.canonicals[0]}。`, '絶対 URL にする。', SRC.canonical, 1, false, [url]));
  } else if (!sameUrl(signals.canonicals[0], url)) {
    add(finding('canonical_elsewhere', 'crawl', 'medium', 'canonical が別 URL を指している', `${url} → ${signals.canonicals[0]}`, '本当に重複ならそのままでよい。別のページなら自分自身を正規 URL にする。', SRC.canonical, 1, false, [url]));
  }

  if (signals.robots) {
    assess('robots_missing', 'crawl');
    assess('robots_blocks_site', 'crawl');
    assess('ai_bots_blocked', 'ai');
    if (!signals.robots.present && signals.robots.status === 404) {
      add(finding('robots_missing', 'crawl', 'low', 'robots.txt がない', 'サイト直下の robots.txt は 404。', 'クロールを許可し、Sitemap を書いた robots.txt をルートに置く。無くてもクロールはされる。', SRC.robots, 1, false, [new URL('/robots.txt', url).href], true));
    }
    if (signals.robots.disallowAll) {
      add(finding('robots_blocks_site', 'crawl', 'critical', 'robots.txt が検索クローラーをサイト全体で拒否している', `拒否: ${signals.robots.searchBotsBlocked.join(', ') || 'Googlebot'}。`, '検索に出したいなら、そのユーザーエージェントの Disallow: / を外す。', SRC.robots, 1, false, [new URL('/robots.txt', url).href], true));
    }
    if (signals.robots.aiBotsBlocked.length > 0) {
      add(finding('ai_bots_blocked', 'ai', 'info', '一部の AI クローラーを robots.txt で拒否している', `拒否: ${signals.robots.aiBotsBlocked.join(', ')}。Google-Extended の拒否は Google 検索の掲載には影響しない。`, '意図した拒否ならそのままでよい。検索向けの AI ボットを拒むと、その回答エンジンの対象外になることがある。', SRC.crawlers, 1, false, [new URL('/robots.txt', url).href], true));
    }
  }

  if (signals.sitemapStatus) {
    assess('sitemap_missing', 'crawl');
    assess('sitemap_not_in_robots', 'crawl');
    assess('sitemap_http_urls', 'crawl');
    if (signals.sitemapStatus !== 'found') {
      add(finding('sitemap_missing', 'crawl', 'medium', 'XML サイトマップが見つからない', 'robots.txt にも /sitemap.xml にも読めるサイトマップが無い。', 'インデックスさせたい正規 URL だけを絶対 URL で入れる。サイトマップはヒントであり、クロールも掲載も保証しない。', SRC.sitemap, 2, false, [new URL('/sitemap.xml', url).href], true));
    } else if (!signals.sitemapInRobots) {
      add(finding('sitemap_not_in_robots', 'crawl', 'low', 'robots.txt に Sitemap の記載がない', 'サイトマップ自体は取得できた。', 'robots.txt に Sitemap: 絶対 URL を書くと発見のヒントになる。', SRC.sitemap, 1, false, [new URL('/robots.txt', url).href], true));
    }
    if ((signals.sitemapHttpUrls || 0) > 0) {
      add(finding('sitemap_http_urls', 'crawl', 'medium', 'サイトマップに HTTP の URL がある', `${signals.sitemapHttpUrls} 件が http://。`, 'サイトマップには最終的な HTTPS の正規 URL だけを入れる。', SRC.sitemap, 1, false, [new URL('/sitemap.xml', url).href], true));
    }
  }

  assess('title_missing', 'onpage');
  assess('title_length', 'onpage');
  assess('multiple_titles', 'onpage');
  if (signals.titleCount > 1) {
    add(finding('multiple_titles', 'onpage', 'low', 'title 要素が複数ある', `${signals.titleCount} 件。`, 'head には title を 1 つだけ置く。', SRC.title, 1, false, [url]));
  }
  if (!signals.title) {
    add(finding('title_missing', 'onpage', 'high', 'title がない', 'title 要素が空、または無い。', 'そのページの内容が分かる固有の title を、本文と同じ言語で書く。', SRC.title, 1, false, [url]));
  } else if (signals.title.length < 15 || signals.title.length > 70) {
    add(finding('title_length', 'onpage', 'info', 'title がとても短い、またはとても長い', `${signals.title.length} 文字。Google は文字数の上限を定めておらず、表示幅で切る。`, '内容が伝わる短い題名にする。15〜70 文字は画面上の目安であり、合格ラインではない。文字数では減点しない。', SRC.title, 1, true, [url]));
  }

  assess('meta_missing', 'onpage');
  if (!signals.description) {
    add(finding('meta_missing', 'onpage', 'medium', 'meta description がない', 'meta name=description が無い。スニペットは主に本文から作られる。', '本文よりそのページを正確に説明できるときだけ、ページ固有の description を書く。文字数の枠では合否を付けない。', SRC.snippet, 1, false, [url]));
  }

  assess('h1_missing', 'onpage');
  assess('h1_multiple', 'onpage');
  assess('heading_skips', 'onpage');
  if (signals.h1Count === 0) {
    add(finding('h1_missing', 'onpage', 'medium', 'H1 がない', '可視の h1 が無い。見出しの個数は順位の固定条件ではない。', 'ページの主題が分かる見出しを 1 つ置く。これは編集上の目安。', SRC.starter, 1, true, [url]));
  } else if (signals.h1Count > 1) {
    add(finding('h1_multiple', 'onpage', 'low', 'H1 が複数ある', `${signals.h1Count} 件。複数 H1 自体は順位の減点条件ではない。`, '主見出しを 1 つにし、節は H2 以下にする、という編集上の目安。', SRC.starter, 1, true, [url]));
  }
  if (headingSkips(signals.headings)) {
    add(finding('heading_skips', 'onpage', 'low', '見出し階層が飛んでいる', '見出しレベルが 2 段以上飛んでいる。階層の順番は順位の固定条件ではない。', '読める順にネストする。編集上の目安。', SRC.starter, 1, true, [url]));
  }

  assess('lang_missing', 'onpage');
  if (!signals.lang) {
    add(finding('lang_missing', 'onpage', 'low', 'html の lang がない', 'html 要素に lang が無い。Google は lang では言語を判定しない。', '支援技術のためにページの言語を lang に書く。検索順位の条件ではない。', SRC.lang, 1, true, [url]));
  }

  assess('viewport_missing', 'onpage');
  if (!signals.viewport) {
    add(finding('viewport_missing', 'onpage', 'high', 'viewport が無い', 'meta name=viewport が無い。', 'width=device-width, initial-scale=1 を入れる。', SRC.mobile, 1, false, [url]));
  }

  assess('images_alt', 'onpage');
  if (signals.imagesMissingAlt > 0) {
    add(finding('images_alt', 'onpage', 'medium', 'alt 属性の無い画像がある', `${signals.imagesMissingAlt} 件に alt 属性自体が無い。装飾画像の空 alt は正しい。`, '情報を持つ画像には内容が分かる alt を付ける。装飾なら alt=""。', SRC.images, 2, false, [url]));
  }

  assess('generic_anchors', 'links');
  if (signals.genericAnchors.length > 0) {
    add(finding('generic_anchors', 'links', 'low', '中身の分からないアンカーがある', `例: ${signals.genericAnchors.slice(0, 6).join('、')}`, 'リンク先が分かる文言にする。', SRC.links, 1, false, [url]));
  }

  assess('thin_content', 'content');
  if (signals.textLength < 200) {
    add(finding('thin_content', 'content', 'low', '本文がとても短い', `本文の文字数は約 ${signals.textLength}。文字数は順位の条件ではない。`, 'そのページに必要な中身が足りないときだけ足す。短いページが適切な話題もある。', SRC.helpful, 3, true, [url]));
  }

  assess('images_dimensions', 'performance');
  if (signals.imagesMissingDimensions > 0) {
    add(finding('images_dimensions', 'performance', 'low', '幅と高さの無い画像がある', `${signals.imagesMissingDimensions} 件。読み込み中にレイアウトが動く原因になる。`, 'width と height を指定する。', SRC.cls, 1, false, [url]));
  }

  assess('slow_ttfb', 'performance');
  if (signals.responseTimeMs > 800) {
    add(finding('slow_ttfb', 'performance', 'medium', '最初の応答が遅い', `この 1 回の取得で ${signals.responseTimeMs} ms。フィールドの LCP ではない。`, 'キャッシュ、CDN、応答前の処理を見直す。合否は Search Console のフィールドデータで見る。', SRC.ttfb, 3, false, [url], true));
  }

  assess('heavy_html', 'performance');
  if (signals.pageSizeBytes > 500_000) {
    add(finding('heavy_html', 'performance', 'low', 'HTML がとても大きい', `${Math.round(signals.pageSizeBytes / 1024)} KB。500 KB 超は目安。`, '全ページに載せるインラインのデータとマークアップを削る。', SRC.cwv, 2, true, [url]));
  }

  assess('jsonld_errors', 'structured');
  assess('no_structured_data', 'structured');
  const checkedRichType = signals.schemaNodes.some((node) =>
    hasType(node, 'Product') || hasType(node, 'SoftwareApplication') || hasType(node, 'BreadcrumbList') || node.types.some((type) => LOCAL_TYPES.has(typeName(type))),
  );
  if (checkedRichType) assess('schema_required', 'structured');
  if (signals.schemaNodes.some((node) => hasType(node, 'FAQPage'))) assess('faq_rich_result_retired', 'structured');
  if (signals.jsonLdErrors.length > 0) {
    add(finding('jsonld_errors', 'structured', 'high', 'JSON-LD が壊れている', signals.jsonLdErrors.slice(0, 2).join(' / '), '見える内容と一致する JSON-LD に直す。', SRC.sd, 1, false, [url]));
  }
  if (signals.schemaNodes.length === 0 && signals.jsonLdErrors.length === 0) {
    add(finding('no_structured_data', 'structured', 'info', '構造化データが無い', 'JSON-LD が無い。生成 AI の検索結果に構造化データは必須ではない。', 'リッチリザルトに出したい型だけ、見える内容と一致させて追加する。無いこと自体は減点しない。', SRC.sd, 2, false, [url]));
  }

  const schemaProblems: string[] = [];
  for (const node of signals.schemaNodes) {
    const keys = new Set(node.keys);
    if (hasType(node, 'Product')) {
      const missing: string[] = [];
      if (!keys.has('name')) missing.push('name');
      if (!keys.has('offers') && !keys.has('review') && !keys.has('aggregateRating')) {
        missing.push('offers、review、aggregateRating のいずれか');
      }
      if (missing.length) schemaProblems.push(`Product に ${missing.join(' と ')} が無い`);
    }
    if (hasType(node, 'SoftwareApplication')) {
      const missing: string[] = [];
      if (!keys.has('name')) missing.push('name');
      if (!node.offersPrice) missing.push('offers.price');
      if (!keys.has('review') && !keys.has('aggregateRating')) missing.push('aggregateRating または review');
      if (missing.length) schemaProblems.push(`SoftwareApplication に ${missing.join(' と ')} が無い`);
    }
    if (hasType(node, 'BreadcrumbList') && !node.listItemsOk) {
      schemaProblems.push('BreadcrumbList の項目に position または name が無い');
    }
    if (node.types.some((type) => LOCAL_TYPES.has(typeName(type)))) {
      const missing = ['name', 'address'].filter((key) => !keys.has(key));
      if (missing.length) schemaProblems.push(`${node.types.map(typeName).join('/')} に推奨の ${missing.join(' と ')} が無い`);
    }
  }
  if (schemaProblems.length > 0) {
    const localOnly = schemaProblems.every((line) => line.includes('推奨の'));
    add(finding(
      'schema_required',
      'structured',
      'low',
      localOnly ? 'ローカルビジネスの推奨プロパティが足りない' : 'リッチリザルトに必要なプロパティが足りない',
      schemaProblems.slice(0, 4).join('。'),
      '足りないプロパティを、見える内容と一致させて足す。埋められないマークアップは外す。',
      schemaProblems.some((line) => line.startsWith('Product')) ? SRC.product : schemaProblems.some((line) => line.startsWith('Software')) ? SRC.software : schemaProblems.some((line) => line.startsWith('Breadcrumb')) ? SRC.breadcrumb : SRC.local,
      1,
      localOnly,
      [url],
    ));
  }
  if (signals.schemaNodes.some((node) => hasType(node, 'FAQPage'))) {
    add(finding('faq_rich_result_retired', 'structured', 'info', 'FAQ リッチリザルトは終了している', 'FAQPage がある。2026年5月以降、Google 検索の FAQ リッチリザルトは表示されない。', '他の利用者のために残すのはよい。検索結果の FAQ 表示は期待しない。', SRC.faqNews, 1, false, [url]));
  }

  assess('og_missing', 'structured');
  if (!signals.ogTitle || !signals.ogImage) {
    add(finding('og_missing', 'structured', 'low', 'Open Graph の title または image がない', 'SNS やチャットのプレビュー用。Google 検索の順位条件ではない。', 'og:title と絶対 URL の og:image を置く。', SRC.og, 1, true, [url]));
  }

  assess('hreflang_self', 'structured');
  if (signals.hreflangCount > 0 && !signals.hreflangSelf) {
    add(finding('hreflang_self', 'structured', 'medium', 'hreflang に自分自身が無い', `${signals.hreflangCount} 件の alternate があるが、この URL 自身が含まれない。`, '各言語版に自分自身と、対になる戻りリンクを書く。', SRC.hreflang, 2, false, [url]));
  }

  assess('no_https', 'security');
  if (!signals.https) {
    add(finding('no_https', 'security', 'high', 'HTTPS で配信されていない', '取得した URL のスキームが https ではない。', 'HTTPS で配信し、HTTP からは恒久リダイレクトする。', SRC.https, 2, false, [url], true));
  }

  if (signals.headersKnown) {
    const headerNames = new Set(Object.keys(signals.headers));
    assess('hsts_missing', 'security');
    assess('security_headers', 'security');
    if (signals.https && !headerNames.has('strict-transport-security')) {
      add(finding('hsts_missing', 'security', 'low', 'HSTS が無い', 'Strict-Transport-Security が応答に無い。', 'HTTPS が全ページで安定してから HSTS を送る。', SRC.hsts, 1, false, [url], true));
    }
    const missingHeaders: string[] = [];
    if (!headerNames.has('x-content-type-options')) missingHeaders.push('X-Content-Type-Options');
    if (!headerNames.has('referrer-policy')) missingHeaders.push('Referrer-Policy');
    const csp = signals.headers['content-security-policy'] || '';
    if (!headerNames.has('x-frame-options') && !/frame-ancestors/i.test(csp)) {
      missingHeaders.push('X-Frame-Options または CSP frame-ancestors');
    }
    if (missingHeaders.length > 0) {
      add(finding('security_headers', 'security', 'low', '一般的なセキュリティヘッダーが無い', `無いもの: ${missingHeaders.join('、')}。検索順位の条件ではない。`, `${missingHeaders.join('、')} を応答に付ける。`, SRC.headers, 1, false, [url], true));
    }
  }

  assess('mixed_content', 'security');
  if (signals.mixedContent.length > 0) {
    add(finding('mixed_content', 'security', 'high', 'HTTPS ページが HTTP リソースを読んでいる', signals.mixedContent.slice(0, 3).join('、'), '画像もスクリプトも HTTPS で読む。', SRC.mixed, 1, false, [url]));
  }

  assess('favicon_missing', 'security');
  if (!signals.favicon) {
    add(finding('favicon_missing', 'security', 'low', 'favicon の指定が無い', 'rel=icon が無い。', '検索結果の横に出る favicon を link rel=icon で指定する。', SRC.favicon, 1, false, [url]));
  }

  return { findings, assessedIds, assessedAreas: [...assessedAreas], noindex };
}
