import type { AiPolicy, CommitConvention } from '@contribpilot/shared';
import type { LLMProvider } from '../types';
import { SYSTEM_PREAMBLE } from '../prompts/system';
import { ExtractRulesOutput } from '../prompts/schemas';

const PROMPT_VERSION = 'extract_rules_v2';

export interface ExtractRulesInput {
  repoFullName: string;
  defaultBranch: string;
  contributingText: string;
  prTemplateText: string;
  ciWorkflowText: string;
  readmeText: string;
  codeOfConductText: string;
}

export interface ExtractRulesResult {
  issueFirst: boolean;
  claRequired: boolean;
  dcoRequired: boolean;
  aiPolicy: AiPolicy;
  branchNaming?: string | undefined;
  commitConvention: CommitConvention;
  requiredChecks: string[];
  setupCommands: string[];
  lintCommands: string[];
  testCommands: string[];
  styleNotes: string[];
  evidenceQuotes: string[];
}

export async function extractRules(
  provider: LLMProvider,
  userId: string,
  input: ExtractRulesInput
): Promise<ExtractRulesResult> {
  const user = `Task: extract contribution rules and developer workflow from repository documentation.

<repo_data>
Repository: ${input.repoFullName}
Default branch: ${input.defaultBranch}

CONTRIBUTING document:
${input.contributingText.slice(0, 6000) || '(not present)'}

Pull request template:
${input.prTemplateText.slice(0, 3000) || '(not present)'}

Primary CI workflow:
${input.ciWorkflowText.slice(0, 4000) || '(not present)'}

README:
${input.readmeText.slice(0, 4000) || '(not present)'}

Code of conduct:
${input.codeOfConductText.slice(0, 2000) || '(not present)'}
</repo_data>

Return JSON with these keys:
- issueFirst: true only if the docs ask contributors to open an issue before a pull request.
- claRequired: true only if a CLA is required.
- dcoRequired: true only if Signed-off-by or DCO is required.
- aiPolicy: allowed, disclosure_required, prohibited or unknown.
- branchNaming: short description of a stated branch naming rule.
- commitConvention: conventional, gitmoji, freeform, dco or unknown.
- requiredChecks: list of named required checks in CI docs, empty if none.
- setupCommands, lintCommands, testCommands: exact shell commands that appear in the docs, one per string. Include package manager commands, make targets, npm scripts. Empty array if none stated.
- styleNotes: short notes on style that are explicitly stated.
- evidenceQuotes: verbatim quotes under 300 characters each that support your decisions. Include the source file name in brackets at the start of each quote, for example "[CONTRIBUTING.md] Run pnpm test before pushing".

Read every document above. Prefer explicit statements. Do not infer from general convention.`;

  const result = await provider.json({
    task: 'extract_rules',
    system: SYSTEM_PREAMBLE,
    user,
    schema: ExtractRulesOutput,
    promptVersion: PROMPT_VERSION,
    userId,
    cacheKey: `rules:${input.repoFullName}:${input.contributingText.length}:${input.readmeText.length}:${input.prTemplateText.length}:${input.ciWorkflowText.length}`,
    maxTokens: 4000,
    temperature: 0,
    reasoningEffort: 'low'
  });

  return result;
}