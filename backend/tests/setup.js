import { afterAll, beforeAll } from 'vitest';
import { db } from '../src/database/connection.js';

beforeAll(async () => {
  // SQLite em memória já começa vazio; no PostgreSQL de teste zeramos o schema
  if (process.env.DB_CLIENT === 'pg') await db.migrate.rollback(undefined, true);
  await db.migrate.latest();
  await db.seed.run();
});

afterAll(async () => {
  await db.destroy();
});
