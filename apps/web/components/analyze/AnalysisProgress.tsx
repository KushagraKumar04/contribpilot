'use client';

import { useEffect, useRef, useState } from 'react';
import { AnalysisResults } from './AnalysisResults';

interface ProgressState {
  step: string;
  label: string;
  current: number;
  total: number;
}

interface SseMessage {
  type: string;
  [key: string]: unknown;
}

interface LogEntry {
  seq: number;
  event: SseMessage;
}

export function AnalysisProgress({ analysisId }: { analysisId: string }) {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [events, setEvents] = useState<SseMessage[]>([]);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSeqRef = useRef(0);

  useEffect(() => {
    const source = new EventSource(`/api/analysis/${analysisId}/stream`);

    const handleMessage = (raw: string) => {
      try {
        const entry = JSON.parse(raw) as LogEntry;
        if (entry.seq <= lastSeqRef.current) {
          return;
        }
        lastSeqRef.current = entry.seq;
        const data = entry.event;
        setEvents((prev) => [...prev, data]);
        if (data.type === 'progress') {
          setProgress(data as unknown as ProgressState);
        } else if (data.type === 'complete') {
          setComplete(true);
        } else if (data.type === 'error') {
          setError(typeof data.message === 'string' ? data.message : 'Analysis failed');
        }
      } catch {
        /* ignore malformed */
      }
    };

    source.onmessage = (event) => {
      handleMessage(event.data);
    };

    source.onerror = () => {
      if (!complete) {
        setError('Connection to analysis stream failed');
      }
      source.close();
    };

    return () => {
      source.close();
    };
  }, [analysisId, complete]);

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Analyzing repository</h1>
      <p className="mt-2 font-mono text-xs text-subtle-foreground">{analysisId}</p>

      {progress ? (
        <div className="mt-8">
          <div className="flex items-baseline justify-between text-sm">
            <span>{progress.label}</span>
            <span className="font-mono text-xs text-subtle-foreground">
              {progress.current}/{progress.total}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress.current}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            className="mt-2 h-1.5 overflow-hidden rounded-sm bg-muted"
          >
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">Waiting for the worker to start.</p>
      )}

      {complete ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Analysis complete.
        </p>
      ) : null}

      <AnalysisResults analysisId={analysisId} enabled={complete} />

      {error ? (
        <p role="alert" className="mt-6 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <details className="mt-8">
        <summary className="cursor-pointer text-sm text-muted-foreground">Raw events</summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs">
{JSON.stringify(events, null, 2)}
        </pre>
      </details>
    </section>
  );
}