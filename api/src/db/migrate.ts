import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { createPool } from './db.module';

async function main() {
  const pool = createPool();
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: join(__dirname, '..', '..', 'drizzle') });
  await pool.end();
  console.log('Migraciones aplicadas');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
