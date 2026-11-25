import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../client';
import { auditLog, githubInstallations, pullRequests } from '../schema';

export interface UpsertInstallationInput {
  userId: string;
  installationId: number;
  accountLogin: string;
  permissions: Record<string, unknown>;
}

export async function upsertInstallation(
  db: Db,
  input: UpsertInstallationInput
): Promise<void> {
  await db
    .insert(githubInstallations)
    .values({
      userId: input.userId,
      installationId: input.installationId,
      accountLogin: input.accountLogin,
      permissions: input.permissions
    })
    .onConflictDoUpdate({
      target: githubInstallations.installationId,
      set: {
        userId: input.userId,
        accountLogin: input.accountLogin,
        permissions: input.permissions
      }
    });
}

export async function findInstallationForUser(db: Db, userId: string) {
  const rows = await db
    .select()
    .from(githubInstallations)
    .where(eq(githubInstallations.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export interface CreatePullRequestInput {
  id: string;
  userId: string;
  draftId: string | null;
  repoId: string;
  forkFullName: string;
  branch: string;
  idempotencyKey: string;
  mode: 'manual' | 'auto';
}

export async function createPullRequestRecord(
  db: Db,
  input: CreatePullRequestInput
): Promise<string> {
  const existing = await db
    .select({ id: pullRequests.id })
    .from(pullRequests)
    .where(eq(pullRequests.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const rows = await db
    .insert(pullRequests)
    .values({
      id: input.id,
      userId: input.userId,
      draftId: input.draftId,
      repoId: input.repoId,
      forkFullName: input.forkFullName,
      branch: input.branch,
      state: 'creating',
      mode: input.mode,
      idempotencyKey: input.idempotencyKey
    })
    .returning({ id: pullRequests.id });
  const row = rows[0];
  if (!row) throw new Error('Failed to create pull request record');
  return row.id;
}

export interface MarkPullRequestOpenInput {
  pullRequestId: string;
  prNumber: number;
  prUrl: string;
  state: 'open' | 'draft';
}

export async function markPullRequestOpen(
  db: Db,
  input: MarkPullRequestOpenInput
): Promise<void> {
  await db
    .update(pullRequests)
    .set({
      prNumber: input.prNumber,
      prUrl: input.prUrl,
      state: input.state,
      lastSyncedAt: new Date()
    })
    .where(eq(pullRequests.id, input.pullRequestId));
}

export async function markPullRequestFailed(db: Db, pullRequestId: string): Promise<void> {
  await db
    .update(pullRequests)
    .set({ state: 'closed' })
    .where(eq(pullRequests.id, pullRequestId));
}

export async function listPullRequestsForUser(db: Db, userId: string) {
  return db
    .select()
    .from(pullRequests)
    .where(eq(pullRequests.userId, userId))
    .orderBy(desc(pullRequests.createdAt))
    .limit(50);
}

export async function getPullRequestForUser(db: Db, id: string, userId: string) {
  const rows = await db
    .select()
    .from(pullRequests)
    .where(and(eq(pullRequests.id, id), eq(pullRequests.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export interface AuditEntryInput {
  userId: string | null;
  action: string;
  target?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
}

export async function writeAuditEntry(db: Db, input: AuditEntryInput): Promise<void> {
  await db.insert(auditLog).values({
    userId: input.userId,
    action: input.action,
    target: input.target ?? null,
    metadata: input.metadata ?? null,
    ipHash: input.ipHash ?? null
  });
}