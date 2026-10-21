import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { auth } from '@/lib/auth';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getConfig } from '@contribpilot/config';
import { DraftWorkspace } from '@/components/workspace/DraftWorkspace';

interface PageProps {
  params: Promise<{ draftId: string }>;
}

export const metadata: Metadata = { title: 'Workspace' };

export default async function WorkspacePage({ params }: PageProps) {
  const { draftId } = await params;
  const session = await auth();
  if (!session) {
    redirect('/signin');
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon aria-hidden="true" />
            Home
          </Link>
          <DraftWorkspace draftId={draftId} autoPrEnabled={getConfig().features.autoPr} />
        </div>
      </main>
      <Footer />
    </div>
  );
}