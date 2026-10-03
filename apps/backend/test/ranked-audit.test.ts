import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeHtml } from '../src/analyzer.ts';
import { sitemapNextSample } from '../src/sitemap.ts';
import { AuditArea } from '@seo/shared';
import { buildActionPlan, FindingDraft } from '../src/ranked-audit.ts';
import { inspectRobots } from '../src/robots.ts';

const ALL_AREAS: AuditArea[] = ['crawl', 'onpage', 'content', 'links', 'structured', 'ai', 'performance', 'security'];

const base = (over: Partial<FindingDraft>): FindingDraft => ({
  id: 'sample',
  category: 'onpage',
  severity: 'high',
  title: 'sample',
  evidence: 'evidence',
  fix: 'fix',
  source: 'https://developers.google.com/search/docs/appearance/title-link',
  effort: 1,
  heuristic: false,
  urls: ['https://example.com/'],
  ...over,
});

test('empty findings score 100 and do not invent a cap', () => {
  const plan = buildActionPlan([], {
    https: true,
    robotsBlocksAll: false,
    noindex: false,
    pageCount: 1,
    assessedIds: [],
    assessedAreas: ALL_AREAS,
    partialReasons: [],
  });
  assert.equal(plan.overall, 100);
  assert.deepEqual(plan.caps, []);
  assert.equal(plan.areas.every((area) => area.score === 100), true);
});

test('info does not deduct and https caps the score', () => {
  const plan = buildActionPlan(
    [base({ id: 'note', severity: 'info', category: 'ai' })],
    {
      https: false,
      robotsBlocksAll: false,
      noindex: false,
      pageCount: 1,
      assessedIds: ['note'],
      assessedAreas: ['ai'],
      partialReasons: [],
    },
  );
  assert.equal(plan.overall, 60);
  assert.equal(plan.areas.find((area) => area.id === 'ai')?.score, 100);
  assert.equal(plan.actions[0].impact, 0);
});

test('robots block caps at 20 even when the rest is clean', () => {
  const plan = buildActionPlan([], {
    https: true,
    robotsBlocksAll: true,
    noindex: false,
    pageCount: 1,
    assessedIds: [],
    assessedAreas: ALL_AREAS,
    partialReasons: [],
  });
  assert.equal(plan.overall, 20);
});

test('a single high finding is P1 with impact 100', () => {
  const plan = buildActionPlan([base({ id: 'title_missing' })], {
    https: true,
    robotsBlocksAll: false,
    noindex: false,
    pageCount: 1,
    assessedIds: ['title_missing', 'viewport_missing'],
    assessedAreas: ['onpage'],
    partialReasons: ['single page'],
  });
  assert.equal(plan.actions[0].priority, 'P1');
  assert.equal(plan.actions[0].impact, 100);
  assert.equal(plan.actions[0].quickWin, true);
  assert.deepEqual(plan.passed, ['viewport_missing']);
  assert.equal(plan.partial, true);
  const onpage = plan.areas.find((area) => area.id === 'onpage');
  assert.equal(onpage?.deduction, 12);
  assert.ok((onpage?.score ?? 100) === 88);
});

test('robots.txt most specific agent wins', () => {
  const open = inspectRobots(200, 'User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nAllow: /\n');
  assert.equal(open.disallowAll, false);
  const closed = inspectRobots(200, 'User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nDisallow: /\n');
  assert.equal(closed.disallowAll, true);
  assert.deepEqual(closed.searchBotsBlocked, ['googlebot']);
  const missing = inspectRobots(404, '');
  assert.equal(missing.present, false);
});

