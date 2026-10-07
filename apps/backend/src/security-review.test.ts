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
  assert.ok(cors.findings.some((finding) => finding.id === 'SEC-CORS-001' && finding.severity === 'medium' && finding.status === 'warning'));

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
  assert.equal(result.findings.find((finding) => finding.id === 'SEC-THREAT-001')?.status, 'unassessed');
});


test('uses the final redirected URL and actual request count', () => {
  const result = reviewSiteSecurity({
    requestedUrl: 'http://example.com/start?token=secret',
    url: 'https://www.example.com/final?redirect_token=hidden',
    requestCount: 3,
    responseHeaders: {
      'content-type': 'text/html',
      'strict-transport-security': 'max-age=31536000',
      'content-security-policy': "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
    html: '<html></html>',
  });

  assert.equal(result.url, 'https://www.example.com/final');
  assert.equal(result.scope.requestCount, 3);
  assert.match(
    result.findings.find((finding) => finding.id === 'SEC-TRANSPORT-001')?.evidence || '',
    /HTTP URLはHTTPSへリダイレクト/,
  );
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.equal(JSON.stringify(result).includes('hidden'), false);
});

test('parses CSP tokens at directive boundaries and rejects permissive framing', () => {
  const result = reviewSiteSecurity({
    url: 'https://example.com',
    responseHeaders: {
      'content-type': 'text/html',
      'content-security-policy': "default-src *; script-src 'self' 'unsafe-inline'; frame-ancestors *",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'unsafe-url',
    },
    html: '<html></html>',
  });

  assert.ok(result.findings.some((finding) => finding.id === 'SEC-CSP-003' && finding.status === 'warning'));
  assert.ok(result.findings.some((finding) => finding.id === 'SEC-CSP-004' && finding.status === 'warning'));
  assert.ok(result.findings.some((finding) => finding.id === 'SEC-HDR-005' && finding.status === 'warning'));
  assert.ok(result.findings.some((finding) => finding.id === 'SEC-HDR-003' && finding.status === 'warning'));
});


test('covers informational HTML hardening without overstating risk', () => {
  const result = reviewSiteSecurity({
    url: 'https://example.com',
    responseHeaders: {
      'content-type': 'text/html',
      'content-security-policy': "default-src 'self'; script-src 'self' 'nonce-abc' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
    setCookieHeaders: ['theme=dark; Secure; SameSite=Lax'],
    html: '<html><head><link rel="stylesheet" href="https://cdn.example.net/app.css"></head><body><a target="_blank" href="https://other.example">open</a></body></html>',
  });

  assert.ok(result.findings.some((finding) => finding.id === 'SEC-CSP-003' && finding.severity === 'info'));
  assert.ok(result.findings.some((finding) => finding.id === 'SEC-COOKIE-003' && finding.severity === 'low'));
  assert.ok(result.findings.some((finding) => finding.id === 'SEC-HTML-004' && finding.severity === 'info'));
  assert.ok(result.findings.some((finding) => finding.id === 'SEC-HTML-005' && finding.severity === 'info'));
});
