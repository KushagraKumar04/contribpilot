import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../client';
import { repoRules } from '../schema';

export interface SaveRepoRulesInput {
  repoId: string;
  commitSha: string;
  rules: Record<string, unknown>;
}

export async function saveRepoRules(db: Db, input: SaveRepoRulesInput): Promise<string> {
  const rows = await db
    .insert(repoRules)
    .values({
      repoId: input.repoId,
      commitSha: input.commitSha,
      rules: input.rules
    })
    .returning({ id: repoRules.id });

  const row = rows[0];
  if (!row) {
    throw new Error('Failed to save repo rules');
  }
  return row.id;
}

export async function getLatestRepoRules(
  db: Db,
  repoId: string,
  commitSha: string
): Promise<Record<string, unknown> | null> {
  const rows = await db
    .select({ rules: repoRules.rules })
    .from(repoRules)
    .where(and(eq(repoRules.repoId, repoId), eq(repoRules.commitSha, commitSha)))
    .orderBy(desc(repoRules.createdAt))
    .limit(1);
  const row = rows[0];
  return row ? (row.rules as Record<string, unknown>) : null;
}