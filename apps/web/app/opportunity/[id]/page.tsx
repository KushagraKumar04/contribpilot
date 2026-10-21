import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ArrowLeftIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { getDb, schema } from '@contribpilot/db';
import { auth } from '@/lib/auth';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { EvidenceSnippet } from '@/components/opportunity/EvidenceSnippet';
import { ScoreBreakdown } from '@/components/opportunity/ScoreBreakdown';
import { OpportunityFeedback } from '@/components/opportunity/OpportunityFeedback';
import { DraftButton } from '@/components/opportunity/DraftButton';
import { GuideStepper } from '@/components/guide/GuideStepper';
import { generateGuide } from '@contribpilot/guide';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Opportunity' };

async function loadOpportunity(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.opportunities)
    .where(eq(schema.opportunities.id, id))
    .limit(1);
  return rows[0] ?? null;
}

async function loadRepoForAnalysis(analysisId: string) {
  const db = getDb();
  const rows = await db
    .select({
      owner: schema.repos.owner,
      name: schema.repos.name,
      defaultBranch: schema.repos.defaultBranch
    })
    .from(schema.analyses)
    .innerJoin(schema.repos, eq(schema.repos.id, schema.analyses.repoId))
    .where(eq(schema.analyses.id, analysisId))
    .limit(1);
  return rows[0] ?? null;
}

async function loadRulesForAnalysis(analysisId: string) {
  const db = getDb();
  const rows = await db
    .select({
      commitSha: schema.analyses.commitSha,
      repoId: schema.analyses.repoId
    })
    .from(schema.analyses)
    .where(eq(schema.analyses.id, analysisId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const rulesRows = await db
    .select({ rules: schema.repoRules.rules })
    .from(schema.repoRules)
    .where(eq(schema.repoRules.repoId, row.repoId))
    .limit(1);
  return rulesRows[0]?.rules ?? null;
}

export default async function OpportunityPage({ params }: PageProps) {
  const { id } = await params;
  const opportunity = await loadOpportunity(id);
  if (!opportunity) notFound();

  const repo = await loadRepoForAnalysis(opportunity.analysisId);
  const rules = await loadRulesForAnalysis(opportunity.analysisId);
  const session = await auth();

  const evidence = (opportunity.evidence ?? []) as Array<Record<string, unknown>>;
  const plan = (opportunity.plan ?? []) as string[];
  const files = (opportunity.files ?? []) as string[];
  const breakdown = (opportunity.scoreBreakdown ?? {}) as Record<string, number>;
  const inProgress = Array.isArray(opportunity.inProgress)
    ? (opportunity.inProgress as Array<{ prNumber: number; url: string }>)
    : [];

  const linkedIssue = opportunity.linkedIssue as { number: number } | null | undefined;

  const rulesTyped = (rules ?? {}) as {
    issueFirst?: boolean;
    claRequired?: boolean;
    dcoRequired?: boolean;
    branchNaming?: string;
    commitConvention?: string;
    setupCommands?: string[];
    lintCommands?: string[];
    testCommands?: string[];
    requiredChecks?: string[];
  };

  const guide = repo
    ? generateGuide({
        owner: repo.owner,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        repoFullName: `${repo.owner}/${repo.name}`,
        userLogin: session?.user?.login ?? 'your-username',
        rules: {
          issueFirst: Boolean(rulesTyped.issueFirst),
          claRequired: Boolean(rulesTyped.claRequired),
          dcoRequired: Boolean(rulesTyped.dcoRequired),
          branchNaming: rulesTyped.branchNaming,
          commitConvention: rulesTyped.commitConvention ?? 'unknown',
          setupCommands: rulesTyped.setupCommands ?? [],
          lintCommands: rulesTyped.lintCommands ?? [],
          testCommands: rulesTyped.testCommands ?? [],
          requiredChecks: rulesTyped.requiredChecks ?? []
        },
        opportunity: {
          title: opportunity.title,
          type: opportunity.type,
          files: files
        },
        linkedIssueNumber: linkedIssue?.number
      })
    : null;

  const repoLabel = repo ? `${repo.owner}/${repo.name}` : null;
  const githubFileUrl =
    repo && files.length > 0
      ? `https://github.com/${repo.owner}/${repo.name}/blob/${repo.defaultBranch}/${files[0]}`
      : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <Link
            href={`/analyze/${opportunity.analysisId}/opportunities`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon aria-hidden="true" />
            Back to opportunities
          </Link>

          {repoLabel ? (
            <p className="mt-6 font-mono text-xs text-subtle-foreground">{repoLabel}</p>
          ) : null}

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{opportunity.title}</h1>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-subtle-foreground">
            <span className="font-mono">{opportunity.type}</span>
            <span>effort {opportunity.effort}</span>
            <span>difficulty {opportunity.difficulty}/5</span>
            <span>score {Math.round(opportunity.score)}</span>
            {opportunity.beginner ? <span>beginner friendly</span> : null}
          </div>

          {inProgress.length > 0 ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-sm border border-border px-3 py-1.5 text-xs text-muted-foreground">
              In progress by
              {inProgress.map((pr) => (
                <a
                  key={pr.prNumber}
                  href={pr.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-4"
                >
                  PR #{pr.prNumber}
                </a>
              ))}
            </p>
          ) : null}

          <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {opportunity.summary}
          </div>

          {plan.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-lg font-medium">Plan</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-relaxed">
                {plan.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="text-lg font-medium">Evidence</h2>
            <div className="mt-3">
              <EvidenceSnippet
                items={
                  evidence as Array<{
                    kind?: string;
                    path?: string;
                    url?: string;
                    snippet?: string;
                    startLine?: number;
                    endLine?: number;
                  }>
                }
              />
            </div>
          </section>

          {files.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-lg font-medium">Files</h2>
              <ul className="mt-3 space-y-1 font-mono text-sm">
                {files.map((file) => (
                  <li key={file} className="flex items-center gap-2">
                    {file}
                    {repo ? (
                      <a
                        href={`https://github.com/${repo.owner}/${repo.name}/blob/${repo.defaultBranch}/${file}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Open ${file} on GitHub`}
                        className="text-subtle-foreground hover:text-foreground"
                      >
                        <ExternalLinkIcon aria-hidden="true" />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="text-lg font-medium">Why this ranks here</h2>
            <div className="mt-3">
              <ScoreBreakdown breakdown={breakdown} defaultOpen />
            </div>
          </section>

          <section className="mt-10 border-t border-border pt-6">
            <OpportunityFeedback
              opportunityId={opportunity.id}
              initial={opportunity.feedback ?? null}
              signedIn={Boolean(session)}
            />
          </section>

          {guide ? <GuideStepper opportunityId={opportunity.id} guide={guide} /> : null}

          <section className="mt-10 rounded-md border border-border p-6">
            <h2 className="text-lg font-medium">Draft change with AI</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Draft a patch, review the diff, and run the quality gate before anything is pushed.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <DraftButton
                opportunityId={opportunity.id}
                signedIn={Boolean(session)}
                hasFiles={files.length > 0}
              />
              {githubFileUrl ? (
                <a
                  href={githubFileUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm hover:text-foreground"
                >
                  Open on GitHub
                  <ExternalLinkIcon aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}