'use client';

import { ArrowRightIcon } from '@radix-ui/react-icons';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTRPC } from '@/lib/trpc/client';

interface Props {
  owner: string;
  name: string;
  signedIn: boolean;
}

export function StartAnalysisButton({ owner, name, signedIn }: Props) {
  const router = useRouter();
  const trpc = useTRPC();
  const [error, setError] = useState<string | null>(null);

  const start = useMutation(
    trpc.analysis.start.mutationOptions({
      onSuccess: (data) => {
        router.push(`/analyze/${data.analysisId}`);
      },
      onError: (err) => {
        setError(err.message);
      }
    })
  );

  if (!signedIn) {
    return (
      <div>
        <Link
          href="/signin"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Sign in to run analysis
          <ArrowRightIcon aria-hidden="true" />
        </Link>
        <p className="mt-2 text-xs text-subtle-foreground">
          Analysis stores results under your account so you can return to them later.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={start.isPending}
        onClick={() => start.mutate({ owner, name })}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {start.isPending ? 'Starting analysis' : 'Start analysis'}
        <ArrowRightIcon aria-hidden="true" />
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}