'use client';

import { useEffect, useState } from 'react';
import type { Guide } from '@contribpilot/guide';
import { GuideStep } from './GuideStep';

const STORAGE_PREFIX = 'guide:progress:';

interface Props {
  opportunityId: string;
  guide: Guide;
}

export function GuideStepper({ opportunityId, guide }: Props) {
  const storageKey = `${STORAGE_PREFIX}${opportunityId}`;
  const [done, setDone] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setDone(parsed.filter((value): value is number => typeof value === 'number'));
        }
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [storageKey]);

  function persist(next: number[]): void {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function onToggle(id: number): void {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id];
      persist(next);
      return next;
    });
  }

  async function copyChecklist(): Promise<void> {
    try {
      await navigator.clipboard.writeText(guide.checklistMarkdown);
    } catch {
      /* ignore */
    }
  }

  const doneCount = done.length;
  const total = guide.steps.length;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Step by step pull request guide</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {ready
              ? `${doneCount} of ${total} steps marked done`
              : `Loading progress`}
          </p>
        </div>
        <button
          type="button"
          onClick={copyChecklist}
          className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
        >
          Copy checklist
        </button>
      </div>

      <ol className="mt-6 border-t border-border">
        {guide.steps.map((step) => (
          <GuideStep
            key={step.id}
            step={step}
            total={total}
            done={done.includes(step.id)}
            onToggle={onToggle}
          />
        ))}
      </ol>
    </section>
  );
}