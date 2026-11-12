import type { LLMProvider } from '../types';
import { SYSTEM_PREAMBLE } from '../prompts/system';
import { DraftPatchOutput } from '../prompts/schemas';

const PROMPT_VERSION = 'draft_patch_v2';

export interface DraftPatchFileContext {
  path: string;
  content: string;
}

export interface DraftPatchInput {
  repoFullName: string;
  defaultBranch: string;
  opportunityTitle: string;
  opportunitySummary: string;
  opportunityPlan: string[];
  files: DraftPatchFileContext[];
  styleNotes: string[];
  commitConvention: string;
  dcoRequired: boolean;
  aiDisclosureText: string;
  aiDisclosureRequired: boolean;
}

export interface DraftPatchFile {
  path: string;
  action: 'modify' | 'create' | 'delete';
  newContent: string;
}

export interface DraftPatchResult {
  summary: string;
  rationale: string;
  files: DraftPatchFile[];
  testsAdded: boolean;
  risks: string[];
  commitMessage: string;
  prTitle: string;
  prBody: string;
}

const MAX_FILE_CHARS = 6000;
const MAX_TOTAL_CHARS = 20000;

function renderFiles(files: DraftPatchFileContext[]): string {
  let total = 0;
  const blocks: string[] = [];
  for (const file of files) {
    const remaining = MAX_TOTAL_CHARS - total;
    if (remaining <= 0) break;
    const slice = file.content.slice(0, Math.min(MAX_FILE_CHARS, remaining));
    total += slice.length;
    blocks.push(`FILE ${file.path}\n"""\n${slice}\n"""`);
  }
  return blocks.join('\n\n');
}

export async function draftPatch(
  provider: LLMProvider,
  userId: string,
  input: DraftPatchInput
): Promise<DraftPatchResult> {
  const planText = input.opportunityPlan.map((step, index) => `${index + 1}. ${step}`).join('\n');
  const styleText =
    input.styleNotes.length > 0
      ? input.styleNotes.map((note) => `- ${note}`).join('\n')
      : '(no style notes)';

  const disclosureLine = input.aiDisclosureRequired
    ? `AI assistance must be disclosed. Use this exact line in the pull request body: "${input.aiDisclosureText}".`
    : 'AI assistance disclosure is not required by the repository policy.';

  const fileNames = input.files.map((file) => file.path).join(', ');

  const user = `Task: draft a minimal patch that resolves the given contribution opportunity.

<repo_data>
Repository: ${input.repoFullName}
Default branch: ${input.defaultBranch}
Commit convention: ${input.commitConvention}
Sign-off required: ${input.dcoRequired ? 'yes' : 'no'}

Opportunity title: ${input.opportunityTitle}
Opportunity summary: ${input.opportunitySummary}

Suggested plan:
${planText}

Style notes:
${styleText}

${disclosureLine}

Current file contents (paths relative to repository root):
${renderFiles(input.files)}
</repo_data>

You must return the NEW complete content of each file after your change. Do NOT return a diff.

Return JSON with these keys:
- summary: one short sentence describing the change.
- rationale: one short paragraph explaining why the change helps.
- files: array of objects. Each object has three keys:
    "path": the file path, one of: ${fileNames}
    "action": "modify" for an existing file, "create" for a new file, "delete" to remove a file
    "newContent": the complete new content of the file as a string. For "delete", use an empty string.
- testsAdded: true if you added or updated a test.
- risks: short array of risk notes. Empty array if none.
- commitMessage: single line commit message following the repository convention.
- prTitle: short pull request title.
- prBody: markdown body. Explain what changed, why, and how it was tested.

Example of a valid "files" entry:
{ "path": "${input.files[0]?.path ?? 'README.md'}", "action": "modify", "newContent": "..." }

Rules:
- Preserve the file exactly as given except for the specific change. Do not reformat unrelated code.
- Do not touch lockfiles, generated output, minified files, or binary files.
- Keep the change small and focused.
- Write original content. Do not copy from other projects.
- Match the file's existing style and the repository's conventions.
- Return only JSON matching the schema.`;

  const result = await provider.json({
    task: 'draft_patch',
    system: SYSTEM_PREAMBLE,
    user,
    schema: DraftPatchOutput,
    promptVersion: PROMPT_VERSION,
    userId,
    cacheKey: `draft:${input.repoFullName}:${input.opportunityTitle}:${fileNames}`,
    maxTokens: 6000,
    temperature: 0.1,
    reasoningEffort: 'low'
  });

  return result;
}