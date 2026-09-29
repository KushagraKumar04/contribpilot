import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { AnalysisProgress } from '@/components/analyze/AnalysisProgress';

interface PageProps {
  params: Promise<{ analysisId: string }>;
}

export const metadata: Metadata = { title: 'Analyzing repository' };

export default async function AnalyzePage({ params }: PageProps) {
  const { analysisId } = await params;
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <AnalysisProgress analysisId={analysisId} />
        </div>
      </main>
      <Footer />
    </div>
  );
}