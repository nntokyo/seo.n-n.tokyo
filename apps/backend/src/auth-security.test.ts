import test from 'node:test';
import assert from 'node:assert/strict';
import { generateVerificationCode } from './auth.js';

test('verification codes are six decimal digits', () => {
  for (let i = 0; i < 100; i++) {
    assert.match(generateVerificationCode(), /^\d{6}$/);
  }
});

test('verification code generation is not constant', () => {
  const codes = new Set(Array.from({ length: 20 }, () => generateVerificationCode()));
  assert.ok(codes.size > 1);
});
