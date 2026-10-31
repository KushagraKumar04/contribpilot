import type { TrpcContext } from './init';
import { auth } from '../auth';

export async function createContext(req?: Request): Promise<TrpcContext> {
  const session = await auth();
  const ip =
    req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req?.headers.get('x-real-ip') ??
    null;
  return { session, ip };
}