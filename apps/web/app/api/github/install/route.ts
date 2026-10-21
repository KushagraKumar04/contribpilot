import { getConfig } from '@contribpilot/config';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session) {
    redirect('/signin');
  }
  const config = getConfig();
  const appName = config.github.appId ? 'contribpilot' : 'contribpilot';
  const url = `https://github.com/apps/${appName}/installations/new?state=${session.user.id}`;
  redirect(url);
}