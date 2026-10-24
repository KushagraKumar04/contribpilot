'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTRPC } from '@/lib/trpc/client';

interface Props {
  opportunityId: string;
  initial: number | null;
  signedIn: boolean;
}

function ThumbsUp() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 7v6H2a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2Zm0 0 3-4.5A1.5 1.5 0 0 1 8.5 2h.6a1 1 0 0 1 .95 1.32L9.5 6h3a1 1 0 0 1 .97 1.24l-1 5A1 1 0 0 1 11.5 13H4V7Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbsDown() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M11 8V2h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2Zm0 0-3 4.5A1.5 1.5 0 0 1 6.5 13h-.6a1 1 0 0 1-.95-1.32L5.5 9h-3a1 1 0 0 1-.97-1.24l1-5A1 1 0 0 1 3.5 2H11v6Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OpportunityFeedback({ opportunityId, initial, signedIn }: Props) {
  const trpc = useTRPC();
  const [rating, setRating] = useState<number | null>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRating(initial);
  }, [initial]);

  const submit = useMutation(
    trpc.opportunities.feedback.mutationOptions({
      onSuccess: (_data, variables) => {
        setRating(variables.rating);
        setError(null);
      },
      onError: (err) => {
        setError(err.message);
      }
    })
  );

  if (!signedIn) {
    return (
      <p className="text-xs text-subtle-foreground">Sign in to rate this opportunity.</p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs uppercase tracking-wider text-subtle-foreground">
        Was this useful
      </span>
      <button
        type="button"
        aria-label="Useful"
        aria-pressed={rating === 1}
        disabled={submit.isPending}
        onClick={() => submit.mutate({ opportunityId, rating: 1 })}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-sm border transition-colors ${
          rating === 1
            ? 'border-accent bg-accent text-accent-foreground'
            : 'border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <ThumbsUp />
      </button>
      <button
        type="button"
        aria-label="Not useful"
        aria-pressed={rating === -1}
        disabled={submit.isPending}
        onClick={() => submit.mutate({ opportunityId, rating: -1 })}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-sm border transition-colors ${
          rating === -1
            ? 'border-accent bg-accent text-accent-foreground'
            : 'border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <ThumbsDown />
      </button>
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}