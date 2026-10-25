'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTRPC } from '@/lib/trpc/client';
import { ConfirmPrDialog } from './ConfirmPrDialog';

export function AutoPrSection({ draftId, enabled }: { draftId: string; enabled: boolean }) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prepare = useQuery(
    trpc.prs.prepare.queryOptions({ draftId }, { enabled })
  );

  const create = useMutation(
    trpc.prs.create.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        setError(null);
      },
      onError: (err) => {
        setError(err.message);
      }
    })
  );

  if (!enabled) {
    return (
      <section className="rounded-md border border-border p-5">
        <h2 className="text-lg font-medium">Open the pull request</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Automated pull requests are disabled in this environment. Use the manual bundle above.
        </p>
      </section>
    );
  }

  if (prepare.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading install state</p>;
  }

  if (prepare.error) {
    return (
      <section className="rounded-md border border-border p-5">
        <h2 className="text-lg font-medium">Open the pull request</h2>
        <p className="mt-2 text-sm text-danger">{prepare.error.message}</p>
        <a
          href="/api/github/install"
          className="mt-3 inline-block text-sm underline underline-offset-4"
        >
          Install the GitHub App
        </a>
      </section>
    );
  }

  const data = prepare.data;
  if (!data) return null;

  return (
    <section className="rounded-md border border-border p-5">
      <h2 className="text-lg font-medium">Open the pull request</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Create a fork, push a branch, and open the pull request on your behalf.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
      >
        Open pull request
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <ConfirmPrDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={(asDraft) =>
          create.mutate({ draftId, asDraft, confirm: true })
        }
        repoFullName={data.repoFullName}
        branch={data.branch}
        files={data.files}
        commitMessage={data.commitMessage}
        prTitle={data.prTitle}
        prBody={data.prBody}
        pending={create.isPending}
        defaultDraft={data.asDraft}
      />
    </section>
  );
}