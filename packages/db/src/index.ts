export * as schema from './schema';
export { closeDb, getDb, type Db } from './client';
export { upsertRepo } from './queries/repos';
export {
  createAnalysis,
  markAnalysisComplete,
  markAnalysisFailed
} from './queries/analyses';
export {
  insertOpportunities,
  listOpportunitiesForAnalysis,
  type InsertOpportunityInput
} from './queries/opportunities';
export { getLatestRepoRules, saveRepoRules, type SaveRepoRulesInput } from './queries/repoRules';
export {
  createDraft,
  getDraftForUser,
  listDraftsForUser,
  markDraftApproved,
  markDraftFailed,
  markDraftReady,
  type CreateDraftInput,
  type SaveDraftReadyInput
} from './queries/drafts';
export {
  createPullRequestRecord,
  findInstallationForUser,
  getPullRequestForUser,
  listPullRequestsForUser,
  markPullRequestFailed,
  markPullRequestOpen,
  upsertInstallation,
  writeAuditEntry,
  type AuditEntryInput,
  type CreatePullRequestInput,
  type MarkPullRequestOpenInput,
  type UpsertInstallationInput
} from './queries/pullRequests';