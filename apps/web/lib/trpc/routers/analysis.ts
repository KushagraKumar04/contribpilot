import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RepoRef } from '@contribpilot/shared';
import {
  getDb,
  getLatestRepoRules,
  listOpportunitiesForAnalysis,
  schema
} from '@contribpilot/db';
import { getAnalysisQueue } from '../../queue';
import { protectedProcedure, publicProcedure, router } from '../init';

export const analysisRouter = router({
  start: protectedProcedure.input(RepoRef).mutation(async ({ ctx, input }) => {
    const analysisId = randomUUID();
    const queue = getAnalysisQueue();

    await queue.add(
      'analyze-repo',
      {
        analysisId,
        userId: ctx.session.user.id,
        owner: input.owner,
        name: input.name,
        ref: input.ref,
        path: input.path
      },
      { jobId: analysisId }
    );

    return { analysisId };
  }),

  get: publicProcedure
    .input(z.object({ analysisId: z.string().uuid() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(schema.analyses)
        .where(eq(schema.analyses.id, input.analysisId))
        .limit(1);

      const row = rows[0];
      if (!row) {
        return null;
      }

      const opportunities = await listOpportunitiesForAnalysis(db, input.analysisId);
      const rules = await getLatestRepoRules(db, row.repoId, row.commitSha);

      return {
        id: row.id,
        status: row.status,
        stats: row.stats ?? null,
        error: row.error ?? null,
        completedAt: row.completedAt ? row.completedAt.toISOString() : null,
        rules,
        opportunities: opportunities.map((o) => ({
          id: o.id,
          type: o.type,
          title: o.title,
          summary: o.summary,
          severity: o.severity,
          effort: o.effort,
          beginner: o.beginner,
          score: o.score,
          files: o.files,
          evidence: o.evidence,
          plan: o.plan,
          scoreBreakdown: o.scoreBreakdown,
          inProgressBy: o.inProgress
        }))
      };
    })
});