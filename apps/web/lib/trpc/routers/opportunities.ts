import { z } from 'zod';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { getDb, schema } from '@contribpilot/db';
import { publicProcedure, protectedProcedure, router } from '../init';

const Effort = z.enum(['XS', 'S', 'M', 'L']);

const ListInput = z.object({
  analysisId: z.string().uuid(),
  types: z.array(z.string()).optional(),
  efforts: z.array(Effort).optional(),
  beginnerOnly: z.boolean().optional(),
  minScore: z.number().min(0).max(100).optional(),
  sort: z.enum(['score', 'freshness', 'confidence']).default('score'),
  limit: z.number().int().min(1).max(200).default(100)
});

export const opportunitiesRouter = router({
  list: publicProcedure.input(ListInput).query(async ({ input }) => {
    const db = getDb();

    const conditions = [eq(schema.opportunities.analysisId, input.analysisId)];

    if (input.minScore !== undefined) {
      conditions.push(gte(schema.opportunities.score, input.minScore));
    }

    if (input.beginnerOnly) {
      conditions.push(eq(schema.opportunities.beginner, true));
    }

    if (input.types && input.types.length > 0) {
      conditions.push(inArray(schema.opportunities.type, input.types));
    }

    if (input.efforts && input.efforts.length > 0) {
      conditions.push(inArray(schema.opportunities.effort, input.efforts));
    }

    const orderColumn =
      input.sort === 'freshness'
        ? desc(schema.opportunities.freshness)
        : input.sort === 'confidence'
          ? desc(schema.opportunities.confidence)
          : desc(schema.opportunities.score);

    const rows = await db
      .select()
      .from(schema.opportunities)
      .where(and(...conditions))
      .orderBy(orderColumn)
      .limit(input.limit);

    return rows.map((row) => ({
      id: row.id,
      analysisId: row.analysisId,
      type: row.type,
      title: row.title,
      summary: row.summary,
      severity: row.severity,
      effort: row.effort,
      difficulty: row.difficulty,
      beginner: row.beginner,
      score: row.score,
      confidence: row.confidence,
      duplicateRisk: row.duplicateRisk,
      files: row.files,
      plan: row.plan,
      inProgress: row.inProgress,
      scoreBreakdown: row.scoreBreakdown,
      feedback: row.feedback
    }));
  }),

  types: publicProcedure
    .input(z.object({ analysisId: z.string().uuid() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({ type: schema.opportunities.type })
        .from(schema.opportunities)
        .where(eq(schema.opportunities.analysisId, input.analysisId));
      const set = new Set<string>();
      for (const row of rows) set.add(row.type);
      return [...set].sort();
    }),

  feedback: protectedProcedure
    .input(
      z.object({
        opportunityId: z.string().uuid(),
        rating: z.union([z.literal(-1), z.literal(1)])
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.session.user.id;

      const existing = await db
        .select({ id: schema.feedback.id })
        .from(schema.feedback)
        .where(
          and(
            eq(schema.feedback.opportunityId, input.opportunityId),
            eq(schema.feedback.userId, userId)
          )
        )
        .limit(1);

      if (existing[0]) {
        await db
          .update(schema.feedback)
          .set({ rating: input.rating })
          .where(eq(schema.feedback.id, existing[0].id));
      } else {
        await db.insert(schema.feedback).values({
          opportunityId: input.opportunityId,
          userId,
          rating: input.rating
        });
      }

      await db
        .update(schema.opportunities)
        .set({ feedback: input.rating })
        .where(eq(schema.opportunities.id, input.opportunityId));

      return { ok: true };
    })
});