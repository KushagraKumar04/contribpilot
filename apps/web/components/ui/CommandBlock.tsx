'use client';

import { CheckIcon, CopyIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

interface Props {
  command: string;
  label?: string;
}

export function CommandBlock({ command, label }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="group relative rounded-md border border-border bg-muted/40">
      {label ? (
        <div className="border-b border-border px-3 py-1.5 font-mono text-xs text-subtle-foreground">
          {label}
        </div>
      ) : null}
      <div className="flex items-start gap-3 px-3 py-2.5">
        <pre className="flex-1 overflow-x-auto font-mono text-sm leading-relaxed">{command}</pre>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy command'}
          className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}