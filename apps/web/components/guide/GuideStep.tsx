'use client';

import { useEffect, useState } from 'react';
import { CommandBlock } from '@/components/ui/CommandBlock';
import type { GuideStep as GuideStepType } from '@contribpilot/guide';

interface Props {
  step: GuideStepType;
  total: number;
  done: boolean;
  onToggle: (id: number) => void;
}

export function GuideStep({ step, total, done, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const stepNumber = String(step.id).padStart(2, '0');
  const totalLabel = String(total).padStart(2, '0');

  useEffect(() => {
    if (done) {
      setOpen(false);
    }
  }, [done]);

  function handleToggleDone(): void {
    const next = !done;
    onToggle(step.id);
    if (next) {
      setOpen(false);
    }
  }

  return (
    <li className="border-b border-border">
      <div className="flex items-start gap-4 py-5">
        <button
          type="button"
          onClick={handleToggleDone}
          aria-label={done ? `Mark step ${step.id} as not done` : `Mark step ${step.id} as done`}
          aria-pressed={done}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border transition-colors ${
            done
              ? 'border-accent bg-accent text-accent-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {done ? (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M2 6.5L5 9.5L10 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex flex-1 items-baseline justify-between gap-4 text-left"
        >
          <div>
            <p className="font-mono text-xs text-subtle-foreground">
              {stepNumber}/{totalLabel}
            </p>
            <h3
              className={`mt-1 text-base font-medium ${done ? 'text-muted-foreground' : ''}`}
            >
              {step.title}
            </h3>
          </div>
          <span className="text-xs text-subtle-foreground">{open ? 'Hide' : 'Show'}</span>
        </button>
      </div>

      {open ? (
        <div className="pb-6 pl-10 pr-2">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{step.why}</p>

          {step.commands.length > 0 ? (
            <div className="mt-4 space-y-3">
              {step.commands.map((cmd, index) => (
                <CommandBlock key={index} label={cmd.label} command={cmd.command} />
              ))}
            </div>
          ) : null}

          {step.notes.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {step.notes.map((note, index) => (
                <li key={index} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-subtle-foreground"
                  />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}