import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { getConfig } from '@contribpilot/config';
import {
  getDb,
  markDraftFailed,
  markDraftReady,
  schema
} from '@contribpilot/db';
import { getGroqProvider, draftPatch, refinePatch, type DraftPatchResult } from '@contribpilot/ai';
import {
  buildDeletedFileDiff,
  buildNewFileDiff,
  buildUnifiedDiff,
  gitApplyCheck,
  validatePatchShape,
  type BaseFileContents
} from '@contribpilot/patch';
import { checkAiPolicy, checkMinimumValue, ensureDisclosure, checkSize } from '@contribpilot/guardrails';
import type { DraftChangeJobData } from '@contribpilot/shared';
import { publishDraftEvent } from '../events';
import { getGithubProvider } from '../github';
import { createLogger } from '../logger';

interface OpportunityRow {
  id: string;
  analysisId: string;
  title: string;
  summary: string;
  plan: unknown;
  files: unknown;
  evidence: unknown;
}

interface AnalysisRow {
  repoId: string;
  commitSha: string;
}

interface RepoRow {
  owner: string;
  name: string;
  defaultBranch: string;
}

interface RulesRow {
  rules: unknown;
}

function extractPathsFromOpportunity(row: OpportunityRow): string[] {
  const files = Array.isArray(row.files) ? (row.files as string[]) : [];
  const evidence = Array.isArray(row.evidence) ? (row.evidence as Array<{ path?: string }>) : [];
  const set = new Set<string>();
  for (const file of files) {
    if (typeof file === 'string' && file.length > 0) set.add(file);
  }
  for (const item of evidence) {
    if (item && typeof item.path === 'string' && item.path.length > 0) set.add(item.path);
  }
  return [...set];
}

function planFromRow(row: OpportunityRow): string[] {
  const plan = row.plan;
  if (!Array.isArray(plan)) return [];
  return plan.filter((value): value is string => typeof value === 'string');
}

function buildPatchFromFiles(draft: DraftPatchResult, base: BaseFileContents): string {
  const parts: string[] = [];
  for (const file of draft.files) {
    if (file.action === 'create') {
      parts.push(buildNewFileDiff(file.path, file.newContent));
      continue;
    }
    if (file.action === 'delete') {
      const old = base[file.path] ?? '';
      if (old.length === 0) continue;
      parts.push(buildDeletedFileDiff(file.path, old));
      continue;
    }
    const old = base[file.path];
    if (old === undefined) continue;
    parts.push(buildUnifiedDiff(file.path, old, file.newContent));
  }
  return parts.filter((part) => part.length > 0).join('');
}

