import test from 'node:test';
import assert from 'node:assert/strict';
import type { FullAuditResult } from '@seo/shared';
import { evaluateAuditWithJev, validateGeminiProposalWithJev, type JevConfig } from './jev.js';

function auditFixture(): FullAuditResult {
  return {
    id: 'audit_test',
    url: 'https://example.com/',
    timestamp: new Date(0).toISOString(),
    httpStatus: 200,
    responseTimeMs: 120,
    pageSizeBytes: 1024,
    overallScore: 72,
    scores: {
      seo: 72,
      performance: 90,
      meta: 70,
      aeo_llmo: 68,
      security: 100,
    },
    metrics: [
      {
        id: 'META-003',
        name: 'Canonicalタグの未設定',
        category: 'technical',
        score: 60,
        status: 'warning',
        message: 'Canonicalタグが設定されていません。',
      },
      {
        id: 'SEC-001',
        name: 'HTTPS',
        category: 'security',
        score: 100,
        status: 'good',
        message: 'HTTPSです。',
      },
    ],
    meta: {
      title: 'Example',
      description: 'Example page',
      canonical: null,
      robots: null,
      googlebot: null,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      twitterCard: null,
      viewport: 'width=device-width',
      charset: 'utf-8',
      lang: 'ja',
      schemaTypes: [],
      h1Count: 1,
      headings: [{ tag: 'h1', text: 'Example' }],
      wordCount: 500,
      imageCount: 0,
      missingAltCount: 0,
    },
    links: [],
    cwv: {
      fcp: 100,
      lcp: 300,
      cls: 0.02,
      ttfb: 120,
      totalSizeKb: 1,
    },
    aiOverview: {
      summary: 'summary',
      answerabilityScore: 70,
      citations: [],
      recommendations: [],
    },
  };
}

const enabledConfig: JevConfig = {
  enabled: true,
  apiKey: 'test-key',
  model: 'jev-latest',
  timeoutMs: 2_000,
  minConfidence: 0.7,
};

test('disabled Jev leaves the deterministic audit unchanged', async () => {
  const original = auditFixture();
  let called = false;

  const result = await evaluateAuditWithJev(original, {
    config: { ...enabledConfig, enabled: false },
    fetcher: (async () => {
      called = true;
      throw new Error('should not run');
    }) as typeof fetch,
  });

  assert.equal(called, false);
  assert.equal(result, original);
  assert.equal(result.metrics[0].aiDecision, undefined);
});

