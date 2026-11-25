import { config as loadEnv } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
loadEnv({ path: resolve(here, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function run(): Promise<void> {
  const db = drizzle(pool);
  const migrationsFolder = resolve(here, '../migrations');
  console.log('Applying migrations from', migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log('Migrations applied successfully');
  await pool.end();
}

run().catch(async (error) => {
  console.error('Migration failed:');
  console.error(error);
  await pool.end();
  process.exit(1);
});