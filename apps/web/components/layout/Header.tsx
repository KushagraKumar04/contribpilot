import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';

async function signOutAction() {
  'use server';
  await signOut({ redirectTo: '/' });
}

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-foreground"
          aria-label="ContribPilot home"
        >
          ContribPilot
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-6 text-sm">
          {session ? (
            <>
              <Link href="/prs" className="text-muted-foreground hover:text-foreground">
                My PRs
              </Link>
              <Link href="/settings" className="text-muted-foreground hover:text-foreground">
                Settings
              </Link>
              <span className="text-subtle-foreground">{session.user.name ?? session.user.email}</span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/signin" className="text-foreground">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}