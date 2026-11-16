import { describe, expect, it } from 'vitest';
import { EMPTY_REPO_RULES } from '@contribpilot/shared';
import { communityFilesAnalyzer } from './communityFiles';
import type { AnalyzerContext } from '../types';

const noopLog = { info() {}, warn() {}, error() {} };

const requirements = [
  { id: 'license', label: 'LICENSE', paths: ['LICENSE', 'LICENSE.md'] },
  { id: 'contributing', label: 'CONTRIBUTING.md', paths: ['CONTRIBUTING.md'] }
];

function ctx(tree: string[]): AnalyzerContext {
  return {
    snapshot: { owner: 'o', name: 'r', defaultBranch: 'main', commitSha: 'abc', files: [] },
    issues: [],
    pulls: [],
    rules: EMPTY_REPO_RULES,
    docs: {
      readmePath: '',
      readmeText: '',
      contributingPath: '',
      contributingText: '',
      codeOfConductText: '',
      prTemplateText: ''
    },
    tree,
    docsGapsSections: [],
    communityFiles: requirements,
    labels: { beginner: [], docs: [], bug: [] },
    log: noopLog
  };
}

async function collect(c: AnalyzerContext) {
  const out = [];
  for await (const finding of communityFilesAnalyzer.run(c)) {
    out.push(finding);
  }
  return out;
}

describe('communityFilesAnalyzer', () => {
  it('applies only when a tree is present', () => {
    expect(communityFilesAnalyzer.appliesTo(ctx([]))).toBe(false);
    expect(communityFilesAnalyzer.appliesTo(ctx(['README.md']))).toBe(true);
  });

  it('flags missing files', async () => {
    const findings = await collect(ctx(['README.md']));
    expect(findings.length).toBe(2);
  });

  it('does not flag files that exist', async () => {
    const findings = await collect(ctx(['LICENSE', 'CONTRIBUTING.md']));
    expect(findings.length).toBe(0);
  });

  it('matches alternate paths', async () => {
    const findings = await collect(ctx(['LICENSE.md']));
    expect(findings.some((finding) => finding.fingerprint.endsWith(':license'))).toBe(false);
  });

  it('produces findings with community_file type', async () => {
    const findings = await collect(ctx(['README.md']));
    for (const finding of findings) {
      expect(finding.type).toBe('community_file');
    }
  });
});