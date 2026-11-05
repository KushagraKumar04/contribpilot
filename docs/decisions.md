# Decisions

## D001: Config package first
`packages/config` is created before any app or package reads environment variables, model names, limits, URLs or feature flags. Every other package imports config from there. No `process.env` reads outside `packages/config`.

## D002: Lucide removed
`ROLE.txt` forbids Lucide. Even though `architecture.md` mentions `lucide-react`, the visual rule wins. Use Radix Icons or inline SVG only.

## D003: Code comments omitted in generated implementation
The user requested no comments in code blocks. Descriptions for config keys and decisions live in docs instead of source comments.

## D004: tRPC for app calls
Use tRPC for typed internal app calls. Use REST route handlers for SSE and GitHub webhooks.

## D005: Fonts selected
Text font: Source Sans 3. Monospace font: IBM Plex Mono. Neither is Inter, Geist or Space Grotesk.

## D006: No hardcoded values
All defaults live in `packages/config/defaults.ts`. Secrets come from environment only.

## D007: JWT sessions for M3, DB sessions deferred
Auth.js runs with JWT sessions. Database sessions deferred to later milestones unless revocation is needed.

## D008: exactOptionalPropertyTypes disabled in apps/web only
NextAuth v5 beta types are not compatible with `exactOptionalPropertyTypes`. Only `apps/web` relaxes it. Every package keeps the strict setting.

## D009: GitHub errors mapped at the web boundary
Octokit's `RequestError` is duck-typed into a typed `AppError` in `apps/web/lib/github-errors.ts`. The github package stays provider-agnostic.

## D010: Anonymous analyses enqueue only, DB row requires sign-in
`analyses.user_id` is `NOT NULL`. `analysis.start` is a `protectedProcedure`. Anonymous repo preview still works but does not write to Postgres.

## D011: Analysis id comes from the queue job
The queue job id equals the DB `analyses.id`. The URL, SSE channel and DB row all share one UUID.

## D012: `analyses_unique` is deleted-and-inserted per run
Unique key `(repo_id, commit_sha, analyzer_versions_hash, user_id)`. On each run `createAnalysis` deletes the prior row first. `opportunities.analysis_id` cascades.

## D013: Programmatic migration runner
`drizzle-kit migrate` exited with code 1 on Windows without printing the actual Postgres error. Replaced with `packages/db/src/migrate.ts` and the script `db:migrate:script`.

## D014: `.env` uses `127.0.0.1` not `localhost` on Windows
Docker Desktop's IPv6 host-to-container forwarding is unreliable on some Windows builds. Keep IPv4 in `.env`.

## D015: Native Windows PostgreSQL stopped
`postgresql-x64-18` was stopped and disabled so Docker can own port `5432`.

## D016: Vitest 3, TypeScript 5.6, no Rolldown
Vitest 5 pulls Rolldown which has native-binding issues on Windows. Pinned Vitest 3 and TypeScript 5.6. Each package has its own `vitest.config.mts`.

## D017: tRPC TanStack React Query integration
Classic `@trpc/react-query` `trpc.Provider` returns `undefined` in React 19 with the Next.js App Router. Migrated to `@trpc/tanstack-react-query` which exposes `TRPCProvider` and `useTRPC`.

## D018: Single client-side Providers boundary
`apps/web/app/providers.tsx` wraps `ThemeProvider` and `TrpcProvider` inside one `'use client'` boundary. `layout.tsx` imports it statically.

## D019: Turbopack for dev
`next dev --turbo`. A package cannot appear in both `transpilePackages` and `serverExternalPackages`. `next-themes` lives in `transpilePackages`. `bullmq` and `ioredis` stay in `serverExternalPackages`. `pg` is a direct dependency of `apps/web`.

## D020: SSE route uses TransformStream
Async `start()` on a bare `ReadableStream` enqueuing from a Redis callback crashed on Next.js 15. Switched to a `TransformStream` with an explicit writer. History replayed from `analysis:<id>:log`.

## D021: Redis pub/sub with replay
`publishAnalysisEvent` writes each event to a Redis list and publishes to a channel. The SSE handler reads the list first, then subscribes. Sequence numbers give SSE `id:` fields. Same pattern used for drafts (`draft:<id>:log`).

## D022: Every Redis client has an error handler
All Redis clients attach `on('error', () => {})`. Subscriber connections use `enableReadyCheck: false`.

## D023: Groq models are config
`GROQ_MODEL_FAST=openai/gpt-oss-20b`, `GROQ_MODEL_CODE=openai/gpt-oss-120b`, `GROQ_MODEL_FALLBACK=openai/gpt-oss-20b`. Validated against `GET /openai/v1/models` at boot.

## D024: GPT-OSS needs `reasoning_effort: low` and larger token budgets
GPT-OSS models consume hidden reasoning tokens against `max_tokens`. Tasks pass `reasoning_effort: 'low'` and `maxTokens` 2500-6000 depending on task.

## D025: AI budget capped per user per day
`ai:budget:<userId>:<day>` in Redis. On exhaustion tasks throw `AI_BUDGET_EXCEEDED`, worker logs a warning and continues. Analysis completes with partial enrichments.

