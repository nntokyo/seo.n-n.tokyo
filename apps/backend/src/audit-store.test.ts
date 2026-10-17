import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { FullAuditResult } from '@seo/shared';
import { createAuditStore, generateAuditId, isValidAuditId } from './audit-store.js';

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'audit-store-test-'));
}

function sampleAudit(id: string): FullAuditResult {
  return { id, url: 'https://example.com/', timestamp: new Date(0).toISOString() } as unknown as FullAuditResult;
}

test('new audit IDs are long random values and keep the existing URL-safe format', () => {
  const ids = new Set(Array.from({ length: 200 }, () => generateAuditId()));
  assert.equal(ids.size, 200);
  for (const id of ids) {
    assert.ok(isValidAuditId(id), id);
    assert.match(id, /^audit_[0-9a-z]+_[0-9A-Za-z_-]{24,}$/);
  }
});

test('accepts legacy IDs and rejects path-like or malformed IDs', () => {
  assert.equal(isValidAuditId('audit_mtzidvh1_sa4l5'), true);
  assert.equal(isValidAuditId('audit_mtzidvh1_s'), true);
  for (const bad of ['', 'audit_', '../audit_x_y', 'audit_x_y/../../z', 'audit_x_y.json', 'proj_abc', 'audit_x_y\u0000', 'a'.repeat(200)]) {
    assert.equal(isValidAuditId(bad), false, bad);
  }
  assert.equal(isValidAuditId(undefined), false);
});

test('owned results are readable only by the owner', () => {
  const store = createAuditStore({ dir: tempDir() });
  const id = generateAuditId();
  store.save(sampleAudit(id), 'user_owner');

  const own = store.readForUser(id, 'user_owner');
  assert.ok(own);
  assert.equal(own.id, id);
  assert.equal(store.readForUser(id, 'user_other'), null);
  assert.equal(store.readForUser(id, undefined), null);
});

test('owner information is never included in returned results', () => {
  const store = createAuditStore({ dir: tempDir() });
  const id = generateAuditId();
  const returned = store.save(sampleAudit(id), 'user_owner');
  assert.equal(JSON.stringify(returned).includes('user_owner'), false);
  assert.equal(JSON.stringify(store.readForUser(id, 'user_owner')).includes('user_owner'), false);
});

test('anonymous results stay readable by anyone who has the link', () => {
  const store = createAuditStore({ dir: tempDir() });
  const id = generateAuditId();
  store.save(sampleAudit(id), undefined);
  assert.ok(store.readForUser(id, undefined));
  assert.ok(store.readForUser(id, 'user_any'));
});

test('ownership survives a restart (reload from disk)', () => {
  const dir = tempDir();
  const id = generateAuditId();
  createAuditStore({ dir }).save(sampleAudit(id), 'user_owner');

  const reloaded = createAuditStore({ dir });
  assert.ok(reloaded.readForUser(id, 'user_owner'));
  assert.equal(reloaded.readForUser(id, 'user_other'), null);
});

test('legacy results without stored owner fall back to the project history owner', () => {
  const dir = tempDir();
  const ownedLegacy = 'audit_mtzuxyqq_v8tbp';
  const anonymousLegacy = 'audit_mtzidvh1_sa4l5';
  fs.writeFileSync(path.join(dir, `${ownedLegacy}.json`), JSON.stringify(sampleAudit(ownedLegacy)));
  fs.writeFileSync(path.join(dir, `${anonymousLegacy}.json`), JSON.stringify(sampleAudit(anonymousLegacy)));

  const store = createAuditStore({
    dir,
    findLegacyOwner: (auditId) => (auditId === ownedLegacy ? 'user_owner' : undefined),
  });

  // 既存の共有 URL: 所有者の結果は本人だけ、未ログインで作られた結果は従来どおり開ける
  assert.ok(store.readForUser(ownedLegacy, 'user_owner'));
  assert.equal(store.readForUser(ownedLegacy, 'user_other'), null);
  assert.equal(store.readForUser(ownedLegacy, undefined), null);
  assert.ok(store.readForUser(anonymousLegacy, undefined));
});

test('a result evicted from memory is still checked against its owner on disk', () => {
  const dir = tempDir();
  const store = createAuditStore({ dir, maxCached: 1 });
  const first = generateAuditId();
  store.save(sampleAudit(first), 'user_owner');
  store.save(sampleAudit(generateAuditId()), undefined);

  assert.equal(store.readForUser(first, 'user_other'), null);
  assert.ok(store.readForUser(first, 'user_owner'));
});

test('malformed IDs never touch the filesystem outside the store', () => {
  const root = tempDir();
  const dir = path.join(root, 'audits');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(root, 'secret.json'), JSON.stringify({ id: 'x', url: 'https://secret.example/' }));
  const store = createAuditStore({ dir });

  assert.equal(store.readForUser('../secret', undefined), null);
  assert.equal(store.has('../secret'), false);
  assert.throws(() => store.save(sampleAudit('../evil'), undefined));
  assert.equal(fs.existsSync(path.join(root, 'evil.json')), false);
});

test('readInternal returns stored results without owner fields for already-authorized callers', () => {
  const store = createAuditStore({ dir: tempDir() });
  const id = generateAuditId();
  store.save(sampleAudit(id), 'user_owner');
  const internal = store.readInternal(id);
  assert.ok(internal);
  assert.equal(JSON.stringify(internal).includes('user_owner'), false);
  assert.equal(store.readInternal('../x'), null);
});

test('an ID that differs only in letter case does not open another stored result', () => {
  const dir = tempDir();
  const legacy = 'audit_mtzidvh1_sa4l5';
  fs.writeFileSync(path.join(dir, `${legacy}.json`), JSON.stringify(sampleAudit(legacy)));
  const store = createAuditStore({ dir, findLegacyOwner: (auditId) => (auditId === legacy ? 'user_owner' : undefined) });

  // 大文字小文字を区別しない FS でも別表記では読めない (存在しない扱い)
  assert.equal(store.readForUser('audit_mtzidvh1_SA4L5', undefined), null);
  assert.equal(store.has('audit_mtzidvh1_SA4L5'), false);
  assert.equal(store.readForUser(legacy, 'user_other'), null);
});

test('saving under an ID that differs only in letter case never overwrites another result', () => {
  const dir = tempDir();
  const legacy = 'audit_mtzidvh1_sa4l5';
  fs.writeFileSync(path.join(dir, `${legacy}.json`), JSON.stringify(sampleAudit(legacy)));
  const store = createAuditStore({ dir });
  const variant = 'audit_mtzidvh1_SA4L5';
  const caseInsensitiveFs = fs.existsSync(path.join(dir, `${variant}.json`));
  if (caseInsensitiveFs) {
    assert.throws(() => store.save(sampleAudit(variant), 'user_other'));
  } else {
    store.save(sampleAudit(variant), 'user_other');
  }
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, `${legacy}.json`), 'utf8')).id, legacy);
});
