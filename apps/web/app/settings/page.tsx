import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, schema, upsertInstallation } from '@contribpilot/db';
import { createAppOctokit } from '@contribpilot/github';
import { auth } from '@/lib/auth';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

interface PageProps {
  searchParams: Promise<{
    installation_id?: string;
    setup_action?: string;
    state?: string;
  }>;
}

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();
  if (!session) {
    redirect('/signin');
  }

  let registrationMessage: string | null = null;
  let registrationError: string | null = null;

  if (params.installation_id) {
    const installationId = Number(params.installation_id);
    if (!Number.isFinite(installationId)) {
      registrationError = 'Invalid installation id from GitHub';
    } else {
      try {
        const appOctokit = createAppOctokit();
        const response = await appOctokit.rest.apps.getInstallation({
          installation_id: installationId
        });
        const account = response.data.account;
        const accountLogin =
          account && 'login' in account && typeof account.login === 'string'
            ? account.login
            : 'unknown';

        const db = getDb();
        await upsertInstallation(db, {
          userId: session.user.id,
          installationId,
          accountLogin,
          permissions: response.data.permissions ?? {}
        });
        registrationMessage = `GitHub App installed on ${accountLogin}`;
      } catch (error) {
        registrationError = error instanceof Error ? error.message : 'Registration failed';
      }
    }
  }

  const db = getDb();
  const installationRows = await db
    .select()
    .from(schema.githubInstallations)
    .where(eq(schema.githubInstallations.userId, session.user.id))
    .limit(1);
  const installation = installationRows[0] ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

          {registrationMessage ? (
            <p role="status" className="mt-6 rounded-md border border-border p-4 text-sm">
              {registrationMessage}
            </p>
          ) : null}

          {registrationError ? (
            <p role="alert" className="mt-6 rounded-md border border-border p-4 text-sm text-danger">
              {registrationError}
            </p>
          ) : null}

          <section className="mt-8">
            <h2 className="text-lg font-medium">GitHub App</h2>
            {installation ? (
              <div className="mt-3 rounded-md border border-border p-4 text-sm">
                <p>
                  Installed as <span className="font-mono">{installation.accountLogin}</span>
                </p>
                <p className="mt-1 font-mono text-xs text-subtle-foreground">
                  installation id {installation.installationId}
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-md border border-border p-4 text-sm">
                <p className="text-muted-foreground">
                  Install the GitHub App to enable automatic pull request creation.
                </p>
                <a
                  href="/api/github/install"
                  className="mt-3 inline-block text-foreground underline underline-offset-4"
                >
                  Install the GitHub App
                </a>
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-medium">Account</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Signed in as <span className="font-mono">{session.user.login}</span>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}