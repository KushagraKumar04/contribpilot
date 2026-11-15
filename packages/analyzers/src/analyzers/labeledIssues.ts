import type { Evidence, Finding } from '@contribpilot/shared';
import type { Issue } from '@contribpilot/github';
import type { Analyzer, AnalyzerContext } from '../types';

const ID = 'labeled-issues';
const VERSION = '1';

const ISSUE_REF = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;

function isInteresting(issueLabels: string[], wanted: Set<string>): boolean {
  for (const label of issueLabels) {
    if (wanted.has(label.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function buildInProgress(pulls: AnalyzerContext['pulls']): Set<number> {
  const set = new Set<number>();
  for (const pr of pulls) {
    if (pr.state !== 'open') continue;
    const body = pr.body ?? '';
    for (const match of body.matchAll(ISSUE_REF)) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) {
        set.add(value);
      }
    }
  }
  return set;
}

function evidenceFor(issue: Issue): Evidence[] {
  const snippet = issue.body ? issue.body.slice(0, 400) : undefined;
  const base: Evidence = { kind: 'issue', url: issue.htmlUrl };
  if (snippet) {
    base.snippet = snippet;
  }
  return [base];
}

function severityFor(beginnerFriendly: boolean): Finding['severity'] {
  return beginnerFriendly ? 'medium' : 'low';
}

export const labeledIssuesAnalyzer: Analyzer = {
  id: ID,
  version: VERSION,
  appliesTo(ctx) {
    return ctx.issues.length > 0;
  },
  async *run(ctx: AnalyzerContext): AsyncIterable<Finding> {
    const wanted = new Set<string>([
      ...ctx.labels.beginner.map((label) => label.toLowerCase()),
      ...ctx.labels.docs.map((label) => label.toLowerCase()),
      ...ctx.labels.bug.map((label) => label.toLowerCase())
    ]);

    const beginnerSet = new Set(ctx.labels.beginner.map((label) => label.toLowerCase()));
    const inProgress = buildInProgress(ctx.pulls);

    for (const issue of ctx.issues) {
      if (issue.state !== 'open') continue;
      if (issue.assignees.length > 0) continue;
      if (inProgress.has(issue.number)) continue;
      if (!isInteresting(issue.labels, wanted)) continue;

      const beginnerFriendly = issue.labels.some((label) =>
        beginnerSet.has(label.toLowerCase())
      );

      const hint = beginnerFriendly
        ? 'Labelled as beginner friendly. Suitable for a first contribution.'
        : undefined;

      const finding: Finding = {
        analyzer: ID,
        analyzerVersion: VERSION,
        type: 'labeled_issue',
        title: issue.title,
        summary: issue.body ? issue.body.slice(0, 500) : 'No description on the issue.',
        severity: severityFor(beginnerFriendly),
        confidence: 0.9,
        evidence: evidenceFor(issue),
        files: [],
        fingerprint: `${ID}:${issue.number}`
      };

      if (hint) {
        finding.suggestedFixHint = hint;
      }

      yield finding;
    }
  }
};