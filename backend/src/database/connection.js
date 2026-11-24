import knex from 'knex';
import { buildKnexConfig } from './knexConfig.js';

// O driver "pg" devolve SUM/COUNT como string (bigint). Normalizamos para Number
// em toNumber() nos repositórios; aqui só criamos a conexão única da aplicação.
export const db = knex(buildKnexConfig());

export async function migrateLatest() {
  await db.migrate.latest();
}

export async function closeDatabase() {
  await db.destroy();
}
