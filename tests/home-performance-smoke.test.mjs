import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('homepage shell remains a server component', () => {
  const page = read('apps/frontend/src/app/page.tsx');
  assert.doesNotMatch(page, /['"]use client['"]/);
  assert.match(page, /HomeInteractive/);
  assert.match(page, /HomeStaticContent/);
});

test('only interactive homepage component is client-side', () => {
  const interactive = read('apps/frontend/src/app/_components/HomeInteractive.tsx');
  const staticContent = read('apps/frontend/src/app/_components/HomeStaticContent.tsx');

  assert.match(interactive, /^['"]use client['"]/);
  assert.doesNotMatch(staticContent, /^['"]use client['"]/);
  assert.doesNotMatch(staticContent, /auditResult/);
  assert.match(staticContent, /home-deferred-content/);
});

test('AdSense does not block first render', () => {
  const layout = read('apps/frontend/src/app/layout.tsx');
  assert.doesNotMatch(layout, /strategy="beforeInteractive"/);
  assert.match(layout, /strategy="lazyOnload"/);
});

test('AdSense stays below the fold and outside the deferred container', () => {
  const page = read('apps/frontend/src/app/page.tsx');
  const staticContent = read('apps/frontend/src/app/_components/HomeStaticContent.tsx');

  // ファーストビューを描画するclient componentより後ろに静的コンテンツを置く。
  const interactiveIndex = page.indexOf('<HomeInteractive');
  const staticIndex = page.indexOf('<HomeStaticContent');
  assert.ok(interactiveIndex >= 0 && staticIndex >= 0);
  assert.ok(interactiveIndex < staticIndex, 'static AdSense content must stay below the interactive hero');

  // content-visibility: auto の内側では広告コードが要素サイズを取得できないため、外側に置く。
  const adIndex = staticContent.indexOf('<AdSenseUnit');
  const deferredIndex = staticContent.indexOf('className="home-deferred-content"');
  assert.ok(adIndex >= 0 && deferredIndex >= 0);
  assert.ok(adIndex < deferredIndex, 'AdSenseUnit must be rendered outside .home-deferred-content');
});

test('Google Hub uses current Gemini label and explains sparse GSC data', () => {
  const hub = read('apps/frontend/src/app/google/hub/page.tsx');
  assert.doesNotMatch(hub, />2\.5 Flash</);
  assert.match(hub, />3\.8 Flash</);
  assert.match(hub, /Search Consoleのデータ量がまだ少ない状態です/);
  assert.match(hub, /hubData\?\.errors\.gemini/);
  // データ不足の判定基準をマジックナンバーで散らさない。
  assert.match(hub, /const SPARSE_GSC_IMPRESSION_THRESHOLD = 20;/);
  assert.match(hub, /gsc\.totalImpressions < SPARSE_GSC_IMPRESSION_THRESHOLD/);
});
