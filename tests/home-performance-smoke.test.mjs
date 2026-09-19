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

test('Google Hub uses current Gemini label and explains sparse GSC data', () => {
  const hub = read('apps/frontend/src/app/google/hub/page.tsx');
  assert.doesNotMatch(hub, />2\.5 Flash</);
  assert.match(hub, />3\.8 Flash</);
  assert.match(hub, /Search Consoleのデータ量がまだ少ない状態です/);
  assert.match(hub, /hubData\?\.errors\.gemini/);
});
