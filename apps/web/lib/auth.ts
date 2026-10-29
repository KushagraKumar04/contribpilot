import 'next-auth';
import 'next-auth/jwt';
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { eq } from 'drizzle-orm';
import { getConfig } from '@contribpilot/config';
import { getDb, schema } from '@contribpilot/db';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      login: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    login?: string;
  }
}

interface GithubProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

function readAuthEnv(): { secret: string; clientId: string; clientSecret: string } {
  const config = getConfig();
  const secret = config.secrets.authSecret;
  const clientId = config.secrets.authGithubId;
  const clientSecret = config.secrets.authGithubSecret;

  if (!secret) {
    throw new Error('AUTH_SECRET is required to run the web app');
  }
  if (!clientId || !clientSecret) {
    throw new Error('AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are required to run the web app');
  }

  return { secret, clientId, clientSecret };
}

const authEnv = readAuthEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authEnv.secret,
  trustHost: getConfig().auth.trustHost,
  session: { strategy: 'jwt' },
  providers: [
    GitHub({
      clientId: authEnv.clientId,
      clientSecret: authEnv.clientSecret,
      authorization: { params: { scope: 'read:user user:email' } }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'github') {
        return false;
      }

      const githubProfile = profile as unknown as GithubProfile | undefined;
      const githubId = Number(githubProfile?.id ?? account.providerAccountId);
      if (!Number.isFinite(githubId)) {
        return false;
      }

      const db = getDb();
      const existing = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.githubId, githubId))
        .limit(1);

      const values = {
        githubId,
        login: githubProfile?.login ?? user.name ?? `user-${githubId}`,
        name: user.name ?? null,
        email: user.email ?? null,
        avatarUrl: user.image ?? githubProfile?.avatar_url ?? null
      };

      if (existing[0]) {
        await db.update(schema.users).set(values).where(eq(schema.users.id, existing[0].id));
      } else {
        await db.insert(schema.users).values(values);
      }

      return true;
    },
    async jwt({ token, profile }) {
      if (profile && !token.userId) {
        const githubProfile = profile as unknown as GithubProfile;
        const db = getDb();
        const found = await db
          .select({ id: schema.users.id, login: schema.users.login })
          .from(schema.users)
          .where(eq(schema.users.githubId, Number(githubProfile.id)))
          .limit(1);
        if (found[0]) {
          token.userId = found[0].id;
          token.login = found[0].login;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? '';
        session.user.login = token.login ?? '';
      }
      return session;
    }
  },
  pages: {
    signIn: '/signin'
  }
});