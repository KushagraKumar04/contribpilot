import { and, eq } from 'drizzle-orm';
import type { Db } from '../client';
import { analyses } from '../schema';

export interface CreateAnalysisInput {
  id: string;
  userId: string;
  repoId: string;
  commitSha: string;
  analyzerVersions: Record<string, string>;
  analyzerVersionsHash: string;
}

export async function createAnalysis(db: Db, input: CreateAnalysisInput): Promise<string> {
  await db
    .delete(analyses)
    .where(
      and(
        eq(analyses.repoId, input.repoId),
        eq(analyses.commitSha, input.commitSha),
        eq(analyses.analyzerVersionsHash, input.analyzerVersionsHash),
        eq(analyses.userId, input.userId)
      )
    );

  const rows = await db
    .insert(analyses)
    .values({
      id: input.id,
      userId: input.userId,
      repoId: input.repoId,
      commitSha: input.commitSha,
      status: 'running',
      analyzerVersions: input.analyzerVersions,
      analyzerVersionsHash: input.analyzerVersionsHash
    })
    .returning({ id: analyses.id });

  const row = rows[0];
  if (!row) {
    throw new Error('Failed to create analysis');
  }
  return row.id;
}

export async function markAnalysisComplete(
  db: Db,
  analysisId: string,
  stats: Record<string, unknown>
): Promise<void> {
  await db
    .update(analyses)
    .set({
      status: 'complete',
      completedAt: new Date(),
      stats
    })
    .where(eq(analyses.id, analysisId));
}

export async function markAnalysisFailed(
  db: Db,
  analysisId: string,
  error: string
): Promise<void> {
  await db
    .update(analyses)
    .set({ status: 'failed', error })
    .where(eq(analyses.id, analysisId));
}