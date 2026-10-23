'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc/client';

interface RulesShape {
  issueFirst?: boolean;
  claRequired?: boolean;
  dcoRequired?: boolean;
  aiPolicy?: string;
  commitConvention?: string;
  testCommands?: string[];
  evidenceQuotes?: string[];
}

interface ScoreBreakdown {
  impact: number;
  acceptance: number;
  freshness: number;
  ease: number;
  confidence: number;
  beginner: number;
  tolerance: number;
}

interface OpportunityShape {
  id: string;
  type: string;
  title: string;
  summary: string;
  severity: string;
  effort: string;
  beginner: boolean;
  score: number;
  files: string[];
  evidence: unknown[];
  plan: string[];
  scoreBreakdown?: ScoreBreakdown;
  inProgressBy?: Array<{ prNumber: number; url: string }>;
}

function RulesPanel({ rules }: { rules: RulesShape }) {
  const hasAny =
    rules.issueFirst ||
    rules.claRequired ||
    rules.dcoRequired ||
    (rules.aiPolicy && rules.aiPolicy !== 'unknown') ||
    (rules.testCommands && rules.testCommands.length > 0);

  if (!hasAny) return null;

  return (
    <section className="mt-8 rounded-md border border-border p-5">
      <h3 className="text-base font-medium">Repo rules</h3>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {rules.issueFirst ? <li>Open an issue before the pull request.</li> : null}
        {rules.claRequired ? <li>A CLA is required.</li> : null}
        {rules.dcoRequired ? <li>Commits must be signed off.</li> : null}
        {rules.aiPolicy && rules.aiPolicy !== 'unknown' ? (
          <li>AI policy: {rules.aiPolicy}</li>
        ) : null}
        {rules.commitConvention && rules.commitConvention !== 'unknown' ? (
          <li>Commit convention: {rules.commitConvention}</li>
        ) : null}
      </ul>
      {rules.testCommands && rules.testCommands.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-subtle-foreground">Tests</p>
          <ul className="mt-1 font-mono text-xs">
            {rules.testCommands.map((cmd) => (
              <li key={cmd}>{cmd}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {rules.evidenceQuotes && rules.evidenceQuotes.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs uppercase tracking-wider text-subtle-foreground">
            Evidence
          </summary>
          <ul className="mt-2 space-y-2 text-xs italic text-muted-foreground">
            {rules.evidenceQuotes.map((quote, index) => (
              <li key={index}>{quote}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function ScoreExplainer({ breakdown }: { breakdown: ScoreBreakdown }) {
  const entries: Array<[string, number]> = [
    ['acceptance', breakdown.acceptance],
    ['impact', breakdown.impact],
    ['ease', breakdown.ease],
    ['freshness', breakdown.freshness],
    ['confidence', breakdown.confidence],
    ['tolerance', breakdown.tolerance]
  ];
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs uppercase tracking-wider text-subtle-foreground">
        Why this ranks here
      </summary>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-baseline justify-between">
            <dt className="capitalize">{key}</dt>
            <dd className="font-mono">{value.toFixed(3)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function AnalysisResults({ analysisId, enabled }: { analysisId: string; enabled: boolean }) {
  const trpc = useTRPC();
  const result = useQuery(trpc.analysis.get.queryOptions({ analysisId }, { enabled }));

  if (!enabled) return null;

  if (result.isLoading) {
    return <p className="mt-6 text-sm text-muted-foreground">Loading results</p>;
  }

  if (result.error) {
    return (
      <p role="alert" className="mt-6 text-sm text-danger">
        {result.error.message}
      </p>
    );
  }

  const data = result.data;
  if (!data) {
    return <p className="mt-6 text-sm text-muted-foreground">Analysis record not found yet.</p>;
  }

  const opportunities = data.opportunities as unknown as OpportunityShape[];

  return (
    <div className="mt-10">
      <RulesPanel rules={(data.rules ?? {}) as RulesShape} />

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-medium">Opportunities</h2>
          <a
            href={`/analyze/${analysisId}/opportunities`}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Open full list
          </a>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {opportunities.length === 0
            ? 'No opportunities matched in this scan.'
            : `${opportunities.length} evidenced opportunities ranked by acceptance likelihood.`}
        </p>

        <ul className="mt-6 divide-y divide-border border-y border-border">
          {opportunities.map((opportunity) => {
            const inProgress = opportunity.inProgressBy?.[0];
            return (
              <li key={opportunity.id} className="py-6">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-base font-medium">{opportunity.title}</h3>
                  <span className="font-mono text-xs text-subtle-foreground">
                    score {Math.round(opportunity.score)}
                  </span>
                </div>

                {inProgress ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground">
                    In progress by PR #{inProgress.prNumber}
                  </p>
                ) : null}

                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {opportunity.summary}
                </p>

                {opportunity.plan.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-wider text-subtle-foreground">Plan</p>
                    <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                      {opportunity.plan.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-subtle-foreground">
                  <span className="font-mono">{opportunity.type}</span>
                  <span>effort {opportunity.effort}</span>
                  {opportunity.beginner ? <span>beginner friendly</span> : null}
                </div>

                {opportunity.scoreBreakdown ? (
                  <ScoreExplainer breakdown={opportunity.scoreBreakdown} />
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}