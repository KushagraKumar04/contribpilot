import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getConfig } from '@contribpilot/config';
import {
  createPullRequestRecord,
  findInstallationForUser,
  getDb,
  getDraftForUser,
  listPullRequestsForUser,
  schema
} from '@contribpilot/db';
import { getPrQueue } from '../../queue';
import { protectedProcedure, router, toTrpcError } from '../init';

export const prsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await listPullRequestsForUser(db, ctx.session.user.id);
    return rows.map((row) => ({
      id: row.id,
      repoId: row.repoId,
      state: row.state,
      prNumber: row.prNumber,
      prUrl: row.prUrl,
      branch: row.branch,
      mode: row.mode,
      createdAt: row.createdAt.toISOString(),
      mergedAt: row.mergedAt ? row.mergedAt.toISOString() : null,
      closedAt: row.closedAt ? row.closedAt.toISOString() : null
    }));
  }),

  prepare: protectedProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const config = getConfig();
      if (!config.features.autoPr) {
        throw toTrpcError(new Error('Automatic pull request creation is disabled'));
      }
      const db = getDb();
      const draft = await getDraftForUser(db, input.draftId, ctx.session.user.id);
      if (!draft) throw toTrpcError(new Error('Draft not found'));
      if (draft.status !== 'approved') {
        throw toTrpcError(new Error('Approve the patch before creating a pull request'));
      }

      const installation = await findInstallationForUser(db, ctx.session.user.id);
      if (!installation) {
        throw toTrpcError(new Error('GitHub App is not installed for this account'));
      }

      const meta = (draft.patchMeta ?? {}) as {
        files?: Array<{ path: string; action: string }>;
        commitMessage?: string;
        prTitle?: string;
        prBody?: string;
      };

      const oppRows = await db
        .select({ analysisId: schema.opportunities.analysisId })
        .from(schema.opportunities)
        .where(eq(schema.opportunities.id, draft.opportunityId))
        .limit(1);
      const opp = oppRows[0];

      let repoFullName = 'unknown/repo';
      let defaultBranch = 'main';
      if (opp) {
        const analysisRows = await db
          .select({ repoId: schema.analyses.repoId })
          .from(schema.analyses)
          .where(eq(schema.analyses.id, opp.analysisId))
          .limit(1);
        const analysis = analysisRows[0];
        if (analysis) {
          const repoRows = await db
            .select({
              owner: schema.repos.owner,
              name: schema.repos.name,
              defaultBranch: schema.repos.defaultBranch
            })
            .from(schema.repos)
            .where(eq(schema.repos.id, analysis.repoId))
            .limit(1);
          const repo = repoRows[0];
          if (repo) {
            repoFullName = `${repo.owner}/${repo.name}`;
            defaultBranch = repo.defaultBranch;
          }
        }
      }

      const branchPrefix = 'contrib/';
      const branchId = draft.id.replace(/-/g, '').slice(0, config.pr.branchMaxLength - branchPrefix.length);
      const branch = `${branchPrefix}${branchId}`;

      return {
        draftId: draft.id,
        installationId: installation.installationId,
        repoFullName,
        defaultBranch,
        branch,
        files: meta.files ?? [],
        commitMessage: meta.commitMessage ?? '',
        prTitle: meta.prTitle ?? '',
        prBody: meta.prBody ?? '',
        asDraft: config.pr.defaultDraft
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        draftId: z.string().uuid(),
        asDraft: z.boolean(),
        confirm: z.literal(true)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const config = getConfig();
      if (!config.features.autoPr) {
        throw toTrpcError(new Error('Automatic pull request creation is disabled'));
      }
      const db = getDb();
      const draft = await getDraftForUser(db, input.draftId, ctx.session.user.id);
      if (!draft) throw toTrpcError(new Error('Draft not found'));
      if (draft.status !== 'approved') {
        throw toTrpcError(new Error('Approve the patch before creating a pull request'));
      }

      const installation = await findInstallationForUser(db, ctx.session.user.id);
      if (!installation) {
        throw toTrpcError(new Error('GitHub App is not installed for this account'));
      }

      const idempotencyKey = `pr:${draft.id}:${draft.baseSha}`;
      const existing = await db
        .select({ id: schema.pullRequests.id })
        .from(schema.pullRequests)
        .where(eq(schema.pullRequests.idempotencyKey, idempotencyKey))
        .limit(1);
      if (existing[0]) {
        return { pullRequestId: existing[0].id };
      }

      const analysisRows = await db
        .select({ repoId: schema.analyses.repoId })
        .from(schema.analyses)
        .where(eq(schema.analyses.id, draft.opportunityId))
        .limit(1);

      void analysisRows;

      const pullRequestId = randomUUID();
      await createPullRequestRecord(db, {
        id: pullRequestId,
        userId: ctx.session.user.id,
        draftId: draft.id,
        repoId: analysisRows[0]?.repoId ?? draft.id,
        forkFullName: '',
        branch: `contrib/${draft.id.slice(0, 8)}`,
        idempotencyKey,
        mode: 'auto'
      });

      const queue = getPrQueue();
      await queue.add(
        'create-pr',
        {
          userId: ctx.session.user.id,
          draftId: draft.id,
          installationId: installation.installationId,
          asDraft: input.asDraft,
          idempotencyKey,
          userLogin: ctx.session.user.login
        },
        { jobId: idempotencyKey }
      );

      return { pullRequestId };
    })
});