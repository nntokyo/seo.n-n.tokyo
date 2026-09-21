import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('frontend is upgraded to a patched Next.js 16 release with a pinned pnpm runtime', () => {
  const root = JSON.parse(read('package.json'));
  const frontend = JSON.parse(read('apps/frontend/package.json'));

  assert.equal(root.packageManager, 'pnpm@12.5.1');
  assert.match(frontend.dependencies.next, /^16\./);
  assert.equal(frontend.dependencies['@next/third-parties'], frontend.dependencies.next);
});

test('same-origin API and SSE calls are proxied in development and preview environments', () => {
  const config = read('apps/frontend/next.config.ts');

  assert.match(config, /INTERNAL_API_URL/);
  assert.match(config, /source: '\/api\/:path\*'/);
  assert.match(config, /source: '\/sse\/:path\*'/);
  assert.match(config, /destination: `\$\{internalApiUrl\}\/api\/:path\*`/);
});

test('alert settings test endpoint matches the endpoint offered by the backend', () => {
  const page = read('apps/frontend/src/app/settings/alerts/page.tsx');
  const server = read('apps/backend/src/server.ts');

  assert.match(page, /\/api\/v1\/settings\/alerts\/test/);
  assert.match(server, /fastify\.post\('\/api\/v1\/settings\/alerts\/test'/);
});

test('backend parses bearer tokens before session verification', () => {
  const server = read('apps/backend/src/server.ts');
  const auth = read('apps/backend/src/request-auth.ts');

  assert.match(server, /tokenFromAuthorizationHeader\(request\.headers\.authorization\)/);
  assert.match(auth, /\^Bearer\\s\+\(\.\+\)\$\/i/);
});
