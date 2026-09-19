# Jev Shadow Evaluation

## Purpose

TypeSafe AI Jev is integrated as an optional, non-blocking decision layer for SEO audit findings.

The deterministic analyzer remains the source of truth for metric score, severity, and aggregate audit scores. Jev never overwrites those values.

## Current flow

```text
HTML / Sitemap
      |
      v
Deterministic SEO analyzer
      |
      +---------------------> persisted audit result
      |
      v
Optional Jev shadow evaluation
      |
      v
AuditMetric.aiDecision
```

The current implementation does not gate or suppress Gemini calls. `shouldGenerateWithGemini` is advisory shadow data only.

## API

The integration follows TypeSafe AI's System One HTTP API:

- https://docs.typesafe.ai/introduction/quickstart
- `POST https://api.typesafe.ai/v1/systemone`
- Bearer authentication
- default model: `jev-latest`

A single request evaluates up to six warning/critical findings. Each finding uses three atomic questions:

1. Choice: practical backlog priority
2. Noul: whether a bespoke Gemini proposal is likely to add value
3. Score: implementation regression risk

## Configuration

```env
JEV_ENABLED="false"
TYPESAFE_API_KEY=""
JEV_MODEL="jev-latest"
JEV_TIMEOUT_MS="2000"
JEV_MIN_CONFIDENCE="0.70"
```

Jev is disabled by default. Both `JEV_ENABLED=true` and `TYPESAFE_API_KEY` are required before external requests are made.

## Failure behavior

The integration is fail-open. The original deterministic audit result is returned unchanged when Jev is disabled, the key is missing, the provider returns non-2xx, the response is malformed, or the request times out/fails.

## Data minimization

Raw HTML is not sent. The state contains only selected extracted SEO information:

- target URL
- title / description / canonical
- word count
- schema types
- HTTP status / response time
- selected rule id/category/status/score/message
- whether an existing deterministic proposal exists

Do not add passwords, cookies, session tokens, API keys, or arbitrary form values.

## Confidence

Choice and Score expose confidence directly. Noul exposes a probability, so the implementation derives certainty from its distance from 0.5.

Metric confidence is the minimum of the three values.

`shouldGenerateWithGemini` is true only when the Noul probability is at least 0.5 and combined confidence meets `JEV_MIN_CONFIDENCE`. It remains advisory in shadow mode.

## UI

The detailed audit report shows a separate "Jev shadow" block with AI priority, confidence, regression risk, and whether bespoke Gemini generation appears valuable.

## Production enablement

1. Set `TYPESAFE_API_KEY`.
2. Keep `JEV_ENABLED=false` during configuration/deploy.
3. Verify `/api/health` reports `jevShadowEnabled: false`.
4. Set `JEV_ENABLED=true`.
5. Reload/deploy backend.
6. Verify `jevShadowEnabled: true`.
7. Run several audits and compare Jev metadata with deterministic findings before enabling any future gating.

## Testing

CI uses mocked HTTP responses only and never calls the TypeSafe API.

Covered cases:
- disabled mode
- valid Choice / Noul / Score response
- HTTP 429 fail-open
- malformed response
- low-confidence suppression


## Observability

The backend health endpoint exposes non-sensitive process-local Jev counters:

- calls
- successes
- fallbacks
- averageLatencyMs

Each audit that receives valid Jev decisions also stores a `jevShadow` summary with:

- evaluatedCount
- geminiCandidateCount
- lowConfidenceCount
- averageConfidence
- latencyMs
- model
- generatedAt

These values are intended for shadow evaluation and rollout decisions, not SEO scoring.