## D026: AI result cache keyed by content hash
`ai:cache:<sha256(task + model + promptVersion + input)>` with TTL from config. Not used for user-specific refine calls.

## D027: Ranking lives in `@contribpilot/ranking`
Weighted score with weights from config. Duplicate detection uses token Jaccard against open PR titles. Enrichment merges into opportunity summary and plan at ranking time.

## D028: Two-tier analysis page
Analyze page shows live progress plus condensed opportunities list. `/analyze/<id>/opportunities` has the full filterable list. Detail pages at `/opportunity/<id>`.

## D029: Loading skeletons only where there is real server work
`/repo/[owner]/[name]` benefits. `/analyze/[id]` and `/signin` do not wait on the server.

## D030: AI returns complete newContent, we build the diff
The model produced broken unified diffs in practice. Changed the `draft_patch` and `refine_patch` contract: the model returns `files[].newContent` (the full new file content). We build the unified diff ourselves in `packages/patch/src/build.ts` using the `diff` library. Deterministic, always valid hunk headers.

## D031: `docsGapsAnalyzer` uses the actual readme path
Previously hardcoded `README.md`. `loadRepoDocs` now returns `readmePath` and `contributingPath`. The analyzer uses those in evidence, `files` and titles. Fixes 404s in the draft worker for repos with lowercase `readme.md`.

## D032: `draftChange` reads the base tree before drafting
The worker reads all `opportunity.files` and `evidence.path` values from GitHub at the analysis commit sha. Those become the allowed set for the patch validator and the `baseFiles` for `git apply --check`.

## D033: Token encryption uses AES-256-GCM
`packages/token-encryption`. Key from `TOKEN_ENC_KEY` (32 bytes base64), key id prefix from `TOKEN_ENC_KEY_ID`. Payload format `<kid>.<base64(nonce || tag || ciphertext)>`. Not yet wired into the auth flow; reserved for user-to-server tokens when OAuth-based repo actions land.

## D034: `github_installations` is unique on installation_id
The original schema allowed duplicate installs when the settings page re-rendered. Added `uniqueIndex('github_installations_installation_id_unique')` and switched `upsertInstallation` to `onConflictDoUpdate`. Manual dedup SQL during the migration kept one row.

## D035: Session includes GitHub login
`jwt` callback stores `token.login` from the `users` row. `session` callback exposes it as `session.user.login`. Needed by the guide generator and the PR creator to build fork URLs.

## D036: Webhook disabled in local dev
GitHub rejects `localhost` as a webhook URL. For M13 testing we uncheck Active on the App. M14 adds a smee.io tunnel so webhooks reach `localhost:3000`.

## D037: FEATURE_AUTO_PR gates the AutoPrSection
When the flag is `false`, the workspace shows a disabled message pointing at the manual bundle. When `true`, the section offers the confirmation dialog and `prs.create`.

## D038: Draft button disabled when opportunity has no file paths
`labeled_issue` and `actionable_issue` findings have no target files. The button is disabled with an explanation. Server-side `drafts.create` also rejects. Prevents hallucinated patches against issues.

## D039: Guardrails package centralizes GR-4, GR-5, GR-6, GR-8
`@contribpilot/guardrails` exports `checkAiPolicy`, `checkMinimumValue`, `checkSize`, `ensureDisclosure`, `assertApprovedForPush`. GR-1 is enforced by the `approved` status check before `createPr`. GR-2, GR-3, GR-7 are enforced in M13/M14 worker code paths. GR-9 (secrets) and GR-6 (size) also enforce in `@contribpilot/patch`.

## D040: `@types/diff` is deprecated and unneeded
`diff` v8 ships its own types. `@types/diff` is included only because older versions required it. Safe to remove later; harmless warning for now.

## D041: Fixture-based tests only for analyzers
Every analyzer test uses synthetic contexts. No network, no real repos. Keeps CI deterministic and fast.

## D042: `analyses.user_id` NOT NULL and analyses run under the signed-in user
The `analysis.start` procedure is `protectedProcedure`. This means the `repo_rules` row and every opportunity belong to a real user, and the draft workspace is per-user.

## D043: Groq model IDs must be re-checked when the free tier changes
Groq retired the Llama family for free-tier keys on 16 August 2026. The current free-tier models are `openai/gpt-oss-20b` and `openai/gpt-oss-120b`. If Groq retires those, update `.env` and `docs/state.md`.

## D044: `drafts` cascade chain
`analyses` deletes cascade to `opportunities`. `opportunities` deletes cascade to `drafts`. `drafts` deletes cascade to `pull_requests` via `draft_id`. Cleanup SQL must be aware of this chain.

## D045: Audit log entries are written for every PR creation attempt
`writeAuditEntry` is called on successful PR creation. Failed attempts also log via `logger.error` and mark the pull request record `closed`. Metadata never contains tokens or secrets.

## D046: `pr.defaultDraft` defaults to true
New pull requests open as drafts by default. Reviewers only see them when the user marks ready. This matches the PRD's safety-first posture.