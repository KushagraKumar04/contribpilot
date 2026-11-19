import { labeledIssuesAnalyzer } from './analyzers/labeledIssues';
import { docsGapsAnalyzer } from './analyzers/docsGaps';
import { communityFilesAnalyzer } from './analyzers/communityFiles';
import type { Analyzer } from './types';

export const ANALYZERS: Analyzer[] = [
  labeledIssuesAnalyzer,
  docsGapsAnalyzer,
  communityFilesAnalyzer
];

export function analyzerVersionMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const analyzer of ANALYZERS) {
    map[analyzer.id] = analyzer.version;
  }
  return map;
}

export function analyzerVersionHash(): string {
  const parts = ANALYZERS.map((a) => `${a.id}@${a.version}`).sort();
  return parts.join('|');
}