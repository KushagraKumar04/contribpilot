import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../client';
import { drafts } from '../schema';

export interface CreateDraftInput {
  id: string;
  userId: string;
  opportunityId: string;
  baseSha: string;
}

export async function createDraft(db: Db, input: CreateDraftInput): Promise<string> {
  const rows = await db
    .insert(drafts)
    .values({
      id: input.id,
      userId: input.userId,
      opportunityId: input.opportunityId,
      baseSha: input.baseSha,
      status: 'generating'
    })
    .returning({ id: drafts.id });
  const row = rows[0];
  if (!row) throw new Error('Failed to create draft');
  return row.id;
}

export interface SaveDraftReadyInput {
  draftId: string;
  patch: string;
  patchMeta: Record<string, unknown>;
  qualityReport: Record<string, unknown>;
  tokenUsage: Record<string, number>;
}

export async function markDraftReady(db: Db, input: SaveDraftReadyInput): Promise<void> {
  await db
    .update(drafts)
    .set({
      status: 'ready',
      patch: input.patch,
      patchMeta: input.patchMeta,
      qualityReport: input.qualityReport,
      tokenUsage: input.tokenUsage,
      updatedAt: new Date()
    })
    .where(eq(drafts.id, input.draftId));
}

export async function markDraftFailed(db: Db, draftId: string, error: string): Promise<void> {
  await db
    .update(drafts)
    .set({
      status: 'failed',
      patchMeta: { error },
      updatedAt: new Date()
    })
    .where(eq(drafts.id, draftId));
}

export async function markDraftApproved(db: Db, draftId: string): Promise<void> {
  await db
    .update(drafts)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(eq(drafts.id, draftId));
}

export async function getDraftForUser(db: Db, draftId: string, userId: string) {
  const rows = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, draftId), eq(drafts.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listDraftsForUser(db: Db, userId: string) {
  return db
    .select()
    .from(drafts)
    .where(eq(drafts.userId, userId))
    .orderBy(desc(drafts.createdAt))
    .limit(50);
}