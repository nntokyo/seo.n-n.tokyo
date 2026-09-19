import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('hero avoids stale or guarantee-like copy', () => {
  const page = read('apps/frontend/src/app/page.tsx');
  assert.doesNotMatch(page, /完全対応/);
  assert.doesNotMatch(page, /最も引用される/);
  assert.doesNotMatch(page, /3秒で/);
  assert.match(page, /無料で診断を開始/);
});

test('dense desktop navigation waits until xl breakpoint', () => {
  const page = read('apps/frontend/src/app/page.tsx');
  assert.match(page, /hidden xl:flex items-center gap-/);
  assert.match(page, /xl:hidden inline-flex h-9 w-9/);
});

test('Google Hub uses current Gemini model label', () => {
  const hub = read('apps/frontend/src/app/google/hub/page.tsx');
  assert.doesNotMatch(hub, /Gemini 2\.0/);
  assert.match(hub, /Gemini 3\.8 Flash/);
});

test('global font stack includes Japanese fallbacks', () => {
  const css = read('apps/frontend/src/app/globals.css');
  assert.match(css, /Hiragino Sans/);
  assert.match(css, /BIZ UDPGothic/);
  assert.match(css, /Noto Sans JP/);
});
