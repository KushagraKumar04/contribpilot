import { describe, expect, it } from 'vitest';
import { EMPTY_REPO_RULES } from '@contribpilot/shared';
import type { Issue, Pull } from '@contribpilot/github';
import { labeledIssuesAnalyzer } from './labeledIssues';
import type { AnalyzerContext } from '../types';

const noopLog = {
  info() {},
  warn() {},
  error() {}
};

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
    number: 1,
    title: 'Fix docs',
    body: 'Some body',
    state: 'open',
    labels: [],
    comments: 0,
    assignees: [],
    authorLogin: 'user',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    htmlUrl: 'https://github.com/owner/repo/issues/1',
    ...overrides
  };
}

function makePull(overrides: Partial<Pull>): Pull {
  return {
    number: 10,
    title: 'Fix',
    body: null,
    state: 'open',
    draft: false,
    merged: false,
    authorLogin: 'user',
    baseRef: 'main',
    headRef: 'fix',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    mergedAt: null,
    htmlUrl: 'https://github.com/owner/repo/pull/10',
    ...overrides
  };
}

function makeContext(issues: Issue[], pulls: Pull[] = []): AnalyzerContext {
  return {
    snapshot: {
      owner: 'owner',
      name: 'repo',
      defaultBranch: 'main',
      commitSha: 'abc',
      files: []
    },
    issues,
    pulls,
    rules: EMPTY_REPO_RULES,
    docs: {
      readmePath: '',
      readmeText: '',
      contributingPath: '',
      contributingText: '',
      codeOfConductText: '',
      prTemplateText: ''
    },
    tree: [],
    docsGapsSections: [],
    communityFiles: [],
    labels: {
      beginner: ['good first issue', 'help wanted', 'easy', 'beginner'],
      docs: ['documentation', 'docs'],
      bug: ['bug', 'defect']
    },
    log: noopLog
  };
}

async function collect(ctx: AnalyzerContext) {
  const out = [];
  for await (const finding of labeledIssuesAnalyzer.run(ctx)) {
    out.push(finding);
  }
  return out;
}

describe('labeledIssuesAnalyzer', () => {
  it('applies only when issues exist', () => {
    expect(labeledIssuesAnalyzer.appliesTo(makeContext([]))).toBe(false);
    expect(labeledIssuesAnalyzer.appliesTo(makeContext([makeIssue({})]))).toBe(true);
  });

  it('emits a finding for an unassigned labelled issue', async () => {
    const ctx = makeContext([makeIssue({ number: 7, labels: ['good first issue'] })]);
    const findings = await collect(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.type).toBe('labeled_issue');
    expect(findings[0]?.fingerprint).toBe('labeled-issues:7');
    expect(findings[0]?.suggestedFixHint).toBeDefined();
  });

  it('skips issues with assignees', async () => {
    const ctx = makeContext([
      makeIssue({ number: 7, labels: ['bug'], assignees: ['someone'] })
    ]);
    expect(await collect(ctx)).toHaveLength(0);
  });

  it('skips issues already referenced by an open pull request', async () => {
    const ctx = makeContext(
      [makeIssue({ number: 42, labels: ['bug'] })],
      [makePull({ number: 50, body: 'Fixes #42' })]
    );
    expect(await collect(ctx)).toHaveLength(0);
  });

  it('ignores issues without a matching label', async () => {
    const ctx = makeContext([makeIssue({ number: 5, labels: ['question'] })]);
    expect(await collect(ctx)).toHaveLength(0);
  });

  it('matches labels case-insensitively', async () => {
    const ctx = makeContext([makeIssue({ number: 6, labels: ['Good First Issue'] })]);
    const findings = await collect(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('medium');
  });

  it('emits one finding per matching issue', async () => {
    const ctx = makeContext([
      makeIssue({ number: 1, labels: ['bug'] }),
      makeIssue({ number: 2, labels: ['documentation'] }),
      makeIssue({ number: 3, labels: ['question'] })
    ]);
    const findings = await collect(ctx);
    expect(findings.map((f) => f.fingerprint)).toEqual([
      'labeled-issues:1',
      'labeled-issues:2'
    ]);
  });

  it('trims very long bodies in summary', async () => {
    const longBody = 'x'.repeat(2000);
    const ctx = makeContext([makeIssue({ number: 9, labels: ['bug'], body: longBody })]);
    const findings = await collect(ctx);
    expect(findings[0]?.summary.length).toBeLessThanOrEqual(500);
  });
});