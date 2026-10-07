import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('security review is explicit, passive, and indexed as a public tool', () => {
  const page = fs.readFileSync('apps/frontend/src/app/tools/security-review/page.tsx', 'utf8');
  const server = fs.readFileSync('apps/backend/src/server.ts', 'utf8');
  const sitemap = fs.readFileSync('apps/frontend/src/app/sitemap.ts', 'utf8');

  assert.match(page, /fetch\('\/api\/v1\/tools\/security-review'/);
  assert.doesNotMatch(page, /useEffect\s*\(/);
  assert.match(server, /safeFetchUrl\(targetUrl/);
  assert.match(server, /maxBytes:\s*2 \* 1024 \* 1024/);
  assert.match(server, /maxRedirects:\s*5/);
  assert.match(server, /allowSecurityReview/);
  assert.match(sitemap, /\/tools\/security-review/);
});