export async function draftChange(job: Job<DraftChangeJobData>): Promise<void> {
  const { draftId, userId, opportunityId, userInstruction } = job.data;
  const config = getConfig();
  const log = createLogger(`draft:${draftId}`);
  const db = getDb();
  const provider = getGithubProvider();

  try {
    await publishDraftEvent(draftId, {
      type: 'progress',
      step: 'load',
      label: 'Loading opportunity',
      current: 1,
      total: 4
    });

    const opportunityRows = await db
      .select()
      .from(schema.opportunities)
      .where(eq(schema.opportunities.id, opportunityId))
      .limit(1);
    const opportunity = opportunityRows[0] as OpportunityRow | undefined;
    if (!opportunity) throw new Error('Opportunity not found');

    const analysisRows = await db
      .select({ repoId: schema.analyses.repoId, commitSha: schema.analyses.commitSha })
      .from(schema.analyses)
      .where(eq(schema.analyses.id, opportunity.analysisId))
      .limit(1);
    const analysis = analysisRows[0] as AnalysisRow | undefined;
    if (!analysis) throw new Error('Analysis not found');

    const repoRows = await db
      .select({
        owner: schema.repos.owner,
        name: schema.repos.name,
        defaultBranch: schema.repos.defaultBranch
      })
      .from(schema.repos)
      .where(eq(schema.repos.id, analysis.repoId))
      .limit(1);
    const repo = repoRows[0] as RepoRow | undefined;
    if (!repo) throw new Error('Repo not found');

    const rulesRows = await db
      .select({ rules: schema.repoRules.rules })
      .from(schema.repoRules)
      .where(eq(schema.repoRules.repoId, analysis.repoId))
      .limit(1);
    const rulesRow = rulesRows[0] as RulesRow | undefined;
    const rules = (rulesRow?.rules ?? {}) as Record<string, unknown>;

    const ref = { owner: repo.owner, name: repo.name };
    const sha = analysis.commitSha;

    const requestedPaths = extractPathsFromOpportunity(opportunity).slice(0, config.draft.maxFiles);

    if (requestedPaths.length === 0) {
      throw new Error('Opportunity has no file paths to draft against');
    }

    await publishDraftEvent(draftId, {
      type: 'progress',
      step: 'files',
      label: 'Reading file contents',
      current: 2,
      total: 4
    });

    const baseFiles: BaseFileContents = {};
    const fileContexts: Array<{ path: string; content: string }> = [];
    let totalBytes = 0;

    for (const path of requestedPaths) {
      if (totalBytes >= config.draft.maxContextBytes) break;
      try {
        const content = await provider.getFile(ref, path, sha);
        const slice = content.slice(0, config.draft.maxFileBytes);
        baseFiles[path] = content;
        fileContexts.push({ path, content: slice });
        totalBytes += slice.length;
      } catch (error) {
        log.warn('file read failed', { path, error: String(error) });
      }
    }

    if (fileContexts.length === 0) {
      throw new Error('Could not read any file for this opportunity');
    }

    await publishDraftEvent(draftId, {
      type: 'progress',
      step: 'draft',
      label: 'Drafting patch with AI',
      current: 3,
      total: 4
    });

    const styleNotes = Array.isArray(rules.styleNotes)
      ? (rules.styleNotes as string[]).filter((value) => typeof value === 'string')
      : [];
    const commitConvention =
      typeof rules.commitConvention === 'string' ? rules.commitConvention : 'unknown';
    const dcoRequired = Boolean(rules.dcoRequired);
    const aiPolicy =
      rules.aiPolicy === 'prohibited' ||
      rules.aiPolicy === 'disclosure_required' ||
      rules.aiPolicy === 'allowed' ||
      rules.aiPolicy === 'unknown'
        ? rules.aiPolicy
        : 'unknown';
    const aiDisclosureRequired = aiPolicy !== 'allowed';

    const aiPolicyResult = checkAiPolicy(aiPolicy, true);
    if (aiPolicyResult.status === 'fail') {
      throw new Error(aiPolicyResult.message);
    }

    const providerAi = getGroqProvider();

    let draft = await draftPatch(providerAi, userId, {
      repoFullName: `${repo.owner}/${repo.name}`,
      defaultBranch: repo.defaultBranch,
      opportunityTitle: opportunity.title,
      opportunitySummary: opportunity.summary,
      opportunityPlan: planFromRow(opportunity),
      files: fileContexts,
      styleNotes,
      commitConvention,
      dcoRequired,
      aiDisclosureText: config.ai.disclosureText,
      aiDisclosureRequired
    });

    let patchText = buildPatchFromFiles(draft, baseFiles);

    const allowed = fileContexts.map((entry) => entry.path);

    const validateOnce = async (candidatePatch: string) => {
      const shape = validatePatchShape(candidatePatch, allowed);
      const applyCheck = await gitApplyCheck(candidatePatch, baseFiles);
      const checks = [...shape.checks, applyCheck];
      const failed = checks.some((entry) => entry.status === 'fail');
      return { checks, failed, shape };
    };

    let validation = await validateOnce(patchText);

    if (validation.failed || patchText.length === 0) {
      const errorMessages = validation.checks
        .filter((entry) => entry.status === 'fail')
        .map((entry) => `${entry.id}: ${entry.message}`);
      if (patchText.length === 0) {
        errorMessages.push('diff: The generated content produced no changes for any file');
      }

      try {
        draft = await refinePatch(providerAi, userId, {
          repoFullName: `${repo.owner}/${repo.name}`,
          priorDraft: draft,
          userInstruction:
            userInstruction ??
            'Ensure each file entry contains a complete newContent that differs from the current content.',
          validatorErrors: errorMessages,
          files: fileContexts,
          styleNotes
        });
        patchText = buildPatchFromFiles(draft, baseFiles);
        validation = await validateOnce(patchText);
      } catch (error) {
        log.warn('refine failed', { error: String(error) });
      }
    }

    await publishDraftEvent(draftId, {
      type: 'progress',
      step: 'save',
      label: 'Saving draft',
      current: 4,
      total: 4
    });

    const minValueResult = checkMinimumValue(patchText);
    const sizeResult = checkSize(patchText);
    const disclosureResult = ensureDisclosure(
      draft.prBody,
      config.ai.disclosureText,
      aiDisclosureRequired
    );

    const guardrailChecks = [
      {
        id: aiPolicyResult.id.toLowerCase(),
        status: aiPolicyResult.status === 'pass' ? 'pass' : aiPolicyResult.status === 'warn' ? 'warn' : 'fail',
        message: aiPolicyResult.message
      },
      {
        id: minValueResult.id.toLowerCase(),
        status: minValueResult.status,
        message: minValueResult.message
      },
      {
        id: sizeResult.id.toLowerCase(),
        status: sizeResult.status,
        message: sizeResult.message
      },
      {
        id: disclosureResult.result.id.toLowerCase(),
        status: disclosureResult.result.status,
        message: disclosureResult.result.message
      }
    ] as Array<{ id: string; status: 'pass' | 'warn' | 'fail'; message: string }>;

    const guardrailFailed = guardrailChecks.some((entry) => entry.status === 'fail');

    const qualityReport = {
      checks: [...validation.checks, ...guardrailChecks],
      passed: !validation.failed && !guardrailFailed,
      addedLines: validation.shape.addedLinesCount,
      removedLines: validation.shape.removedLinesCount,
      fileCount: validation.shape.fileCount
    };

    await markDraftReady(db, {
      draftId,
      patch: patchText,
      patchMeta: {
        summary: draft.summary,
        rationale: draft.rationale,
        files: draft.files.map((file) => ({ path: file.path, action: file.action })),
        testsAdded: draft.testsAdded,
        risks: draft.risks,
        commitMessage: draft.commitMessage,
        prTitle: draft.prTitle,
        prBody: disclosureResult.body
      },
      qualityReport,
      tokenUsage: {}
    });

    await publishDraftEvent(draftId, {
      type: 'ready',
      draftId,
      status: 'ready',
      patchLines: validation.shape.addedLinesCount + validation.shape.removedLinesCount,
      fileCount: validation.shape.fileCount,
      qualityPassed: !validation.failed
    });

    log.info('draft complete', {
      fileCount: validation.shape.fileCount,
      passed: !validation.failed
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('draft failed', { message });
    await markDraftFailed(db, draftId, message).catch(() => {});
    await publishDraftEvent(draftId, {
      type: 'ready',
      draftId,
      status: 'failed',
      patchLines: 0,
      fileCount: 0,
      qualityPassed: false
    });
    throw error;
  }
}