import type { AiDecisionMetadata, FullAuditResult, GeminiProposalData, JevGeminiValidation } from '@seo/shared';

const JEV_API_URL = 'https://api.typesafe.ai/v1/systemone';
const DEFAULT_MODEL = 'jev-latest';
const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_MIN_CONFIDENCE = 0.7;
const MAX_SHADOW_ISSUES = 6;

type FetchLike = typeof fetch;

export interface JevConfig {
  enabled: boolean;
  apiKey?: string;
  model: string;
  timeoutMs: number;
  minConfidence: number;
}

interface JevRuntimeStats {
  calls: number;
  successes: number;
  fallbacks: number;
  totalLatencyMs: number;
}

const runtimeStats: JevRuntimeStats = {
  calls: 0,
  successes: 0,
  fallbacks: 0,
  totalLatencyMs: 0,
};

export function getJevRuntimeStats() {
  return {
    calls: runtimeStats.calls,
    successes: runtimeStats.successes,
    fallbacks: runtimeStats.fallbacks,
    averageLatencyMs: runtimeStats.successes
      ? Math.round(runtimeStats.totalLatencyMs / runtimeStats.successes)
      : 0,
  };
}

interface JevChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

interface JevScoreAnswer {
  type: 'score';
  score: number;
  confidence: number;
}

interface JevNoulAnswer {
  type: 'noul';
  noul: number;
}

