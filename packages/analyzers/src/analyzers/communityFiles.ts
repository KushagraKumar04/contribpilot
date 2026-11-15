import type { Evidence, Finding } from '@contribpilot/shared';
import type { Analyzer, AnalyzerContext } from '../types';

const ID = 'community-files';
const VERSION = '1';

function isPresent(tree: string[], paths: string[]): boolean {
  for (const candidate of paths) {
    const normalised = candidate.endsWith('/') ? candidate : candidate;
    for (const entry of tree) {
      if (entry === candidate) return true;
      if (normalised.endsWith('/') && entry.startsWith(normalised)) return true;
      if (entry.startsWith(`${normalised}/`)) return true;
    }
  }
  return false;
}

export const communityFilesAnalyzer: Analyzer = {
  id: ID,
  version: VERSION,
  appliesTo(ctx) {
    return ctx.tree.length > 0 && ctx.communityFiles.length > 0;
  },
  async *run(ctx: AnalyzerContext): AsyncIterable<Finding> {
    for (const requirement of ctx.communityFiles) {
      if (isPresent(ctx.tree, requirement.paths)) continue;

      const evidence: Evidence[] = [
        {
          kind: 'file',
          path: requirement.paths[0] ?? requirement.label,
          snippet: `Missing file. Expected one of: ${requirement.paths.join(', ')}`
        }
      ];

      const finding: Finding = {
        analyzer: ID,
        analyzerVersion: VERSION,
        type: 'community_file',
        title: `Repository is missing ${requirement.label}`,
        summary: `Open source projects normally include ${requirement.label}. Adding it helps contributors and users know what to expect.`,
        severity: 'low',
        confidence: 0.7,
        evidence,
        files: [],
        fingerprint: `${ID}:${requirement.id}`,
        suggestedFixHint: `Create ${requirement.paths[0] ?? requirement.label} at the repository root.`
      };

      yield finding;
    }
  }
};