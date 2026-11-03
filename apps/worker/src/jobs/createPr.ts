import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { getConfig } from '@contribpilot/config';
import {
  createPullRequestRecord,
  getDb,
  markPullRequestFailed,
  markPullRequestOpen,
  schema,
  writeAuditEntry
} from '@contribpilot/db';
import { createInstallationOctokit } from '@contribpilot/github';
import { parsePatch } from '@contribpilot/patch';
import { assertApprovedForPush } from '@contribpilot/guardrails';
import { publishDraftEvent } from '../events';
import { createLogger } from '../logger';

export interface CreatePrJobData {
  userId: string;
  draftId: string;
  installationId: number;
  asDraft: boolean;
  idempotencyKey: string;
  userLogin: string;
}

interface DraftRow {
  id: string;
  userId: string;
  opportunityId: string;
  baseSha: string;
  status: string;
  patch: string | null;
  patchMeta: unknown;
}

interface OpportunityRow {
  analysisId: string;
  files: unknown;
}

interface AnalysisRow {
  repoId: string;
}

interface RepoRow {
  owner: string;
  name: string;
  defaultBranch: string;
}

function branchName(draftId: string, maxLength: number): string {
  const prefix = 'contrib/';
  const trimmed = draftId.replace(/-/g, '').slice(0, maxLength - prefix.length);
  return `${prefix}${trimmed}`;
}

async function ensureFork(
  octokit: ReturnType<typeof createInstallationOctokit>,
  owner: string,
  name: string,
  userLogin: string
): Promise<string> {
  try {
    const existing = await octokit.rest.repos.get({ owner: userLogin, repo: name });
    return existing.data.full_name;
  } catch {
    const fork = await octokit.rest.repos.createFork({ owner, repo: name });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const ready = await octokit.rest.repos.get({
          owner: fork.data.owner?.login ?? userLogin,
          repo: name
        });
        return ready.data.full_name;
      } catch {
        /* keep polling */
      }
    }
    throw new Error('Fork did not become ready in time');
  }
}

export async function createPr(job: Job<CreatePrJobData>): Promise<void> {
  const data = job.data;
  const config = getConfig();
  const log = createLogger(`pr:${data.draftId}`);
  const db = getDb();

  const draftRows = await db
    .select()
    .from(schema.drafts)
    .where(eq(schema.drafts.id, data.draftId))
    .limit(1);
  const draft = draftRows[0] as DraftRow | undefined;
  if (!draft) throw new Error('Draft not found');

  const approval = assertApprovedForPush(draft.status);
  if (approval.status === 'fail') {
    throw new Error(approval.message);
  }

  if (!draft.patch || draft.patch.length === 0) {
    throw new Error('Draft has no patch');
  }

  const oppRows = await db
    .select()
    .from(schema.opportunities)
    .where(eq(schema.opportunities.id, draft.opportunityId))
    .limit(1);
  const opportunity = oppRows[0] as OpportunityRow | undefined;
  if (!opportunity) throw new Error('Opportunity not found');

  const analysisRows = await db
    .select({ repoId: schema.analyses.repoId })
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

  const branch = branchName(data.draftId, config.pr.branchMaxLength);
  const meta = (draft.patchMeta ?? {}) as {
    commitMessage?: string;
    prTitle?: string;
    prBody?: string;
  };

  const prRecordId = await createPullRequestRecord(db, {
    id: data.draftId,
    userId: data.userId,
    draftId: data.draftId,
    repoId: analysis.repoId,
    forkFullName: `${data.userLogin}/${repo.name}`,
    branch,
    idempotencyKey: data.idempotencyKey,
    mode: 'auto'
  });

  try {
    const octokit = createInstallationOctokit(data.installationId);

    const forkFullName = await ensureFork(octokit, repo.owner, repo.name, data.userLogin);
    const [forkOwner, forkName] = forkFullName.split('/');
    if (!forkOwner || !forkName) {
      throw new Error('Invalid fork name returned by GitHub');
    }

    const upstream = await octokit.rest.repos.getBranch({
      owner: repo.owner,
      repo: repo.name,
      branch: repo.defaultBranch
    });
    const baseSha = upstream.data.commit.sha;

    await octokit.rest.git
      .createRef({
        owner: forkOwner,
        repo: forkName,
        ref: `refs/heads/${branch}`,
        sha: baseSha
      })
      .catch(async (error) => {
        if ((error as { status?: number }).status !== 422) throw error;
      });

    const patchFiles = parsePatch(draft.patch ?? '').files;
    const baseFiles = await Promise.all(
      patchFiles.map(async (file) => {
        const target = file.isDelete ? file.oldPath : file.newPath;
        try {
          const response = await octokit.rest.repos.getContent({
            owner: repo.owner,
            repo: repo.name,
            path: target,
            ref: baseSha
          });
          const data = response.data;
          if (Array.isArray(data) || data.type !== 'file' || typeof data.content !== 'string') {
            return { target, content: '' };
          }
          const content = Buffer.from(data.content, 'base64').toString('utf8');
          return { target, content };
        } catch {
          return { target, content: '' };
        }
      })
    );

    const { applyPatchToFiles } = await import('@contribpilot/patch');
    const nextFiles = applyPatchToFiles(baseFiles, draft.patch);

    const tree = await octokit.rest.git.createTree({
      owner: forkOwner,
      repo: forkName,
      base_tree: baseSha,
      tree: nextFiles.map((file) => ({
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        content: file.content
      }))
    });

    const commit = await octokit.rest.git.createCommit({
      owner: forkOwner,
      repo: forkName,
      message: meta.commitMessage ?? 'contrib: apply change',
      tree: tree.data.sha,
      parents: [baseSha]
    });

    await octokit.rest.git.updateRef({
      owner: forkOwner,
      repo: forkName,
      ref: `heads/${branch}`,
      sha: commit.data.sha
    });

    const pull = await octokit.rest.pulls.create({
      owner: repo.owner,
      repo: repo.name,
      title: meta.prTitle ?? 'ContribPilot change',
      body: meta.prBody ?? '',
      head: `${forkOwner}:${branch}`,
      base: repo.defaultBranch,
      draft: data.asDraft
    });

    await markPullRequestOpen(db, {
      pullRequestId: prRecordId,
      prNumber: pull.data.number,
      prUrl: pull.data.html_url,
      state: data.asDraft ? 'draft' : 'open'
    });

    await writeAuditEntry(db, {
      userId: data.userId,
      action: 'pr.created',
      target: pull.data.html_url,
      metadata: {
        draftId: data.draftId,
        forkFullName,
        branch,
        asDraft: data.asDraft
      }
    });

    await publishDraftEvent(data.draftId, {
      type: 'ready',
      draftId: data.draftId,
      status: 'ready',
      patchLines: 0,
      fileCount: 0,
      qualityPassed: true
    });

    log.info('pr created', { url: pull.data.html_url, number: pull.data.number });
  } catch (error) {
    await markPullRequestFailed(db, prRecordId).catch(() => {});
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('pr creation failed', { message });
    throw error;
  }
}