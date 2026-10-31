import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import {
  createDraft,
  getDb,
  getDraftForUser,
  getLatestRepoRules,
  markDraftApproved,
  markDraftReady,
  schema
} from '@contribpilot/db';
import { validatePatchShape } from '@contribpilot/patch';
import { checkAiPolicy } from '@contribpilot/guardrails';
import { generateGuide } from '@contribpilot/guide';
import { getDraftQueue } from '../../queue';
import { protectedProcedure, router, toTrpcError } from '../init';

export const draftsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        opportunityId: z.string().uuid(),
        userInstruction: z.string().max(2000).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.session.user.id;

      const oppRows = await db
        .select({
          analysisId: schema.opportunities.analysisId,
          files: schema.opportunities.files,
          evidence: schema.opportunities.evidence
        })
        .from(schema.opportunities)
        .where(eq(schema.opportunities.id, input.opportunityId))
        .limit(1);
      const opp = oppRows[0];
      if (!opp) throw toTrpcError(new Error('Opportunity not found'));

      const files = Array.isArray(opp.files) ? opp.files : [];
      const evidence = Array.isArray(opp.evidence) ? opp.evidence : [];
      const hasFilePath = files.length > 0;
      if (!hasFilePath) {
        throw toTrpcError(
          new Error(
            'This opportunity does not name a file to change. Use the step by step guide instead.'
          )
        );
      }

      const analysisRows = await db
        .select({
          commitSha: schema.analyses.commitSha,
          repoId: schema.analyses.repoId
        })
        .from(schema.analyses)
        .where(eq(schema.analyses.id, opp.analysisId))
        .limit(1);
      const analysis = analysisRows[0];
      if (!analysis) throw toTrpcError(new Error('Analysis not found'));

      const rulesRow = await getLatestRepoRules(db, analysis.repoId, analysis.commitSha);
      const aiPolicyRaw = (rulesRow ?? {})?.aiPolicy;
      const aiPolicy =
        aiPolicyRaw === 'prohibited' ||
        aiPolicyRaw === 'disclosure_required' ||
        aiPolicyRaw === 'allowed'
          ? aiPolicyRaw
          : 'unknown';

      const policyResult = checkAiPolicy(aiPolicy, true);
      if (policyResult.status === 'fail') {
        throw toTrpcError(new Error(policyResult.message));
      }

      const draftId = randomUUID();
      await createDraft(db, {
        id: draftId,
        userId,
        opportunityId: input.opportunityId,
        baseSha: analysis.commitSha
      });

      const queue = getDraftQueue();
      await queue.add(
        'draft-change',
        {
          draftId,
          userId,
          opportunityId: input.opportunityId,
          userInstruction: input.userInstruction
        },
        { jobId: draftId }
      );

      return { draftId };
    }),

  get: protectedProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const row = await getDraftForUser(db, input.draftId, ctx.session.user.id);
      if (!row) return null;
      return {
        id: row.id,
        opportunityId: row.opportunityId,
        baseSha: row.baseSha,
        status: row.status,
        patch: row.patch,
        patchMeta: row.patchMeta,
        qualityReport: row.qualityReport,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString()
      };
    }),

  editPatch: protectedProcedure
    .input(
      z.object({
        draftId: z.string().uuid(),
        patch: z.string().min(1).max(200000)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await getDraftForUser(db, input.draftId, ctx.session.user.id);
      if (!row) throw toTrpcError(new Error('Draft not found'));

      const meta = (row.patchMeta ?? {}) as Record<string, unknown>;
      const files = Array.isArray(meta.files)
        ? (meta.files as Array<{ path: string }>).map((entry) => entry.path)
        : [];
      const allowed = files.length > 0 ? files : null;

      const shape = validatePatchShape(input.patch, allowed);
      const failed = shape.checks.some((entry) => entry.status === 'fail');

      const qualityReport = {
        checks: shape.checks,
        passed: !failed,
        addedLines: shape.addedLinesCount,
        removedLines: shape.removedLinesCount,
        fileCount: shape.fileCount
      };

      await markDraftReady(db, {
        draftId: input.draftId,
        patch: input.patch,
        patchMeta: meta,
        qualityReport,
        tokenUsage: {}
      });

      return { qualityReport };
    }),

  approve: protectedProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await getDraftForUser(db, input.draftId, ctx.session.user.id);
      if (!row) throw toTrpcError(new Error('Draft not found'));
      await markDraftApproved(db, input.draftId);
      return { ok: true };
    }),

  bundle: protectedProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.session.user.id;
      const draft = await getDraftForUser(db, input.draftId, userId);
      if (!draft) throw toTrpcError(new Error('Draft not found'));

      const meta = (draft.patchMeta ?? {}) as {
        files?: Array<{ path: string; action: string }>;
      };

      const oppRows = await db
        .select({
          analysisId: schema.opportunities.analysisId,
          title: schema.opportunities.title,
          type: schema.opportunities.type,
          files: schema.opportunities.files
        })
        .from(schema.opportunities)
        .where(eq(schema.opportunities.id, draft.opportunityId))
        .limit(1);
      const opp = oppRows[0];
      if (!opp) throw toTrpcError(new Error('Opportunity not found'));

      const analysisRows = await db
        .select({
          repoId: schema.analyses.repoId,
          commitSha: schema.analyses.commitSha
        })
        .from(schema.analyses)
        .where(eq(schema.analyses.id, opp.analysisId))
        .limit(1);
      const analysis = analysisRows[0];
      if (!analysis) throw toTrpcError(new Error('Analysis not found'));

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
      if (!repo) throw toTrpcError(new Error('Repo not found'));

      const rulesRow = await getLatestRepoRules(db, analysis.repoId, analysis.commitSha);
      const rulesTyped = (rulesRow ?? {}) as {
        issueFirst?: boolean;
        claRequired?: boolean;
        dcoRequired?: boolean;
        branchNaming?: string;
        commitConvention?: string;
        setupCommands?: string[];
        lintCommands?: string[];
        testCommands?: string[];
        requiredChecks?: string[];
      };

      const oppFiles = Array.isArray(opp.files) ? (opp.files as string[]) : [];

      const guide = generateGuide({
        owner: repo.owner,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        repoFullName: `${repo.owner}/${repo.name}`,
        userLogin: ctx.session.user.login ?? 'your-username',
        rules: {
          issueFirst: Boolean(rulesTyped.issueFirst),
          claRequired: Boolean(rulesTyped.claRequired),
          dcoRequired: Boolean(rulesTyped.dcoRequired),
          branchNaming: rulesTyped.branchNaming,
          commitConvention: rulesTyped.commitConvention ?? 'unknown',
          setupCommands: rulesTyped.setupCommands ?? [],
          lintCommands: rulesTyped.lintCommands ?? [],
          testCommands: rulesTyped.testCommands ?? [],
          requiredChecks: rulesTyped.requiredChecks ?? []
        },
        opportunity: {
          title: opp.title,
          type: opp.type,
          files: oppFiles
        }
      });

      const branchStep = guide.steps.find((step) =>
        step.commands.some((command) => command.command.includes('git checkout -b'))
      );
      const branchCommand = branchStep?.commands.find((command) =>
        command.command.includes('git checkout -b')
      )?.command;
      const branchName = branchCommand
        ? branchCommand.replace(/^git checkout -b\s+/, '').replace(/\s+upstream.*$/, '')
        : `contrib/${draft.id.slice(0, 8)}`;

      const filesList =
        meta.files && meta.files.length > 0
          ? meta.files.map((file) => `${file.action}\t${file.path}`).join('\n')
          : '';

      const commands = [
        `cd ${repo.name}`,
        `git remote add upstream https://github.com/${repo.owner}/${repo.name}.git  # skip if it exists`,
        `git fetch upstream`,
        `git checkout -b ${branchName} upstream/${repo.defaultBranch}`,
        `git apply ../contribpilot-${draft.id.slice(0, 8)}.patch`,
        rulesTyped.testCommands && rulesTyped.testCommands.length > 0
          ? rulesTyped.testCommands[0]
          : 'pnpm test',
        `git add -A`,
        rulesTyped.dcoRequired
          ? `git commit -s -m "${((draft.patchMeta as { commitMessage?: string })?.commitMessage ?? 'fix: change').replace(/"/g, '\\"')}"`
          : `git commit -m "${((draft.patchMeta as { commitMessage?: string })?.commitMessage ?? 'fix: change').replace(/"/g, '\\"')}"`,
        `git push -u origin ${branchName}`
      ].join('\n');

      const checklistParts: string[] = [];
      if (filesList) {
        checklistParts.push(`Files changed:\n${filesList}`);
      }
      checklistParts.push(guide.checklistMarkdown);

      return {
        branchName,
        commands,
        checklist: checklistParts.join('\n\n'),
        repo: {
          owner: repo.owner,
          name: repo.name,
          defaultBranch: repo.defaultBranch
        }
      };
    })
});