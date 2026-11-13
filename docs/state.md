# ContribPilot state

## Repo layout

contribpilot/
├─ apps/
│  ├─ web/       Next.js 15 App Router, tRPC v11, Tailwind v4, Auth.js, SSE, BullMQ client, GitHub App client
│  └─ worker/    BullMQ workers (analysis, draft, pr), analyzer + AI + patch pipeline
├─ packages/
│  ├─ config/            Zod schema, defaults, env loading, redaction
│  ├─ shared/            AppError, domain schemas, SSE event schemas, job schemas
│  ├─ db/                Drizzle schema, client, migrations, queries
│  ├─ github/            URL parser, Octokit clients (read, App, installation), GitProvider
│  ├─ analyzers/         Analyzer contract, labeled-issues, docs-gaps, community-files, registry
│  ├─ ai/                GroqProvider, prompts, tasks, cache, limiter, budget
│  ├─ ranking/           Scoring, duplicate detection, opportunity builder
│  ├─ guide/             Deterministic PR guide generator
│  ├─ patch/             Parse, build, apply, policy, secrets, validate
│  ├─ guardrails/        GR-1, GR-4, GR-5, GR-6, GR-8
│  └─ token-encryption/  AES-256-GCM
├─ docs/                 decisions.md, progress.md, state.md
├─ .github/workflows/    ci.yml
├─ docker-compose.yml    postgres:16, redis:7
├─ pnpm-workspace.yaml, turbo.json, tsconfig.base.json, biome.json, vitest.config.mts
└─ .env.example

## Local services
Docker Compose: Postgres 16 on `127.0.0.1:5432`, Redis 7 on `127.0.0.1:6379`.
Native Windows `postgresql-x64-18` disabled so Docker owns 5432.
`.env` uses `127.0.0.1`, not `localhost`.

## Commands

Install: `pnpm install`
Typecheck: `pnpm typecheck`
Test: `pnpm test`
Lint: `pnpm lint`

DB generate: `pnpm --filter @contribpilot/db db:generate`
DB migrate: `pnpm --filter @contribpilot/db db:migrate:script`
DB studio: `pnpm --filter @contribpilot/db db:studio`

Web dev: `pnpm --filter @contribpilot/web dev`
Worker dev: `pnpm --filter @contribpilot/worker dev`

Docker start/stop: `docker compose start` / `docker compose stop`

## Environment keys

App: `NEXT_PUBLIC_APP_URL`, `APP_NAME`, `SUPPORT_EMAIL`
Database: `DATABASE_URL`, `REDIS_URL`
Auth: `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
GitHub read: `GITHUB_READ_TOKEN`
GitHub App: `GITHUB_APP_ID`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`
Encryption: `TOKEN_ENC_KEY`, `TOKEN_ENC_KEY_ID`
Groq: `GROQ_API_KEY`, `GROQ_MODEL_FAST=openai/gpt-oss-20b`, `GROQ_MODEL_CODE=openai/gpt-oss-120b`, `GROQ_MODEL_FALLBACK=openai/gpt-oss-20b`, `GROQ_RPM_LIMIT=30`, `GROQ_TPM_LIMIT=8000`
Feature flags: `FEATURE_AUTO_PR=true`, `FEATURE_SANDBOX=false`, `FEATURE_PERSONALIZATION=false`, `USE_MOCKS=false`
Observability: `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `NEXT_PUBLIC_POSTHOG_KEY`

## Test totals

201 tests. Breakdown: config 3, shared 17, db 7, github 49, analyzers 20, ai 3, ranking 11, guide 8, patch 33, guardrails 22, token-encryption 4, web 24, worker 0.
13 typecheck targets.

## Data model highlights

`analyses.id` equals the BullMQ job id.
`analyses_unique` is `(repo_id, commit_sha, analyzer_versions_hash, user_id)`. Delete-before-insert.
`github_installations` unique on `installation_id`. Upsert via `onConflictDoUpdate`.
`opportunities.analysis_id` cascades.
`drafts` cascade from `opportunities`. `pull_requests.draft_id` is `SET NULL` on draft delete.
`analyses.user_id` is `NOT NULL`.
`repo_rules.rules` is JSONB.

## SSE contracts

Analysis: channel `analysis:<id>:events`, log `analysis:<id>:log`, seq `analysis:<id>:seq`. Events: `progress`, `rules`, `warning`, `complete`, `error`. Envelope `{ seq, event }`.

Drafts: channel `draft:<id>:events`, log `draft:<id>:log`, seq `draft:<id>:seq`. Events: `progress`, `ready`.

## AI pipeline shape

Analysis:
1. `extract_rules` from CONTRIBUTING, PR template, CI, README, CODE_OF_CONDUCT.
2. `classify_issue` for up to `maxCallsPerAnalysis` unlabeled issues.
3. `enrich_finding` for top 5 findings by confidence.
4. Ranking merges enrichment, scores, dedupes, caps.

Draft:
1. Read opportunity files from GitHub at base sha.
2. `draft_patch` returns per-file `newContent`.
3. Build unified diff in `@contribpilot/patch`.
4. `git apply --check` against temp repo.
5. Guardrails run (AI policy, minimum value, size, disclosure).
6. Save to `drafts` with quality report.

Groq free-tier: RPM 30, TPM 8000, RPD 1000. `reasoning_effort: 'low'` on all calls. `maxTokens` 2500-6000.

## GitHub App

Name: `ContribPilot`
App ID and Client ID: in `.env`
Private key: base64-encoded PEM in `GITHUB_APP_PRIVATE_KEY` (2259 chars when in .env)
Installation: `166882396` on `KushagraKumar04`
Webhook: disabled locally. M14 enables via smee.io.

## UI routes

`/` landing
`/signin`
`/repo/[owner]/[name]`
`/analyze/[analysisId]`
`/analyze/[analysisId]/opportunities`
`/opportunity/[id]`
`/workspace/[draftId]`
`/settings`
`/api/auth/[...nextauth]`
`/api/trpc/[trpc]`
`/api/analysis/[id]/stream`
`/api/drafts/[id]/stream`
`/api/github/install`
`/api/webhooks/github` (placeholder, returns 204)

## Known issues

None blocking. `@types/diff` deprecated warning. `pg` Turbopack warning if not a direct dep of `apps/web`.

## Next milestone

M14: GitHub webhooks, `syncPrStatus` job, My PRs page, dashboard stats.