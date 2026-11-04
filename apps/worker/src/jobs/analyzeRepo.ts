import type { Job } from 'bullmq';
import { getConfig } from '@contribpilot/config';
import {
  createAnalysis,
  getDb,
  insertOpportunities,
  markAnalysisComplete,
  markAnalysisFailed,
  saveRepoRules,
  upsertRepo,
  type InsertOpportunityInput
} from '@contribpilot/db';
import {
  ANALYZERS,
  analyzerVersionHash,
  analyzerVersionMap,
  type AnalyzerContext,
  type RepoSnapshot
} from '@contribpilot/analyzers';
import {
  classifyIssue,
  enrichFinding,
  extractRules,
  getGroqProvider
} from '@contribpilot/ai';
import { rankFindings } from '@contribpilot/ranking';
import {
  EMPTY_REPO_RULES,
  type AnalyzeRepoJobData,
  type Finding,
  type RepoRules
} from '@contribpilot/shared';
import type { Issue } from '@contribpilot/github';
import { publishAnalysisEvent } from '../events';
import { getGithubProvider } from '../github';
import { loadRepoDocs } from '../repoDocs';
import { createLogger } from '../logger';

interface Stage {
  step: string;
  label: string;
}

const STAGES: Stage[] = [
  { step: 'fetch', label: 'Fetching repository' },
  { step: 'issues', label: 'Reading open issues and pull requests' },
  { step: 'rules', label: 'Reading contribution rules' },
  { step: 'analyze', label: 'Running analyzers' },
  { step: 'enrich', label: 'Enriching findings with AI' },
  { step: 'rank', label: 'Scoring and deduplicating' },
  { step: 'complete', label: 'Analysis complete' }
];

async function emitProgress(analysisId: string, index: number): Promise<void> {
  const stage = STAGES[index];
  if (!stage) return;
  await publishAnalysisEvent(analysisId, {
    type: 'progress',
    step: stage.step,
    label: stage.label,
    current: index + 1,
    total: STAGES.length
  });
}

function toRepoRules(
  extracted: Awaited<ReturnType<typeof extractRules>>,
  defaultBranch: string
): RepoRules {
  const result: RepoRules = {
    issueFirst: extracted.issueFirst,
    claRequired: extracted.claRequired,
    dcoRequired: extracted.dcoRequired,
    aiPolicy: extracted.aiPolicy,
    commitConvention: extracted.commitConvention,
    requiredChecks: extracted.requiredChecks,
    setupCommands: extracted.setupCommands,
    lintCommands: extracted.lintCommands,
    testCommands: extracted.testCommands,
    styleNotes: extracted.styleNotes,
    defaultBranch,
    evidenceQuotes: extracted.evidenceQuotes
  };
  if (extracted.branchNaming) {
    result.branchNaming = extracted.branchNaming;
  }
  return result;
}

function findingFromClassifiedIssue(issue: Issue): Finding {
  return {
    analyzer: 'issue-classifier',
    analyzerVersion: '1',
    type: 'actionable_issue',
    title: issue.title,
    summary: issue.body ? issue.body.slice(0, 500) : 'No description on the issue.',
    severity: 'low',
    confidence: 0.6,
    evidence: [{ kind: 'issue', url: issue.htmlUrl }],
    files: [],
    fingerprint: `issue-classifier:${issue.number}`
  };
}



