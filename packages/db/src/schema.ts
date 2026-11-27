import {
  bigint,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

export const analysisStatusEnum = pgEnum('analysis_status', [
  'queued',
  'running',
  'partial',
  'complete',
  'failed',
  'canceled'
]);

export const draftStatusEnum = pgEnum('draft_status', [
  'generating',
  'ready',
  'approved',
  'failed',
  'discarded'
]);

export const prStateEnum = pgEnum('pr_state', [
  'creating',
  'open',
  'draft',
  'merged',
  'closed'
]);

export const prModeEnum = pgEnum('pr_mode', ['manual', 'auto']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubId: bigint('github_id', { mode: 'number' }).notNull().unique(),
  login: text('login').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  email: text('email'),
  languages: text('languages').array(),
  prefs: jsonb('prefs').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  accessTokenEnc: text('access_token_enc'),
  refreshTokenEnc: text('refresh_token_enc'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  scope: text('scope')
});

export const githubInstallations = pgTable(
  'github_installations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    installationId: bigint('installation_id', { mode: 'number' }).notNull(),
    accountLogin: text('account_login').notNull(),
    permissions: jsonb('permissions').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('github_installations_installation_id_unique').on(table.installationId)]
);

export const repos = pgTable(
  'repos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    owner: text('owner').notNull(),
    name: text('name').notNull(),
    githubRepoId: bigint('github_repo_id', { mode: 'number' }).notNull(),
    defaultBranch: text('default_branch').notNull(),
    license: text('license'),
    language: text('language'),
    stars: integer('stars').notNull().default(0),
    archived: boolean('archived').notNull().default(false),
    lastPushAt: timestamp('last_push_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>()
  },
  (table) => [uniqueIndex('repos_owner_name_unique').on(table.owner, table.name)]
);

export const analyses = pgTable(
  'analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    commitSha: text('commit_sha').notNull(),
    status: analysisStatusEnum('status').notNull().default('queued'),
    progress: jsonb('progress').$type<Record<string, unknown>>(),
    error: text('error'),
    analyzerVersions: jsonb('analyzer_versions').$type<Record<string, string>>(),
    analyzerVersionsHash: text('analyzer_versions_hash').notNull(),
    stats: jsonb('stats').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true })
  },
  (table) => [
    uniqueIndex('analyses_unique').on(
      table.repoId,
      table.commitSha,
      table.analyzerVersionsHash,
      table.userId
    )
  ]
);

export const analysisCache = pgTable('analysis_cache', {
  cacheKey: text('cache_key').primaryKey(),
  repoId: uuid('repo_id')
    .notNull()
    .references(() => repos.id, { onDelete: 'cascade' }),
  commitSha: text('commit_sha').notNull(),
  payloadRef: text('payload_ref').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

export const repoRules = pgTable('repo_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  repoId: uuid('repo_id')
    .notNull()
    .references(() => repos.id, { onDelete: 'cascade' }),
  commitSha: text('commit_sha').notNull(),
  rules: jsonb('rules').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const opportunities = pgTable(
  'opportunities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisId: uuid('analysis_id')
      .notNull()
      .references(() => analyses.id, { onDelete: 'cascade' }),
    fingerprint: text('fingerprint').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    severity: text('severity').notNull(),
    confidence: doublePrecision('confidence').notNull(),
    effort: text('effort').notNull(),
    difficulty: integer('difficulty').notNull(),
    impact: doublePrecision('impact').notNull(),
    acceptance: doublePrecision('acceptance').notNull(),
    freshness: doublePrecision('freshness').notNull(),
    duplicateRisk: doublePrecision('duplicate_risk').notNull(),
    beginner: boolean('beginner').notNull(),
    score: doublePrecision('score').notNull(),
    scoreBreakdown: jsonb('score_breakdown').$type<Record<string, number>>().notNull(),
    evidence: jsonb('evidence').$type<unknown[]>().notNull(),
    files: text('files').array().notNull(),
    plan: jsonb('plan').$type<string[]>().notNull(),
    linkedIssue: jsonb('linked_issue').$type<Record<string, unknown>>(),
    inProgress: jsonb('in_progress').$type<unknown[]>(),
    tolerance: text('tolerance').notNull().default('neutral'),
    feedback: smallint('feedback'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('opportunities_analysis_score_idx').on(table.analysisId, table.score)]
);

export const drafts = pgTable('drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  opportunityId: uuid('opportunity_id')
    .notNull()
    .references(() => opportunities.id, { onDelete: 'cascade' }),
  baseSha: text('base_sha').notNull(),
  status: draftStatusEnum('status').notNull().default('generating'),
  patch: text('patch'),
  patchMeta: jsonb('patch_meta').$type<Record<string, unknown>>(),
  conversation: jsonb('conversation').$type<unknown[]>(),
  tokenUsage: jsonb('token_usage').$type<Record<string, number>>(),
  qualityReport: jsonb('quality_report').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const pullRequests = pgTable(
  'pull_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    draftId: uuid('draft_id').references(() => drafts.id, { onDelete: 'set null' }),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    forkFullName: text('fork_full_name'),
    branch: text('branch').notNull(),
    prNumber: integer('pr_number'),
    prUrl: text('pr_url'),
    state: prStateEnum('state').notNull().default('creating'),
    ciState: text('ci_state'),
    reviewState: text('review_state'),
    mode: prModeEnum('mode').notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    mergedAt: timestamp('merged_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true })
  },
  (table) => [
    index('pull_requests_user_state_idx').on(table.userId, table.state),
    index('pull_requests_repo_pr_idx').on(table.repoId, table.prNumber)
  ]
);

export const prEvents = pgTable('pr_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  pullRequestId: uuid('pull_request_id')
    .notNull()
    .references(() => pullRequests.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const llmCalls = pgTable('llm_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  task: text('task').notNull(),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  latencyMs: integer('latency_ms').notNull().default(0),
  status: text('status').notNull(),
  cacheHit: boolean('cache_hit').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const usageCounters = pgTable(
  'usage_counters',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    aiTokens: integer('ai_tokens').notNull().default(0),
    prsCreated: integer('prs_created').notNull().default(0),
    analyses: integer('analyses').notNull().default(0)
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })]
);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  target: text('target'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  ipHash: text('ip_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  opportunityId: uuid('opportunity_id')
    .notNull()
    .references(() => opportunities.id, { onDelete: 'cascade' }),
  rating: smallint('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});