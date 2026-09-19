import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('homepage navigation uses a compact tools hub entry', () => {
  const page = read('apps/frontend/src/app/page.tsx');
  assert.match(page, /href="\/tools"/);
  assert.match(page, />ツール<\/span>/);
  assert.match(page, />Google連携<\/span>/);
  assert.match(page, />プロジェクト<\/span>/);
  assert.doesNotMatch(page, /<nav className="hidden xl:flex[\s\S]{0,2000}>llms\.txt生成/);
});

test('tools hub groups public product capabilities by user goal', () => {
  const page = read('apps/frontend/src/app/tools/page.tsx');
  assert.match(page, /まず診断/);
  assert.match(page, /技術SEO/);
  assert.match(page, /AI検索対応/);
  assert.match(page, /継続運用/);
  assert.match(page, /\/tools\/sitemap-analyzer/);
  assert.match(page, /\/tools\/llms-txt/);
  assert.match(page, /\/crawl\/new/);
  assert.match(page, /\/google\/hub/);
  assert.match(page, /\/projects/);
});

test('public content tools have explicit separated ad placements', () => {
  const ad = read('apps/frontend/src/app/_components/AdSenseUnit.tsx');
  const llms = read('apps/frontend/src/app/tools/llms-txt/page.tsx');
  const sitemap = read('apps/frontend/src/app/tools/sitemap-analyzer/page.tsx');
  const tools = read('apps/frontend/src/app/tools/page.tsx');

  assert.match(ad, /data-ad-placement=/);
  assert.match(ad, /aria-label="広告"/);
  assert.match(ad, /min-h-\[140px\]/);
  assert.match(ad, /if \(!isConfigured\) return null/);
  assert.match(llms, /placement="tool-content"/);
  assert.match(sitemap, /placement="tool-content"/);
  assert.match(tools, /placement="tools"/);
});

test('tools hub is included in sitemap', () => {
  const sitemap = read('apps/frontend/src/app/sitemap.ts');
  assert.match(sitemap, /\$\{baseUrl\}\/tools`/);
});
