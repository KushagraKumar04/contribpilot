'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTRPC } from '@/lib/trpc/client';

interface Props {
  opportunityId: string;
  signedIn: boolean;
  hasFiles: boolean;
}

export function DraftButton({ opportunityId, signedIn, hasFiles }: Props) {
  const router = useRouter();
  const trpc = useTRPC();
  const [error, setError] = useState<string | null>(null);

  const start = useMutation(
    trpc.drafts.create.mutationOptions({
      onSuccess: (data) => {
        router.push(`/workspace/${data.draftId}`);
      },
      onError: (err) => {
        setError(err.message);
      }
    })
  );

  if (!signedIn) {
    return <p className="text-xs text-subtle-foreground">Sign in to draft a change with AI.</p>;
  }

  if (!hasFiles) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-sm opacity-60"
        >
          Draft change with AI
        </button>
        <p className="mt-2 max-w-md text-xs text-subtle-foreground">
          This opportunity does not name a specific file yet. It comes from an open issue. Open the
          issue on GitHub, confirm the file to change, then create the change manually using the
          step by step guide below.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={start.isPending}
        onClick={() => start.mutate({ opportunityId })}
        className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {start.isPending ? 'Starting' : 'Draft change with AI'}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}