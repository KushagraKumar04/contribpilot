import { GitHubLogoIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signIn } from '@/lib/auth';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

async function signInAction() {
  'use server';
  await signIn('github', { redirectTo: '/' });
}

export default async function SignInPage() {
  const session = await auth();
  if (session) {
    redirect('/');
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-md px-4 py-20 sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to ContribPilot</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            You sign in with GitHub. Reading public repositories works without an account. Signing
            in lets you save analyses, draft changes and track pull requests.
          </p>
          <form action={signInAction} className="mt-8">
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              <GitHubLogoIcon aria-hidden="true" />
              Sign in with GitHub
            </button>
          </form>
          <p className="mt-6 text-xs leading-relaxed text-subtle-foreground">
            We request only read:user and user:email. Repository write access is requested later,
            only when you use automatic pull request creation. See the{' '}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}