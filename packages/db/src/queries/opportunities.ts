import { eq, desc } from 'drizzle-orm';
import type { Db } from '../client';
import { opportunities } from '../schema';

export interface InsertOpportunityInput {
  analysisId: string;
  fingerprint: string;
  type: string;
  title: string;
  summary: string;
  severity: string;
  confidence: number;
  effort: string;
  difficulty: number;
  impact: number;
  acceptance: number;
  freshness: number;
  duplicateRisk: number;
  beginner: boolean;
  score: number;
  scoreBreakdown: Record<string, number>;
  evidence: unknown[];
  files: string[];
  plan: string[];
  tolerance: string;
}

export async function insertOpportunities(
  db: Db,
  rows: InsertOpportunityInput[]
): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(opportunities).values(rows);
}

export async function listOpportunitiesForAnalysis(db: Db, analysisId: string) {
  return db
    .select()
    .from(opportunities)
    .where(eq(opportunities.analysisId, analysisId))
    .orderBy(desc(opportunities.score));
}