import type { Finding, RepoRules } from '@contribpilot/shared';
import type { Issue, Pull } from '@contribpilot/github';

export interface FileEntry {
  path: string;
  size: number;
  text?: string;
}

export interface RepoSnapshot {
  owner: string;
  name: string;
  defaultBranch: string;
  commitSha: string;
  files: FileEntry[];
}

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export interface RepoDocBundle {
  readmePath: string;
  readmeText: string;
  contributingPath: string;
  contributingText: string;
  codeOfConductText: string;
  prTemplateText: string;
}

export interface DocsGapSection {
  id: string;
  label: string;
  aliases: string[];
}

export interface CommunityFileRequirement {
  id: string;
  label: string;
  paths: string[];
}

export interface AnalyzerContext {
  snapshot: RepoSnapshot;
  issues: Issue[];
  pulls: Pull[];
  rules: RepoRules;
  docs: RepoDocBundle;
  tree: string[];
  docsGapsSections: DocsGapSection[];
  communityFiles: CommunityFileRequirement[];
  labels: {
    beginner: string[];
    docs: string[];
    bug: string[];
  };
  log: Logger;
}

export interface Analyzer {
  id: string;
  version: string;
  appliesTo(ctx: AnalyzerContext): boolean;
  run(ctx: AnalyzerContext): AsyncIterable<Finding>;
}