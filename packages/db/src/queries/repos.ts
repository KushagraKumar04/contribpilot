import { and, eq } from 'drizzle-orm';
import type { RepoMeta } from '@contribpilot/shared';
import type { Db } from '../client';
import { repos } from '../schema';

export interface UpsertRepoInput {
  owner: string;
  name: string;
  meta: RepoMeta;
}

export async function upsertRepo(db: Db, input: UpsertRepoInput): Promise<string> {
  const existing = await db
    .select({ id: repos.id })
    .from(repos)
    .where(and(eq(repos.owner, input.owner), eq(repos.name, input.name)))
    .limit(1);

  const values = {
    owner: input.owner,
    name: input.name,
    githubRepoId: input.meta.githubRepoId,
    defaultBranch: input.meta.defaultBranch,
    license: input.meta.license,
    language: input.meta.language,
    stars: input.meta.stars,
    archived: input.meta.archived,
    lastPushAt: new Date(input.meta.lastPushAt),
    metadata: input.meta as unknown as Record<string, unknown>
  };

  if (existing[0]) {
    await db.update(repos).set(values).where(eq(repos.id, existing[0].id));
    return existing[0].id;
  }

  const inserted = await db.insert(repos).values(values).returning({ id: repos.id });
  const row = inserted[0];
  if (!row) {
    throw new Error('Failed to insert repo');
  }
  return row.id;
}