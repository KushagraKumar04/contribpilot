import { z } from 'zod';
import { Effort } from '@contribpilot/shared';

export const ClassifyIssueOutput = z.object({
  actionable: z.boolean(),
  effort: Effort,
  beginnerFriendly: z.boolean(),
  reasoning: z.string().min(1).max(600),
  suggestedPlan: z.array(z.string().min(1)).min(1).max(8)
});

export type ClassifyIssueOutput = z.infer<typeof ClassifyIssueOutput>;

export const EnrichFindingOutput = z.object({
  rationale: z.string().min(1).max(800),
  plan: z.array(z.string().min(1)).min(1).max(8),
  effort: Effort
});

export type EnrichFindingOutput = z.infer<typeof EnrichFindingOutput>;

export const PatchFileEntry = z.object({
  path: z.string().min(1),
  action: z.enum(['modify', 'create', 'delete']),
  newContent: z.string()
});

export const DraftPatchOutput = z.object({
  summary: z.string().min(1).max(400),
  rationale: z.string().min(1).max(1200),
  files: z.array(PatchFileEntry).min(1).max(10),
  testsAdded: z.boolean(),
  risks: z.array(z.string().max(300)).max(10),
  commitMessage: z.string().min(1).max(200),
  prTitle: z.string().min(1).max(200),
  prBody: z.string().min(1).max(6000)
});

export type DraftPatchOutput = z.infer<typeof DraftPatchOutput>;

export const ExtractRulesOutput = z.object({
  issueFirst: z.boolean(),
  claRequired: z.boolean(),
  dcoRequired: z.boolean(),
  aiPolicy: z.enum(['allowed', 'disclosure_required', 'prohibited', 'unknown']),
  branchNaming: z.string().max(200).optional(),
  commitConvention: z.enum(['conventional', 'gitmoji', 'freeform', 'dco', 'unknown']),
  requiredChecks: z.array(z.string().max(200)).max(20),
  setupCommands: z.array(z.string().max(200)).max(10),
  lintCommands: z.array(z.string().max(200)).max(10),
  testCommands: z.array(z.string().max(200)).max(10),
  styleNotes: z.array(z.string().max(200)).max(20),
  evidenceQuotes: z.array(z.string().max(300)).max(10)
});

export type ExtractRulesOutput = z.infer<typeof ExtractRulesOutput>;