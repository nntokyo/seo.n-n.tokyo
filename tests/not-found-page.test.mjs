import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('custom 404 handles route-level and globally unmatched URLs', () => {
  const notFound = fs.readFileSync('apps/frontend/src/app/not-found.tsx', 'utf8');
  const globalNotFound = fs.readFileSync('apps/frontend/src/app/global-not-found.tsx', 'utf8');
  const content = fs.readFileSync('apps/frontend/src/app/_components/NotFoundContent.tsx', 'utf8');
  const nextConfig = fs.readFileSync('apps/frontend/next.config.ts', 'utf8');
  const sitemap = fs.readFileSync('apps/frontend/src/app/sitemap.ts', 'utf8');

  assert.match(notFound, /NotFoundContent/);
  assert.match(globalNotFound, /<html lang="ja" className="dark">/);
  assert.match(globalNotFound, /<NotFoundContent \/>/);
  assert.match(globalNotFound, /import '\.\/globals\.css'/);
  assert.match(nextConfig, /globalNotFound:\s*true/);

  assert.match(content, /HTTP 404/);
  assert.match(content, /ページが見つかりません/);
  assert.match(content, /href="\/"|href='\/'/);
  assert.match(content, /href="\/tools"|href='\/tools'/);
  assert.match(content, /href="\/#audit-input"|href='\/#audit-input'/);
  assert.doesNotMatch(content, /window\.location|router\.push|redirect\(/);
  assert.doesNotMatch(sitemap, /\/404|not-found/);
});
