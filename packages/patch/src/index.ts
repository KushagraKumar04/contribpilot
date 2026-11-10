export { applyPatchToFiles, type AppliedFile } from './applyPatch';
export { buildDeletedFileDiff, buildNewFileDiff, buildUnifiedDiff } from './build';
export { addedLines, countLines, parsePatch } from './parse';
export { checkFileAllowed, checkPathSafe, type PathCheckResult } from './policy';
export { scanAddedLines, type SecretFinding } from './secrets';
export { gitApplyCheck, summarize, validatePatchShape } from './validate';
export type {
  BaseFileContents,
  CheckStatus,
  Hunk,
  HunkLine,
  HunkLineType,
  ParsedFilePatch,
  ParsedPatch,
  PatchCheck,
  PatchValidationReport
} from './types';