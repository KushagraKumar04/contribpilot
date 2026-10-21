import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { OpportunitiesList } from '@/components/opportunity/OpportunitiesList';

interface PageProps {
  params: Promise<{ analysisId: string }>;
}

export const metadata: Metadata = { title: 'Opportunities' };

export default async function OpportunitiesPage({ params }: PageProps) {
  const { analysisId } = await params;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <Link
            href={`/analyze/${analysisId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon aria-hidden="true" />
            Back to analysis
          </Link>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Opportunities</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every item points to evidence inside the repository. Filters apply without a page reload.
          </p>

          <OpportunitiesList analysisId={analysisId} />
        </div>
      </main>
      <Footer />
    </div>
  );
}