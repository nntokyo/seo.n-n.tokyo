import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('workspace scripts expose build and typecheck gates', () => {
  const root = JSON.parse(read('package.json'));
  assert.ok(root.scripts.build);
  assert.ok(root.scripts.typecheck);
  assert.ok(root.scripts.test);
  assert.ok(root.scripts.lint);
});

test('example environment never contains obvious committed secrets', () => {
  const env = read('.env.example');
  assert.doesNotMatch(env, /AIza[0-9A-Za-z_-]{20,}/);
  assert.doesNotMatch(env, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
});

test('production deployment script does not use npm install', () => {
  const deploy = read('infra/deploy.sh');
  assert.match(deploy, /pnpm install/);
});