interface JevResponse {
  model: string;
  answers: Record<string, JevChoiceAnswer | JevScoreAnswer | JevNoulAnswer>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export function getJevConfig(): JevConfig {
  const timeout = Number(process.env.JEV_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const minConfidence = Number(process.env.JEV_MIN_CONFIDENCE || DEFAULT_MIN_CONFIDENCE);
  return {
    enabled: process.env.JEV_ENABLED === 'true',
    apiKey: process.env.TYPESAFE_API_KEY,
    model: process.env.JEV_MODEL || DEFAULT_MODEL,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
    minConfidence: Number.isFinite(minConfidence) && minConfidence >= 0 && minConfidence <= 1
      ? minConfidence
      : DEFAULT_MIN_CONFIDENCE,
  };
}

function isChoiceAnswer(value: unknown): value is JevChoiceAnswer {
  if (!value || typeof value !== 'object') return false;
  const answer = value as Record<string, unknown>;
  return answer.type === 'choice'
    && typeof answer.choice === 'string'
    && typeof answer.confidence === 'number'
    && answer.probabilities !== null
    && typeof answer.probabilities === 'object';
}

function isScoreAnswer(value: unknown): value is JevScoreAnswer {
  if (!value || typeof value !== 'object') return false;
  const answer = value as Record<string, unknown>;
  return answer.type === 'score'
    && typeof answer.score === 'number'
    && typeof answer.confidence === 'number';
}

function isNoulAnswer(value: unknown): value is JevNoulAnswer {
  if (!value || typeof value !== 'object') return false;
  const answer = value as Record<string, unknown>;
  return answer.type === 'noul' && typeof answer.noul === 'number';
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampRisk(value: number): number {
  return Math.min(2, Math.max(0, value));
}

function buildState(result: FullAuditResult, selectedIndexes: number[]): string {
  const selectedIssues = selectedIndexes.map((index) => {
    const metric = result.metrics[index];
    return {
      index,
      id: metric.id,
      category: metric.category,
      ruleStatus: metric.status,
      ruleScore: metric.score,
      message: metric.message,
      hasProposal: Boolean(metric.proposal || metric.codeDiff),
    };
  });

  return JSON.stringify({
    page: {
      url: result.url,
      title: result.meta.title,
      description: result.meta.description,
      canonical: result.meta.canonical,
      wordCount: result.meta.wordCount,
      schemaTypes: result.meta.schemaTypes,
      responseTimeMs: result.responseTimeMs,
      httpStatus: result.httpStatus,
    },
    issues: selectedIssues,
    instruction:
      'Evaluate prioritization metadata only. Do not reinterpret or override deterministic SEO rule severity or score.',
  });
}

function buildQuestions(result: FullAuditResult, selectedIndexes: number[]) {
  const questions: Record<string, unknown> = {};

  selectedIndexes.forEach((metricIndex, questionIndex) => {
    const metric = result.metrics[metricIndex];
    const prefix = `issue_${questionIndex}`;
    const subject = `SEO issue ${metric.id}: ${metric.name}`;

    questions[`${prefix}_priority`] = {
      type: 'choice',
      instructions: `Prioritize ${subject} for a practical SEO engineering backlog. Respect the deterministic rule result in state; this is an additional prioritization judgment, not a severity override.`,
      criteria: {
        critical: 'Act immediately because user/search visibility risk is severe and remediation should be first.',
        high: 'Material SEO or user impact; schedule near-term remediation.',
        medium: 'Useful improvement but not urgent or blocking.',
        low: 'Minor optimization or low expected practical impact.',
      },
    };

    questions[`${prefix}_generate`] = {
      type: 'noul',
      instructions: `Would ${subject} materially benefit from a bespoke Gemini-generated explanation or code suggestion instead of the existing deterministic/template proposal?`,
    };

    questions[`${prefix}_risk`] = {
      type: 'score',
      instructions: `Estimate implementation regression risk for ${subject} if an engineer applies an AI-generated fix.`,
      criteria: [
        'Low risk: localized change with little chance of SEO or UX regression.',
        'Review recommended: context-dependent change that should be checked before deployment.',
        'High risk: could materially affect canonicalization, crawling, rendering, structured data, UX, or site behavior.',
      ],
    };
  });

  return questions;
}

export async function evaluateAuditWithJev(
  result: FullAuditResult,
  options?: {
    config?: JevConfig;
    fetcher?: FetchLike;
  },
): Promise<FullAuditResult> {
  const config = options?.config || getJevConfig();
  if (!config.enabled || !config.apiKey) return result;

  const selectedIndexes = result.metrics
    .map((metric, index) => ({ metric, index }))
    .filter(({ metric }) => metric.status === 'critical' || metric.status === 'warning')
    .sort((a, b) => {
      const rank = { critical: 0, warning: 1, notice: 2, good: 3 } as const;
      return rank[a.metric.status] - rank[b.metric.status] || a.metric.score - b.metric.score;
    })
    .slice(0, MAX_SHADOW_ISSUES)
    .map(({ index }) => index);

  if (selectedIndexes.length === 0) return result;

  const fetcher = options?.fetcher || fetch;
  runtimeStats.calls += 1;

  try {
    const startedAt = Date.now();
    const response = await fetcher(JEV_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state: buildState(result, selectedIndexes),
        model: config.model,
        questions: buildQuestions(result, selectedIndexes),
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) {
      runtimeStats.fallbacks += 1;
      return result;
    }

    const payload = await response.json() as JevResponse;
    if (!payload || typeof payload !== 'object' || !payload.answers || typeof payload.answers !== 'object') {
      runtimeStats.fallbacks += 1;
      return result;
    }

    const nextMetrics = result.metrics.map((metric) => ({ ...metric }));

    selectedIndexes.forEach((metricIndex, questionIndex) => {
      const prefix = `issue_${questionIndex}`;
      const priority = payload.answers[`${prefix}_priority`];
      const generate = payload.answers[`${prefix}_generate`];
      const risk = payload.answers[`${prefix}_risk`];

      if (!isChoiceAnswer(priority) || !isNoulAnswer(generate) || !isScoreAnswer(risk)) return;
      if (!['critical', 'high', 'medium', 'low'].includes(priority.choice)) return;

      const noulProbability = clamp01(generate.noul);
      const noulConfidence = Math.abs(noulProbability - 0.5) * 2;
      const confidence = Math.min(
        clamp01(priority.confidence),
        clamp01(risk.confidence),
        clamp01(noulConfidence),
      );

      const decision: AiDecisionMetadata = {
        provider: 'jev',
        priority: priority.choice as AiDecisionMetadata['priority'],
        shouldGenerateWithGemini: noulProbability >= 0.5 && confidence >= config.minConfidence,
        regressionRisk: clampRisk(risk.score),
        confidence,
      };

      nextMetrics[metricIndex].aiDecision = decision;
    });

    const decisions = nextMetrics
      .map((metric) => metric.aiDecision)
      .filter((decision): decision is AiDecisionMetadata => Boolean(decision));
    const evaluatedCount = decisions.length;
    const averageConfidence = evaluatedCount
      ? decisions.reduce((sum, decision) => sum + decision.confidence, 0) / evaluatedCount
      : 0;

    const latencyMs = Date.now() - startedAt;
    runtimeStats.successes += 1;
    runtimeStats.totalLatencyMs += latencyMs;

    return {
      ...result,
      metrics: nextMetrics,
      jevShadow: {
        provider: 'jev',
        model: payload.model || config.model,
        evaluatedCount,
        geminiCandidateCount: decisions.filter((decision) => decision.shouldGenerateWithGemini).length,
        lowConfidenceCount: decisions.filter((decision) => decision.confidence < config.minConfidence).length,
        averageConfidence,
        latencyMs,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch {
    runtimeStats.fallbacks += 1;
    return result;
  }
}


export async function validateGeminiProposalWithJev(
  context: Record<string, unknown>,
  proposal: GeminiProposalData,
  options?: {
    config?: JevConfig;
    fetcher?: FetchLike;
    enabled?: boolean;
  },
): Promise<JevGeminiValidation | undefined> {
  const config = options?.config || getJevConfig();
  const enabled = options?.enabled ?? process.env.JEV_VALIDATE_GEMINI_OUTPUT === 'true';
  if (!enabled || !config.enabled || !config.apiKey) return undefined;

  const fetcher = options?.fetcher || fetch;
  runtimeStats.calls += 1;
  const startedAt = Date.now();

  try {
    const response = await fetcher(JEV_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        state: JSON.stringify({
          context,
          proposal: {
            summary: proposal.summary,
            strengths: proposal.strengths,
            actionItems: proposal.actionItems,
            titleProposals: proposal.titleProposals,
            metaDescriptionProposal: proposal.metaDescriptionProposal,
          },
          instruction:
            'Validate the Gemini proposal conservatively. Do not rewrite it. Evaluate whether it addresses the supplied SEO/performance context and whether applying it could introduce SEO regressions.',
        }),
        questions: {
          addresses_input: {
            type: 'noul',
            instructions: 'Does the proposed output materially address the supplied diagnostic context?',
          },
          seo_regression: {
            type: 'noul',
            instructions: 'Could applying this proposal plausibly introduce a material SEO, crawling, canonicalization, structured-data, rendering, or UX regression?',
          },
          action: {
            type: 'choice',
            instructions: 'Choose the safest presentation state for this generated proposal.',
            criteria: {
              accept: 'Proposal directly addresses the context and shows low regression risk.',
              accept_with_warning: 'Proposal is useful but should be presented with a caution.',
              needs_review: 'Proposal is plausible but requires human review before use.',
              reject: 'Proposal does not address the context or presents substantial regression risk.',
            },
          },
        },
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) {
      runtimeStats.fallbacks += 1;
      return undefined;
    }

    const payload = await response.json() as JevResponse;
    const addresses = payload?.answers?.addresses_input;
    const regression = payload?.answers?.seo_regression;
    const action = payload?.answers?.action;

    if (!isNoulAnswer(addresses) || !isNoulAnswer(regression) || !isChoiceAnswer(action)) {
      runtimeStats.fallbacks += 1;
      return undefined;
    }
    if (!['accept', 'accept_with_warning', 'needs_review', 'reject'].includes(action.choice)) {
      runtimeStats.fallbacks += 1;
      return undefined;
    }

    const addressesProbability = clamp01(addresses.noul);
    const regressionProbability = clamp01(regression.noul);
    const confidence = Math.min(
      clamp01(action.confidence),
      clamp01(Math.abs(addressesProbability - 0.5) * 2),
      clamp01(Math.abs(regressionProbability - 0.5) * 2),
    );
    const latencyMs = Date.now() - startedAt;

    runtimeStats.successes += 1;
    runtimeStats.totalLatencyMs += latencyMs;

    return {
      provider: 'jev',
      action: action.choice as JevGeminiValidation['action'],
      addressesInputProbability: addressesProbability,
      seoRegressionProbability: regressionProbability,
      confidence,
      latencyMs,
    };
  } catch {
    runtimeStats.fallbacks += 1;
    return undefined;
  }
}
