import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('global metadata exposes descriptive search and social metadata', () => {
  const layout = read('apps/frontend/src/app/layout.tsx');
  assert.match(layout, /無料SEO診断・サイトマップ・AI検索対策ツール/);
  assert.match(layout, /openGraph:/);
  assert.match(layout, /twitter:/);
  assert.match(layout, /'@type': 'WebSite'/);
  assert.match(layout, /'@type': 'WebApplication'/);
});

test('public tools have unique canonical metadata', () => {
  const llms = read('apps/frontend/src/app/tools/llms-txt/layout.tsx');
  const sitemap = read('apps/frontend/src/app/tools/sitemap-analyzer/layout.tsx');
  const google = read('apps/frontend/src/app/google/hub/layout.tsx');
  const crawl = read('apps/frontend/src/app/crawl/new/layout.tsx');

  assert.match(llms, /canonical: '\/tools\/llms-txt'/);
  assert.match(sitemap, /canonical: '\/tools\/sitemap-analyzer'/);
  assert.match(google, /canonical: '\/google\/hub'/);
  assert.match(crawl, /canonical: '\/crawl\/new'/);
});

test('private workflow pages explicitly remain noindex', () => {
  for (const path of [
    'apps/frontend/src/app/login/layout.tsx',
    'apps/frontend/src/app/account/layout.tsx',
    'apps/frontend/src/app/admin/layout.tsx',
    'apps/frontend/src/app/projects/layout.tsx',
    'apps/frontend/src/app/audit/layout.tsx',
  ]) {
    assert.match(read(path), /index: false/);
  }
});

test('guides provide unique metadata, article schema and internal tool links', () => {
  const hub = read('apps/frontend/src/app/guides/page.tsx');
  const article = read('apps/frontend/src/app/_components/GuideArticle.tsx');
  const diagnosis = read('apps/frontend/src/app/guides/seo-diagnosis/page.tsx');
  const llms = read('apps/frontend/src/app/guides/llms-txt/page.tsx');
  const sitemap = read('apps/frontend/src/app/guides/xml-sitemap/page.tsx');

  assert.match(hub, /SEOガイド/);
  assert.match(article, /'@type': 'Article'/);
  assert.match(article, /'@type': 'BreadcrumbList'/);
  assert.match(diagnosis, /canonical: '\/guides\/seo-diagnosis'/);
  assert.match(llms, /canonical: '\/guides\/llms-txt'/);
  assert.match(sitemap, /canonical: '\/guides\/xml-sitemap'/);
  assert.match(llms, /toolHref="\/tools\/llms-txt"/);
  assert.match(sitemap, /toolHref="\/tools\/sitemap-analyzer"/);
});

test('sitemap includes the guides and public analysis pages', () => {
  const sitemap = read('apps/frontend/src/app/sitemap.ts');
  for (const path of [
    '/guides',
    '/guides/seo-diagnosis',
    '/guides/llms-txt',
    '/guides/xml-sitemap',
    '/google/hub',
    '/crawl/new',
  ]) {
    assert.ok(sitemap.includes(path), `missing sitemap path: ${path}`);
  }
});

test('home and tools hub link to SEO guide content', () => {
  const home = read('apps/frontend/src/app/_components/HomeStaticContent.tsx');
  const tools = read('apps/frontend/src/app/tools/page.tsx');
  assert.match(home, /href="\/guides"/);
  assert.match(home, /href="\/guides\/seo-diagnosis"/);
  assert.match(tools, /href="\/guides\/llms-txt"/);
});

test('canonical site URL is documented for production configuration', () => {
  assert.match(read('.env.example'), /NEXT_PUBLIC_SITE_URL="https:\/\/seo\.n-n\.tokyo"/);
});
