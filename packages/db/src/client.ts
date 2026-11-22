import { getConfig } from '@contribpilot/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let db: Db | undefined;

export function getDb(): Db {
  if (!db) {
    const config = getConfig();
    pool = new Pool({ connectionString: config.secrets.databaseUrl });
    db = drizzle(pool, { schema });
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    db = undefined;
  }
}