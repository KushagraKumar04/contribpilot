'use client';

import { CheckIcon, CopyIcon, DownloadIcon } from '@radix-ui/react-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTRPC } from '@/lib/trpc/client';

interface Props {
  draftId: string;
  patch: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function downloadPatch(draftId: string, patch: string): void {
  const blob = new Blob([patch], { type: 'text/x-patch' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `contribpilot-${draftId.slice(0, 8)}.patch`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ManualBundle({
  draftId,
  patch,
  commitMessage,
  prTitle,
  prBody
}: Props) {
  const trpc = useTRPC();
  const bundle = useQuery(trpc.drafts.bundle.queryOptions({ draftId }));

  const commands = bundle.data?.commands ?? '';
  const checklist = bundle.data?.checklist ?? '';
  const branchName = bundle.data?.branchName ?? '';

  return (
    <section className="space-y-6 border-t border-border pt-8">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Manual bundle</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Copy these into your terminal and browser. Nothing is pushed to GitHub from here.
        </p>
      </header>

      <article className="rounded-md border border-border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Patch file</p>
          <button
            type="button"
            onClick={() => downloadPatch(draftId, patch)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <DownloadIcon aria-hidden="true" />
            Download .patch
          </button>
        </div>
        <p className="mt-2 text-xs text-subtle-foreground">
          Save as {`contribpilot-${draftId.slice(0, 8)}.patch`} and apply with git apply.
        </p>
      </article>

      {bundle.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading commands</p>
      ) : null}

      {commands.length > 0 ? (
        <article className="rounded-md border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Git commands</p>
            <CopyButton label="commands" value={commands} />
          </div>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
            {commands}
          </pre>
        </article>
      ) : null}

      {branchName ? (
        <article className="rounded-md border border-border p-4">
          <p className="text-sm font-medium">Branch name</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <code className="font-mono text-sm">{branchName}</code>
            <CopyButton label="branch" value={branchName} />
          </div>
        </article>
      ) : null}

      <article className="rounded-md border border-border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Commit message</p>
          <CopyButton label="commit message" value={commitMessage} />
        </div>
        <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-sm">
          {commitMessage || 'Not generated'}
        </pre>
      </article>

      <article className="rounded-md border border-border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Pull request title</p>
          <CopyButton label="title" value={prTitle} />
        </div>
        <p className="mt-2 text-sm">{prTitle || 'Not generated'}</p>
      </article>

      <article className="rounded-md border border-border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Pull request body</p>
          <CopyButton label="body" value={prBody} />
        </div>
        <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
          {prBody || 'Not generated'}
        </pre>
      </article>

      {checklist.length > 0 ? (
        <article className="rounded-md border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Checklist</p>
            <CopyButton label="checklist" value={checklist} />
          </div>
          <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
            {checklist}
          </pre>
        </article>
      ) : null}

      <p className="text-xs text-subtle-foreground">
        Automation that forks, branches, commits and opens the pull request arrives in a later
        milestone, behind an explicit confirmation.
      </p>
    </section>
  );
}