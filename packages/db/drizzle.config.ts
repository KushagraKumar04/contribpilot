import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { loadConfig } from '@contribpilot/config';
import type { Config } from 'drizzle-kit';

const here = fileURLToPath(new URL('.', import.meta.url));
loadEnv({ path: resolve(here, '../../.env') });

const appConfig = loadConfig();

export default {
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url: appConfig.secrets.databaseUrl }
} satisfies Config;