'use client';

import { ArrowRightIcon } from '@radix-ui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTRPC } from '@/lib/trpc/client';
import { DiffViewer } from './DiffViewer';
import { QualityGatePanel } from './QualityGatePanel';
import { ManualBundle } from './ManualBundle';
import { AutoPrSection } from './AutoPrSection';



interface Check {
  id: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

interface QualityReport {
  checks?: Check[];
  passed?: boolean;
}

interface PatchMeta {
  summary?: string;
  rationale?: string;
  commitMessage?: string;
  prTitle?: string;
  prBody?: string;
  risks?: string[];
  testsAdded?: boolean;
}

function readProgress(event: unknown): { label: string; current: number; total: number } | null {
  if (!event || typeof event !== 'object') return null;
  const candidate = event as { type?: string; label?: string; current?: number; total?: number };
  if (candidate.type !== 'progress') return null;
  if (
    typeof candidate.label !== 'string' ||
    typeof candidate.current !== 'number' ||
    typeof candidate.total !== 'number'
  ) {
    return null;
  }
  return { label: candidate.label, current: candidate.current, total: candidate.total };
}

export function DraftWorkspace({
  draftId,
  autoPrEnabled
}: {
  draftId: string;
  autoPrEnabled: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<{ label: string; current: number; total: number } | null>(
    null
  );
  const [streamError, setStreamError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [patchText, setPatchText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const draftQuery = useQuery(
    trpc.drafts.get.queryOptions({ draftId }, { refetchInterval: 3000 })
  );

  useEffect(() => {
    const source = new EventSource(`/api/drafts/${draftId}/stream`);
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as { event: unknown };
        const next = readProgress(parsed.event);
        if (next) setProgress(next);
        const type = (parsed.event as { type?: string }).type;
        if (type === 'ready') {
          queryClient.invalidateQueries();
          source.close();
        }
      } catch {
        /* ignore */
      }
    };
    source.onerror = () => {
      setStreamError('Live updates disconnected. Reload the page to refresh.');
      source.close();
    };
    return () => {
      source.close();
    };
  }, [draftId, queryClient]);

  const editPatch = useMutation(
    trpc.drafts.editPatch.mutationOptions({
      onSuccess: () => {
        setEditing(false);
        setEditError(null);
        queryClient.invalidateQueries();
      },
      onError: (err) => {
        setEditError(err.message);
      }
    })
  );

  const approve = useMutation(
    trpc.drafts.approve.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
      }
    })
  );

  const data = draftQuery.data;

  if (draftQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading draft</p>;
  }

  if (!data) {
    return <p className="text-sm text-danger">Draft not found.</p>;
  }

  const meta = (data.patchMeta ?? {}) as PatchMeta;
  const quality = (data.qualityReport ?? {}) as QualityReport;
  const checks = quality.checks ?? [];
  const passed = quality.passed ?? false;

  if (data.status === 'generating') {
    return (
      <section className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Drafting change</h1>
        {progress ? (
          <div className="mt-6">
            <div className="flex items-baseline justify-between text-sm">
              <span>{progress.label}</span>
              <span className="font-mono text-xs text-subtle-foreground">
                {progress.current}/{progress.total}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-muted">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Waiting for the worker.</p>
        )}
        {streamError ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {streamError}
          </p>
        ) : null}
      </section>
    );
  }

  if (data.status === 'failed') {
    return (
      <section className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Draft failed</h1>
        <p className="mt-3 text-sm text-danger">
          {(data.patchMeta as { error?: string } | null)?.error ?? 'Unknown error'}
        </p>
      </section>
    );
  }

  const patch = data.patch ?? '';
  const approved = data.status === 'approved';

  return (
    <section className="mt-6 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review the diff carefully. Nothing is pushed until you confirm.
        </p>
      </header>

      {meta.summary ? (
        <section className="rounded-md border border-border p-5">
          <h2 className="text-sm font-medium">What the AI proposes</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{meta.summary}</p>
          {meta.rationale ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{meta.rationale}</p>
          ) : null}
          <p className="mt-3 text-xs text-subtle-foreground">
            AI-generated, review before submitting.
          </p>
        </section>
      ) : null}

      <QualityGatePanel checks={checks} passed={passed} />

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Diff</h2>
          {editing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditError(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => editPatch.mutate({ draftId, patch: patchText })}
                disabled={editPatch.isPending}
                className="text-xs text-foreground underline underline-offset-4"
              >
                {editPatch.isPending ? 'Saving' : 'Save patch'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPatchText(patch);
                setEditing(true);
              }}
              disabled={approved}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              Edit patch
            </button>
          )}
        </div>

        {editing ? (
          <div className="mt-3">
            <label htmlFor="patch-editor" className="sr-only">
              Edit unified diff
            </label>
            <textarea
              id="patch-editor"
              value={patchText}
              onChange={(event) => setPatchText(event.target.value)}
              spellCheck={false}
              rows={20}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed"
            />
            {editError ? (
              <p role="alert" className="mt-2 text-xs text-danger">
                {editError}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-3">
            <DiffViewer patch={patch} />
          </div>
        )}
      </section>

      {meta.risks && meta.risks.length > 0 ? (
        <section>
          <h2 className="text-lg font-medium">Risks flagged by the model</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {meta.risks.map((risk, index) => (
              <li key={index}>{risk}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-md border border-border p-5">
        <h2 className="text-lg font-medium">Commit and pull request text</h2>
        <dl className="mt-4 space-y-4">
          <div>
            <dt className="text-xs uppercase tracking-wider text-subtle-foreground">
              Commit message
            </dt>
            <dd className="mt-1 font-mono text-sm">{meta.commitMessage ?? 'Not generated'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-subtle-foreground">
              Pull request title
            </dt>
            <dd className="mt-1 text-sm">{meta.prTitle ?? 'Not generated'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-subtle-foreground">
              Pull request body
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {meta.prBody ?? 'Not generated'}
            </dd>
          </div>
        </dl>
      </section>

      {!approved ? (
        <section className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={!passed || approve.isPending}
            onClick={() => approve.mutate({ draftId })}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            Approve patch
            <ArrowRightIcon aria-hidden="true" />
          </button>
          <p className="text-xs text-subtle-foreground sm:ml-2">
            Approving unlocks the manual bundle and automated pull request.
          </p>
        </section>
      ) : (
        <>
          <ManualBundle
            draftId={draftId}
            patch={patch}
            commitMessage={meta.commitMessage ?? ''}
            prTitle={meta.prTitle ?? ''}
            prBody={meta.prBody ?? ''}
          />
          <AutoPrSection draftId={draftId} enabled={autoPrEnabled} />
        </>
      )}
    </section>
  );
}