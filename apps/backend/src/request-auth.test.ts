import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenFromAuthorizationHeader, tokenFromCookieHeader } from './request-auth.js';

test('extracts bearer tokens without passing the scheme into session verification', () => {
  assert.equal(tokenFromAuthorizationHeader('Bearer seo_token_123'), 'seo_token_123');
  assert.equal(tokenFromAuthorizationHeader('bearer   seo_token_456  '), 'seo_token_456');
});

test('does not treat malformed authorization values as session tokens', () => {
  assert.equal(tokenFromAuthorizationHeader('seo_token_123'), undefined);
  assert.equal(tokenFromAuthorizationHeader('Bearer   '), undefined);
});

test('reads encoded cookies and safely ignores malformed values', () => {
  assert.equal(tokenFromCookieHeader('theme=dark; seo_auth_token=seo_token_%E3%81%82', 'seo_auth_token'), 'seo_token_あ');
  assert.equal(tokenFromCookieHeader('seo_auth_token=%E0%A4%A', 'seo_auth_token'), undefined);
});
