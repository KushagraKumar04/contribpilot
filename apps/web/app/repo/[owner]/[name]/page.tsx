import type { Metadata } from 'next';
import { getConfig } from '@contribpilot/config';
import { AppError, AppErrorCode } from '@contribpilot/shared';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { RepoHeader } from '@/components/repo/RepoHeader';
import { RepoWarnings } from '@/components/repo/RepoWarnings';
import { StartAnalysisButton } from '@/components/repo/StartAnalysisButton';
import { getGithubProvider } from '@/lib/github';
import { mapGithubError } from '@/lib/github-errors';
import { auth } from '@/lib/auth';

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, name } = await params;
  return { title: `${owner}/${name}` };
}

const ERROR_HEADINGS: Record<string, string> = {
  [AppErrorCode.REPO_NOT_FOUND]: 'Repository not found',
  [AppErrorCode.REPO_PRIVATE]: 'Repository is not available',
  [AppErrorCode.GITHUB_PERMISSION]: 'GitHub denied access',
  [AppErrorCode.RATE_LIMITED]: 'GitHub is throttling',
  [AppErrorCode.INTERNAL]: 'Could not load repository'
};

function ErrorPanel({ error }: { error: AppError }) {
  const heading = ERROR_HEADINGS[error.code] ?? 'Something went wrong';
  return (
    <section role="alert">
      <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {error.message}
      </p>
    </section>
  );
}

export default async function RepoPage({ params }: PageProps) {
  const { owner, name } = await params;
  const config = getConfig();
  const session = await auth();

  let meta;
  try {
    meta = await getGithubProvider().getRepo({ owner, name });
  } catch (raw) {
    const error = mapGithubError(raw);
    return (
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <ErrorPanel error={error} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6">
          <RepoHeader meta={meta} />
          <RepoWarnings meta={meta} inactiveMonthsWarning={config.analysis.inactiveMonthsWarning} />

          <section className="rounded-md border border-border p-6">
            <h2 className="text-lg font-medium">Analyze this repository</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Run the analysis to scan this repository for evidenced contribution opportunities.
              The worker streams its progress.
            </p>
            <div className="mt-5">
              <StartAnalysisButton
                owner={meta.owner}
                name={meta.name}
                signedIn={Boolean(session)}
              />
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}