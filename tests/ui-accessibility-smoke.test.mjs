import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('landing page exposes a mobile navigation and URL-specific audit input', () => {
  const page = read('apps/frontend/src/app/_components/HomeInteractive.tsx');
  assert.match(page, /aria-controls="mobile-navigation"/);
  assert.match(page, /id="mobile-navigation"/);
  assert.match(page, /id="audit-url"/);
  assert.match(page, /type="url"/);
  assert.match(page, /role="tablist"/);
  assert.match(page, /aria-selected=/);
});

test('interactive landing KPI cards are keyboard-operable buttons', () => {
  const page = read('apps/frontend/src/app/_components/HomeInteractive.tsx');
  assert.match(page, /aria-label="総合診断を表示"/);
  assert.match(page, /aria-label="AEOとLLMOの診断を表示"/);
  assert.doesNotMatch(page, /<div\s+\n\s+onClick=\{\(\) => setActiveTab/);
});

test('registration password guidance matches the backend requirement', () => {
  const login = read('apps/frontend/src/app/login/page.tsx');
  assert.match(login, /minLength=\{mode === 'register' \? 10 : undefined\}/);
  assert.match(login, /10文字以上の安全なパスワード/);
  assert.match(login, /current-password/);
  assert.match(login, /new-password/);
});

test('global accessibility preferences are represented', () => {
  const css = read('apps/frontend/src/app/globals.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