test('Jev shadow response adds metadata without changing rule severity or score', async () => {
  const original = auditFixture();

  const result = await evaluateAuditWithJev(original, {
    config: enabledConfig,
    fetcher: (async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'));
      assert.equal(body.model, 'jev-latest');
      assert.match(body.state, /META-003/);
      assert.doesNotMatch(body.state, /test-key/);

      return new Response(JSON.stringify({
        model: 'jev-latest',
        answers: {
          issue_0_priority: {
            type: 'choice',
            choice: 'high',
            probabilities: { critical: 0.1, high: 0.8, medium: 0.09, low: 0.01 },
            confidence: 0.9,
          },
          issue_0_generate: {
            type: 'noul',
            noul: 0.9,
          },
          issue_0_risk: {
            type: 'score',
            score: 1.2,
            confidence: 0.85,
          },
        },
        usage: { input_tokens: 100, output_tokens: 10 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch,
  });

  assert.equal(result.metrics[0].status, 'warning');
  assert.equal(result.metrics[0].score, 60);
  assert.deepEqual(result.metrics[0].aiDecision, {
    provider: 'jev',
    priority: 'high',
    shouldGenerateWithGemini: true,
    regressionRisk: 1.2,
    confidence: 0.8,
  });
  assert.equal(result.metrics[1].aiDecision, undefined);
  assert.equal(original.metrics[0].aiDecision, undefined);
  assert.equal(result.jevShadow?.evaluatedCount, 1);
  assert.equal(result.jevShadow?.geminiCandidateCount, 1);
  assert.equal(result.jevShadow?.lowConfidenceCount, 0);
  assert.equal(result.jevShadow?.averageConfidence, 0.8);
  assert.equal(result.jevShadow?.model, 'jev-latest');
  assert.ok((result.jevShadow?.latencyMs ?? -1) >= 0);
});

test('Jev HTTP failure fails open and preserves the audit', async () => {
  const original = auditFixture();

  const result = await evaluateAuditWithJev(original, {
    config: enabledConfig,
    fetcher: (async () => new Response('rate limited', { status: 429 })) as typeof fetch,
  });

  assert.equal(result, original);
  assert.equal(result.metrics[0].aiDecision, undefined);
});

test('malformed Jev answers are ignored instead of corrupting metrics', async () => {
  const original = auditFixture();

  const result = await evaluateAuditWithJev(original, {
    config: enabledConfig,
    fetcher: (async () => new Response(JSON.stringify({
      model: 'jev-latest',
      answers: {
        issue_0_priority: { type: 'choice', choice: 'high' },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch,
  });

  assert.equal(result.metrics[0].aiDecision, undefined);
  assert.equal(result.metrics[0].status, 'warning');
});

test('low-confidence Jev result never recommends Gemini generation', async () => {
  const result = await evaluateAuditWithJev(auditFixture(), {
    config: { ...enabledConfig, minConfidence: 0.9 },
    fetcher: (async () => new Response(JSON.stringify({
      model: 'jev-latest',
      answers: {
        issue_0_priority: {
          type: 'choice',
          choice: 'high',
          probabilities: { critical: 0.1, high: 0.8, medium: 0.09, low: 0.01 },
          confidence: 0.8,
        },
        issue_0_generate: { type: 'noul', noul: 0.95 },
        issue_0_risk: { type: 'score', score: 1, confidence: 0.85 },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch,
  });

  assert.equal(result.metrics[0].aiDecision?.shouldGenerateWithGemini, false);
  assert.equal(result.metrics[0].status, 'warning');
  assert.equal(result.jevShadow?.lowConfidenceCount, 1);
  assert.equal(result.jevShadow?.geminiCandidateCount, 0);
});

test('Gemini validation is fail-open when disabled', async () => {
  const proposal = {
    summary: 'summary',
    strengths: [],
    actionItems: [],
    titleProposals: [],
    generatedAt: new Date(0).toISOString(),
  };

  const result = await validateGeminiProposalWithJev(
    { targetUrl: 'https://example.com' },
    proposal,
    {
      config: enabledConfig,
      enabled: false,
      fetcher: (async () => {
        throw new Error('should not run');
      }) as typeof fetch,
    },
  );

  assert.equal(result, undefined);
});

test('Gemini validation returns typed advisory metadata', async () => {
  const proposal = {
    summary: 'Improve metadata and performance.',
    strengths: ['Fast response'],
    actionItems: [{
      title: 'Add canonical',
      priority: 'high' as const,
      impact: 'Reduce duplicate URL ambiguity',
      suggestion: 'Add a canonical URL',
    }],
    titleProposals: ['Example title'],
    generatedAt: new Date(0).toISOString(),
  };

  const result = await validateGeminiProposalWithJev(
    { targetUrl: 'https://example.com', psiPerfScore: 80 },
    proposal,
    {
      config: enabledConfig,
      enabled: true,
      fetcher: (async () => new Response(JSON.stringify({
        model: 'jev-latest',
        answers: {
          addresses_input: { type: 'noul', noul: 0.9 },
          seo_regression: { type: 'noul', noul: 0.2 },
          action: {
            type: 'choice',
            choice: 'accept_with_warning',
            probabilities: {
              accept: 0.2,
              accept_with_warning: 0.7,
              needs_review: 0.09,
              reject: 0.01,
            },
            confidence: 0.88,
          },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch,
    },
  );

  assert.equal(result?.action, 'accept_with_warning');
  assert.equal(result?.addressesInputProbability, 0.9);
  assert.equal(result?.seoRegressionProbability, 0.2);
  assert.equal(result?.confidence, 0.6);
  assert.ok((result?.latencyMs ?? -1) >= 0);
});

test('Gemini validation provider failure preserves Gemini output by returning undefined', async () => {
  const proposal = {
    summary: 'summary',
    strengths: [],
    actionItems: [],
    titleProposals: [],
    generatedAt: new Date(0).toISOString(),
  };

  const result = await validateGeminiProposalWithJev(
    { targetUrl: 'https://example.com' },
    proposal,
    {
      config: enabledConfig,
      enabled: true,
      fetcher: (async () => new Response('unavailable', { status: 503 })) as typeof fetch,
    },
  );

  assert.equal(result, undefined);
});
