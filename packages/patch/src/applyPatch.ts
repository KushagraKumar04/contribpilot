import type { BaseFileContents } from './types';
import { parsePatch } from './parse';

export interface AppliedFile {
  path: string;
  content: string;
}

export function applyPatchToFiles(
  baseFiles: Array<{ target: string; content: string }>,
  patch: string
): AppliedFile[] {
  const parsed = parsePatch(patch);
  const baseMap = new Map<string, string>();
  for (const file of baseFiles) {
    baseMap.set(file.target, file.content);
  }

  const out: AppliedFile[] = [];

  for (const file of parsed.files) {
    const target = file.isDelete ? file.oldPath : file.newPath;
    if (file.isDelete) {
      continue;
    }
    const base = baseMap.get(target) ?? '';
    const baseLines = base.split('\n');
    if (baseLines.length > 0 && baseLines[baseLines.length - 1] === '') {
      baseLines.pop();
    }

    let output: string[] = [];
    let cursor = 0;

    for (const hunk of file.hunks) {
      const start = Math.max(0, hunk.oldStart - 1);
      while (cursor < start) {
        output.push(baseLines[cursor] ?? '');
        cursor += 1;
      }
      for (const line of hunk.lines) {
        if (line.type === 'context') {
          output.push(baseLines[cursor] ?? line.content);
          cursor += 1;
        } else if (line.type === 'remove') {
          cursor += 1;
        } else if (line.type === 'add') {
          output.push(line.content);
        }
      }
    }
    while (cursor < baseLines.length) {
      output.push(baseLines[cursor] ?? '');
      cursor += 1;
    }

    out.push({ path: target, content: output.join('\n') });
  }

  return out;
}