export async function analyzeRepo(job: Job<AnalyzeRepoJobData>): Promise<void> {
  const { analysisId, userId, owner, name } = job.data;
  const config = getConfig();
  const log = createLogger(`analysis:${analysisId}`);
  const db = getDb();
  const provider = getGithubProvider();
  const ref = { owner, name };

  let dbAnalysisId: string | null = null;

  try {
    await emitProgress(analysisId, 0);

    if (!userId) {
      throw new Error('Sign-in required for analysis');
    }

    const meta = await provider.getRepo(ref);
    const repoId = await upsertRepo(db, { owner, name, meta });
    const headCommit = await provider.getCommitSha(ref, meta.defaultBranch);

    dbAnalysisId = await createAnalysis(db, {
      id: analysisId,
      userId,
      repoId,
      commitSha: headCommit,
      analyzerVersions: analyzerVersionMap(),
      analyzerVersionsHash: analyzerVersionHash()
    });

    await emitProgress(analysisId, 1);

    const issues: AnalyzerContext['issues'] = [];
    for await (const issue of provider.listIssues(ref)) {
      issues.push(issue);
      if (issues.length >= config.analysis.issuesMaxIngest) break;
    }

    const pulls: AnalyzerContext['pulls'] = [];
    for await (const pull of provider.listPulls(ref)) {
      pulls.push(pull);
      if (pulls.length >= config.analysis.prsMaxIngest) break;
    }

    await emitProgress(analysisId, 2);

    const docs = await loadRepoDocs(provider, ref, headCommit);
    const docBundle = {
      readmePath: docs.readmePath,
      readmeText: docs.readmeText,
      contributingPath: docs.contributingPath,
      contributingText: docs.contributingText,
      codeOfConductText: docs.codeOfConductText,
      prTemplateText: docs.prTemplateText
    };

    let rules: RepoRules = { ...EMPTY_REPO_RULES, defaultBranch: meta.defaultBranch };
    try {
      const extracted = await extractRules(getGroqProvider(), userId, {
        repoFullName: `${owner}/${name}`,
        defaultBranch: meta.defaultBranch,
        contributingText: docs.contributingText,
        prTemplateText: docs.prTemplateText,
        ciWorkflowText: docs.ciWorkflowText,
        readmeText: docs.readmeText,
        codeOfConductText: docs.codeOfConductText
      });
      rules = toRepoRules(extracted, meta.defaultBranch);
      await saveRepoRules(db, {
        repoId,
        commitSha: headCommit,
        rules: rules as unknown as Record<string, unknown>
      });
      await publishAnalysisEvent(analysisId, {
        type: 'rules',
        rules: rules as unknown as Record<string, unknown>
      });
    } catch (error) {
      log.warn('rule extraction failed, using defaults', { error: String(error) });
    }

    await emitProgress(analysisId, 3);

    let treePaths: string[] = [];
    try {
      const entries = await provider.getTree(ref, headCommit);
      treePaths = entries
        .filter((entry) => entry.type === 'blob' || entry.type === 'tree')
        .map((entry) => entry.path);
    } catch (error) {
      log.warn('tree fetch failed', { error: String(error) });
    }

    const snapshot: RepoSnapshot = {
      owner,
      name,
      defaultBranch: meta.defaultBranch,
      commitSha: headCommit,
      files: []
    };

    const ctx: AnalyzerContext = {
      snapshot,
      issues,
      pulls,
      rules,
      docs: docBundle,
      tree: treePaths,
      docsGapsSections: config.analysis.docsGapsSections,
      communityFiles: config.analysis.communityFiles,
      labels: {
        beginner: config.labels.beginner,
        docs: config.labels.docs,
        bug: config.labels.bug
      },
      log
    };

    const findings: Finding[] = [];
    for (const analyzer of ANALYZERS) {
      if (!analyzer.appliesTo(ctx)) continue;
      try {
        for await (const finding of analyzer.run(ctx)) {
          findings.push(finding);
        }
      } catch (error) {
        log.warn(`analyzer ${analyzer.id} failed`, { error: String(error) });
      }
    }

    await emitProgress(analysisId, 4);

    let aiCalls = 0;
    const maxCalls = config.ai.maxCallsPerAnalysis;

    const labeledNumbers = new Set(
      findings
        .filter((finding) => finding.type === 'labeled_issue')
        .map((finding) => Number(finding.fingerprint.split(':')[1]))
    );

    for (const issue of issues) {
      if (aiCalls >= maxCalls) break;
      if (issue.labels.length > 0) continue;
      if (labeledNumbers.has(issue.number)) continue;
      try {
        const classification = await classifyIssue(getGroqProvider(), userId, {
          repoFullName: `${owner}/${name}`,
          issueNumber: issue.number,
          title: issue.title,
          body: issue.body ?? '',
          labels: issue.labels
        });
        aiCalls += 1;
        if (classification.actionable) {
          const finding = findingFromClassifiedIssue(issue);
          finding.confidence = classification.beginnerFriendly ? 0.65 : 0.5;
          if (classification.beginnerFriendly) {
            finding.suggestedFixHint = 'Classified as beginner friendly by AI.';
          }
          findings.push(finding);
        }
      } catch (error) {
        log.warn('classify_issue failed', { issue: issue.number, error: String(error) });
      }
    }

    const enrichedByFingerprint = new Map<
      string,
      { rationale: string; plan: string[]; effort: string }
    >();

    const sorted = [...findings].sort((a, b) => b.confidence - a.confidence);
    const toEnrich = sorted.slice(0, Math.min(5, Math.max(0, maxCalls - aiCalls)));
    for (const finding of toEnrich) {
      try {
        const enriched = await enrichFinding(getGroqProvider(), userId, {
          repoFullName: `${owner}/${name}`,
          finding
        });
        aiCalls += 1;
        enrichedByFingerprint.set(finding.fingerprint, {
          rationale: enriched.rationale,
          plan: enriched.plan,
          effort: enriched.effort
        });
      } catch (error) {
        log.warn('enrich_finding failed', { fingerprint: finding.fingerprint, error: String(error) });
      }
    }

    await emitProgress(analysisId, 5);

    const ranked = rankFindings({
      analysisId: dbAnalysisId,
      findings,
      pulls,
      rules,
      userIsBeginner: false,
      enrichment: enrichedByFingerprint
    });

    const rows: InsertOpportunityInput[] = ranked.map((opportunity) => ({
      analysisId: opportunity.analysisId,
      fingerprint: opportunity.fingerprint,
      type: opportunity.type,
      title: opportunity.title,
      summary: opportunity.summary,
      severity: opportunity.severity,
      confidence: opportunity.confidence,
      effort: opportunity.effort,
      difficulty: opportunity.difficulty,
      impact: opportunity.impact,
      acceptance: opportunity.acceptanceLikelihood,
      freshness: opportunity.freshness,
      duplicateRisk: opportunity.duplicateRisk,
      beginner: opportunity.beginnerFriendly,
      score: opportunity.score,
      scoreBreakdown: opportunity.scoreBreakdown,
      evidence: opportunity.evidence as unknown[],
      files: opportunity.files,
      plan: opportunity.plan,
      tolerance: opportunity.tolerance
    }));

    await insertOpportunities(db, rows);
    await markAnalysisComplete(db, dbAnalysisId, {
      findings: findings.length,
      opportunities: rows.length,
      issues: issues.length,
      pulls: pulls.length,
      aiCalls
    });

    await emitProgress(analysisId, 6);

    await publishAnalysisEvent(analysisId, {
      type: 'complete',
      analysisId,
      repo: { owner, name },
      opportunities: rows.length
    });

    log.info('analysis complete', { opportunities: rows.length, aiCalls });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('analysis failed', { message });
    if (dbAnalysisId) {
      await markAnalysisFailed(db, dbAnalysisId, message).catch(() => {});
    }
    await publishAnalysisEvent(analysisId, {
      type: 'error',
      code: 'INTERNAL',
      message
    });
    throw error;
  }
}