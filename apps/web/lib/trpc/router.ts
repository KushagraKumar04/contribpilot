import { router } from './init';
import { repoRouter } from './routers/repo';
import { analysisRouter } from './routers/analysis';
import { opportunitiesRouter } from './routers/opportunities';
import { draftsRouter } from './routers/drafts';
import { prsRouter } from './routers/prs';

export const appRouter = router({
  repo: repoRouter,
  analysis: analysisRouter,
  opportunities: opportunitiesRouter,
  drafts: draftsRouter,
  prs: prsRouter
});

export type AppRouter = typeof appRouter;