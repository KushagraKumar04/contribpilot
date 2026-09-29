import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createContext } from '@/lib/trpc/context';
import { appRouter } from '@/lib/trpc/router';

function handler(req: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req)
  });
}

export { handler as GET, handler as POST };