test('page rules follow Google docs rather than character-limit failures', () => {
  const html = `<!doctype html><html><head>
    <title>${'長い題名'.repeat(20)}</title>
    <meta name="description" content="説明">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="canonical" href="https://example.com/">
    <link rel="icon" href="/favicon.ico">
    <script type="application/ld+json">{ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [] }</script>
    <script type="application/ld+json">{ broken</script>
  </head><body>
    <h1>主題</h1>
    <p>${'本文です。'.repeat(80)}</p>
    <img src="/a.png" alt="">
    <img src="http://cdn.example.com/b.png" alt="写真">
    <a href="/next">こちら</a>
  </body></html>`;
  const result = analyzeHtml('https://example.com/', html, 120, 200, {
    'strict-transport-security': 'max-age=60',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'DENY',
  });
  const ids = result.actionPlan?.actions.map((action) => action.id) ?? [];
  assert.equal(ids.includes('title_length'), true);
  assert.equal(result.actionPlan?.actions.find((action) => action.id === 'title_length')?.heuristic, true);
  assert.equal(result.actionPlan?.actions.find((action) => action.id === 'title_length')?.severity, 'info');
  assert.equal(ids.includes('meta_missing'), false);
  assert.equal(ids.includes('images_alt'), false);
  assert.equal(ids.includes('jsonld_errors'), true);
  assert.equal(ids.includes('faq_rich_result_retired'), true);
  assert.equal(result.actionPlan?.actions.find((action) => action.id === 'faq_rich_result_retired')?.severity, 'info');
  assert.equal(ids.includes('generic_anchors'), true);
  assert.equal(ids.includes('mixed_content'), true);
  assert.equal(ids.includes('hsts_missing'), false);
  const titleMetric = result.metrics.find((metric) => metric.id === 'CONT-002');
  assert.equal(titleMetric?.status, 'notice');
  assert.match(titleMetric?.message ?? '', /文字数の上限を定めておらず/);
  const snippet = result.metrics.find((metric) => metric.id === 'AIO-001');
  assert.equal(snippet?.status, 'notice');
  assert.notEqual(snippet?.status, 'critical');
  const jsonLd = result.metrics.find((metric) => metric.id === 'TRUST-001');
  assert.equal(jsonLd?.status, 'notice');
  assert.doesNotMatch(jsonLd?.message ?? '', /ナレッジグラフ|エンティティの認識に最適/);
  const response = result.metrics.find((metric) => metric.id === 'CWV-001');
  assert.equal(response?.status, 'notice');
  assert.doesNotMatch(response?.message ?? '', /LCP悪化|主原因/);
  assert.equal(result.cwv.lcp, null);
  assert.equal(result.cwv.cls, null);
  assert.equal(result.actionPlan?.actions.find((action) => action.id === 'no_structured_data')?.severity, undefined);
});

test('observational rows do not grade citation or escape code samples', () => {
  const html = `<!doctype html><html><head>
    <title>${'題名'.repeat(20)}</title>
    <link rel="canonical" href="https://example.com/a" />
    <link rel="canonical" href="https://example.com/b" />
  </head><body><h1>主題</h1><ul><li>一つ</li></ul></body></html>`;
  const result = analyzeHtml('https://example.com/a?q="1"', html, 900, 200);
  const list = result.metrics.find((metric) => metric.id === 'AEO-002');
  assert.equal(list?.status, 'notice');
  assert.doesNotMatch(list?.message ?? '', /LLM|引用しやすい/);
  const missingSchema = result.metrics.find((metric) => metric.id === 'TRUST-001');
  assert.equal(missingSchema?.codeDiff, undefined);
  const canonicalLine = result.metrics.find((metric) => metric.id === 'META-001')?.codeDiff?.after.match(/canonical: (.+),/)?.[1];
  assert.equal(canonicalLine ? JSON.parse(canonicalLine) : '', 'https://example.com/a?q="1"');
  const bare = analyzeHtml('https://example.com/x', '<!doctype html><html><head><title>十分な長さの題名です</title></head><body><h1>主題</h1></body></html>', 100, 200);
  assert.equal(bare.actionPlan?.actions.find((action) => action.id === 'no_structured_data')?.severity, 'info');
  const marked = analyzeHtml('https://example.com/', '<!doctype html><html><head><title>十分な長さの題名です</title><meta name="robots" content="max-snippet:-1, max-image-preview:large"></head><body><h1>主題</h1></body></html>', 100, 200);
  assert.equal(marked.metrics.find((metric) => metric.id === 'AIO-001')?.status, 'notice');
  assert.equal(marked.aiOverview.answerabilityScore, undefined);
  const sample = sitemapNextSample([{ loc: 'https://example.com/a?q="1"', lastmod: '2026-01-01' }]);
  assert.match(sample ?? '', /q=\\"1\\"/);
  assert.doesNotMatch(sample ?? '', /llms-txt|priority:|changeFrequency:/);
  assert.equal(sitemapNextSample([]), undefined);
  assert.match(bare.metrics.find((metric) => metric.id === 'META-003')?.codeDiff?.after ?? '', /&quot;|href="https:\/\/example.com\/x"/);
});

test('missing title is high and noindex caps the score', () => {
  const html = '<!doctype html><html lang="ja"><head><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>x</h1><p>十分な本文がここにあります。検索に出したくないページの例です。文字数を稼ぐための文章です。</p></body></html>';
  const result = analyzeHtml('https://example.com/hidden', html, 100, 200, {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'x-frame-options': 'SAMEORIGIN',
    'strict-transport-security': 'max-age=60',
  });
  assert.equal(result.actionPlan?.actions.find((action) => action.id === 'title_missing')?.severity, 'high');
  assert.ok((result.actionPlan?.overall ?? 100) <= 40);
  assert.equal(result.overallScore, result.actionPlan?.overall);
});
