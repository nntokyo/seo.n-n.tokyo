import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewSiteSecurity } from './security-review.js';

test('flags missing hardening headers without exposing cookie values', () => {
  const result = reviewSiteSecurity({
    url: 'https://example.com/login?token=secret',
    responseHeaders: {
      'content-type': 'text/html; charset=utf-8',
      'set-cookie': 'session=super-secret; Path=/',
      'x-powered-by': 'Example',
    },
    setCookieHeaders: ['session=super-secret; Path=/'],
    html: '<html><body><input type="password"></body></html>',
    contentType: 'text/html',
  });

  assert.equal(result.url, 'https://example.com/login');
  assert.ok(result.findings.some((finding) => finding.id === 'SEC-CSP-001' && finding.status === 'warning'));
  assert.ok(result.findings.some((finding) => finding.id === 'SEC-COOKIE-002'));
  assert.ok(result.findings.some((finding) => finding.id === 'SEC-COOKIE-003'));
  assert.ok(result.findings.some((finding) => finding.id === 'SEC-COOKIE-004'));
  assert.equal(JSON.stringify(result).includes('super-secret'), false);
});

test('does not mark unassessed HTML as a pass', () => {
  const result = reviewSiteSecurity({
    url: 'https://example.com/data.json',
    responseHeaders: {
      'content-type': 'application/json',
      'strict-transport-security': 'max-age=31536000',
      'content-security-policy': "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
    html: '',
    contentType: 'application/json',
  });

  const htmlFinding = result.findings.find((finding) => finding.id === 'SEC-HTML-000');
  assert.ok(htmlFinding);
  assert.equal(htmlFinding?.status, 'unassessed');
  assert.equal(htmlFinding?.assessed, false);
  assert.ok(result.summary.unassessed >= 1);
});

test('detects dangerous passive CORS signals and HTTP password forms', () => {
  const cors = reviewSiteSecurity({
    url: 'https://example.com',
    responseHeaders: {
      'content-type': 'text/html',
      'access-control-allow-origin': '*',
      'access-control-allow-credentials': 'true',
    },
    html: '<html></html>',
  });
  assert.ok(cors.findings.some((finding) => finding.id === 'SEC-CORS-001' && finding.severity === 'high'));

  const http = reviewSiteSecurity({
    url: 'http://example.com/login',
    responseHeaders: { 'content-type': 'text/html' },
    html: '<form><input type="password"></form>',
  });
  assert.ok(http.findings.some((finding) => finding.id === 'SEC-HTML-002' && finding.severity === 'critical'));
  assert.equal(http.findings.find((finding) => finding.id === 'SEC-HDR-001')?.status, 'unassessed');
});

test('strong baseline receives a high score', () => {
  const result = reviewSiteSecurity({
    url: 'https://example.com',
    responseHeaders: {
      'content-type': 'text/html',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'content-security-policy': "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    },
    html: '<html><body><h1>ok</h1></body></html>',
  });

  assert.ok(result.score >= 90);
  assert.equal(result.grade, 'A');
});
