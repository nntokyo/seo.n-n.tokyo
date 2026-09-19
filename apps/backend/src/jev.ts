import type { AiDecisionMetadata, FullAuditResult } from '@seo/shared';

const JEV_API_URL = 'https://api.typesafe.ai/v1/systemone';
const DEFAULT_MODEL = 'jev-latest';
const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_MIN_CONFIDENCE = 0.7;
const MAX_SHADOW_ISSUES = 6;

type FetchLike = typeof fetch;

interface JevConfig {
  enabled: boolean;
  apiKey?: string;
  model: string;
  timeoutMs: number;
  minConfidence: number;
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

  try {
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

    if (!response.ok) return result;

    const payload = await response.json() as JevResponse;
    if (!payload || typeof payload !== 'object' || !payload.answers || typeof payload.answers !== 'object') {
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
        shouldGenerateWithGemini: noulProbability >= 0.5,
        regressionRisk: clampRisk(risk.score),
        confidence,
      };

      nextMetrics[metricIndex].aiDecision = decision;
    });

    return {
      ...result,
      metrics: nextMetrics,
    };
  } catch {
    return result;
  }
}
