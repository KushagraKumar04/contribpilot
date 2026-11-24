import { describe, expect, it } from 'vitest';
import { EMPTY_REPO_RULES } from '@contribpilot/shared';
import { docsGapsAnalyzer } from './docsGaps';
import type { AnalyzerContext } from '../types';

const noopLog = { info() {}, warn() {}, error() {} };

const sections = [
  { id: 'installation', label: 'Installation', aliases: ['install', 'installation', 'getting started', 'setup'] },
  { id: 'usage', label: 'Usage', aliases: ['usage', 'how to use', 'example', 'examples'] },
  { id: 'contributing', label: 'Contributing', aliases: ['contributing', 'contribute'] },
  { id: 'license', label: 'License', aliases: ['license', 'licence'] }
];

function ctx(readme: string, readmePath = 'README.md'): AnalyzerContext {
  return {
    snapshot: { owner: 'o', name: 'r', defaultBranch: 'main', commitSha: 'abc', files: [] },
    issues: [],
    pulls: [],
    rules: EMPTY_REPO_RULES,
    docs: {
      readmePath,
      readmeText: readme,
      contributingPath: '',
      contributingText: '',
      codeOfConductText: '',
      prTemplateText: ''
    },
    tree: [],
    docsGapsSections: sections,
    communityFiles: [],
    labels: { beginner: [], docs: [], bug: [] },
    log: noopLog
  };
}

async function collect(c: AnalyzerContext) {
  const out = [];
  for await (const finding of docsGapsAnalyzer.run(c)) {
    out.push(finding);
  }
  return out;
}

describe('docsGapsAnalyzer', () => {
  it('applies only when a README exists', () => {
    expect(docsGapsAnalyzer.appliesTo(ctx(''))).toBe(false);
    expect(docsGapsAnalyzer.appliesTo(ctx('# Title'))).toBe(true);
  });

  it('flags a missing section', async () => {
    const findings = await collect(ctx('# Title\n\nSome content.'));
    expect(findings.some((finding) => finding.fingerprint.endsWith(':installation'))).toBe(true);
  });

  it('does not flag an existing section', async () => {
    const readme = '# Title\n\n## Installation\n\n## Usage\n\n## Contributing\n\n## License\n';
    const findings = await collect(ctx(readme));
    expect(findings.length).toBe(0);
  });

  it('matches aliased headings', async () => {
    const readme = '# Title\n\n## Getting Started\n\n## Examples\n\n## Contribute\n\n## MIT License\n';
    const findings = await collect(ctx(readme));
    expect(findings.length).toBe(0);
  });

  it('ignores headings inside fenced code blocks', async () => {
    const readme = '# Title\n\n```\n## Installation\n```\n';
    const findings = await collect(ctx(readme));
    expect(findings.some((finding) => finding.fingerprint.endsWith(':installation'))).toBe(true);
  });

  it('produces one finding per missing section with the actual readme path', async () => {
    const findings = await collect(ctx('# Title'));
    expect(findings.length).toBe(4);
    for (const finding of findings) {
      expect(finding.files).toEqual(['README.md']);
    }
  });

  it('uses the lowercase readme path when that is what exists', async () => {
    const findings = await collect(ctx('# Title', 'readme.md'));
    expect(findings.length).toBe(4);
    for (const finding of findings) {
      expect(finding.files).toEqual(['readme.md']);
      expect(finding.title.startsWith('readme.md')).toBe(true);
    }
  });
});