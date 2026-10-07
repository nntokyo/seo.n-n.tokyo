import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('custom 404 page provides recovery navigation without becoming a sitemap URL', () => {
  const notFound = fs.readFileSync('apps/frontend/src/app/not-found.tsx', 'utf8');
  const sitemap = fs.readFileSync('apps/frontend/src/app/sitemap.ts', 'utf8');

  assert.match(notFound, /HTTP 404/);
  assert.match(notFound, /ページが見つかりません/);
  assert.match(notFound, /href="\/"|href='\/'/);
  assert.match(notFound, /href="\/tools"|href='\/tools'/);
  assert.match(notFound, /href="\/#audit-input"|href='\/#audit-input'/);
  assert.doesNotMatch(notFound, /window\.location|router\.push|redirect\(/);
  assert.doesNotMatch(sitemap, /\/404|not-found/);
});
