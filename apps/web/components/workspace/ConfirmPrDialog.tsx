'use client';

import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (asDraft: boolean) => void;
  repoFullName: string;
  branch: string;
  files: Array<{ path: string; action: string }>;
  commitMessage: string;
  prTitle: string;
  prBody: string;
  pending: boolean;
  defaultDraft: boolean;
}

export function ConfirmPrDialog(props: Props) {
  const [asDraft, setAsDraft] = useState(props.defaultDraft);
  const [ack, setAck] = useState(false);

  if (!props.open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-pr-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
    >
      <div className="w-full max-w-lg rounded-md border border-border bg-background p-6">
        <h2 id="confirm-pr-heading" className="text-lg font-medium">
          Confirm pull request
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review each field. Nothing is pushed until you confirm below.
        </p>

        <dl className="mt-6 space-y-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-subtle-foreground">Repository</dt>
            <dd className="mt-1 font-mono">{props.repoFullName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-subtle-foreground">Branch</dt>
            <dd className="mt-1 font-mono">{props.branch}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-subtle-foreground">Files</dt>
            <dd className="mt-1">
              <ul className="space-y-1 font-mono text-xs">
                {props.files.map((file) => (
                  <li key={file.path}>
                    {file.action} {file.path}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-subtle-foreground">
              Commit message
            </dt>
            <dd className="mt-1 whitespace-pre-wrap font-mono text-xs">{props.commitMessage}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-subtle-foreground">PR title</dt>
            <dd className="mt-1">{props.prTitle}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-subtle-foreground">PR body</dt>
            <dd className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
              {props.prBody}
            </dd>
          </div>
        </dl>

        <label className="mt-6 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={asDraft}
            onChange={(event) => setAsDraft(event.target.checked)}
          />
          Open as draft pull request
        </label>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={ack}
            onChange={(event) => setAck(event.target.checked)}
            className="mt-1"
          />
          <span>
            I have reviewed the diff and the text above. I confirm this pull request should be
            opened on GitHub under my account.
          </span>
        </label>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={props.onClose}
            className="h-10 rounded-md border border-border px-4 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ack || props.pending}
            onClick={() => props.onConfirm(asDraft)}
            className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {props.pending ? 'Creating pull request' : 'Create pull request'}
          </button>
        </div>
      </div>
    </div>
  );
}