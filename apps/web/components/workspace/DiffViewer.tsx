'use client';

import { useMemo } from 'react';

interface HunkLine {
  type: 'add' | 'remove' | 'context' | 'meta';
  content: string;
}

interface Hunk {
  oldStart: number;
  newStart: number;
  lines: HunkLine[];
}

interface ParsedFile {
  oldPath: string;
  newPath: string;
  hunks: Hunk[];
}

function parse(patch: string): ParsedFile[] {
  const lines = patch.split(/\r?\n/);
  const files: ParsedFile[] = [];
  let current: ParsedFile | null = null;
  let hunk: Hunk | null = null;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (current) files.push(current);
      current = { oldPath: '', newPath: '', hunks: [] };
      hunk = null;
      continue;
    }
    if (!current) continue;
    if (line.startsWith('--- ')) {
      const value = line.slice(4).trim().replace(/^a\//, '');
      current.oldPath = value === '/dev/null' ? '' : value;
      continue;
    }
    if (line.startsWith('+++ ')) {
      const value = line.slice(4).trim().replace(/^b\//, '');
      current.newPath = value === '/dev/null' ? '' : value;
      continue;
    }
    const header = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (header) {
      hunk = { oldStart: Number(header[1]), newStart: Number(header[2]), lines: [] };
      current.hunks.push(hunk);
      continue;
    }
    if (!hunk) continue;
    if (line === '') continue;
    if (line === '\\ No newline at end of file') {
      hunk.lines.push({ type: 'meta', content: line });
    } else if (line.startsWith('+')) {
      hunk.lines.push({ type: 'add', content: line.slice(1) });
    } else if (line.startsWith('-')) {
      hunk.lines.push({ type: 'remove', content: line.slice(1) });
    } else if (line.startsWith(' ')) {
      hunk.lines.push({ type: 'context', content: line.slice(1) });
    }
  }
  if (current) files.push(current);
  return files;
}

function lineClass(type: HunkLine['type']): string {
  if (type === 'add') return 'bg-accent/10 text-foreground';
  if (type === 'remove') return 'bg-danger/5 text-muted-foreground';
  if (type === 'meta') return 'text-subtle-foreground italic';
  return 'text-muted-foreground';
}

function prefix(type: HunkLine['type']): string {
  if (type === 'add') return '+';
  if (type === 'remove') return '-';
  if (type === 'meta') return '';
  return ' ';
}

export function DiffViewer({ patch }: { patch: string }) {
  const files = useMemo(() => parse(patch), [patch]);

  if (files.length === 0) {
    return <p className="text-sm text-muted-foreground">No diff content.</p>;
  }

  return (
    <div className="space-y-6">
      {files.map((file, index) => (
        <section key={index} className="overflow-hidden rounded-md border border-border">
          <header className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
            <p className="font-mono text-xs text-foreground">
              {file.newPath || file.oldPath || 'file'}
            </p>
            <span className="font-mono text-xs text-subtle-foreground">
              +{file.hunks.reduce((sum, hunk) => sum + hunk.lines.filter((line) => line.type === 'add').length, 0)}
              {' '}
              -
              {file.hunks.reduce((sum, hunk) => sum + hunk.lines.filter((line) => line.type === 'remove').length, 0)}
            </span>
          </header>
          <div className="overflow-x-auto">
            <pre className="min-w-full font-mono text-xs leading-relaxed">
              {file.hunks.map((hunk, hunkIndex) => (
                <div key={hunkIndex}>
                  <div className="bg-muted/30 px-3 py-1 text-subtle-foreground">
                    @@ -{hunk.oldStart} +{hunk.newStart} @@
                  </div>
                  {hunk.lines.map((line, lineIndex) => (
                    <div key={lineIndex} className={`px-3 py-0.5 ${lineClass(line.type)}`}>
                      <span className="select-none text-subtle-foreground">{prefix(line.type)}</span>
                      <span className="ml-2 whitespace-pre-wrap break-words">{line.content}</span>
                    </div>
                  ))}
                </div>
              ))}
            </pre>
          </div>
        </section>
      ))}
    </div>
  );
}