import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const shared = {
  migrations: {
    directory: path.join(here, 'migrations'),
    loadExtensions: ['.js'],
  },
  seeds: {
    directory: path.join(here, 'seeds'),
    loadExtensions: ['.js'],
  },
};

function sqliteConfig() {
  if (env.sqliteFile !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(env.sqliteFile)), { recursive: true });
  }
  return {
    ...shared,
    client: 'better-sqlite3',
    connection: { filename: env.sqliteFile },
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: 1,
      // SQLite não aplica FOREIGN KEY sem este pragma
      afterCreate: (conn, done) => {
        conn.pragma('foreign_keys = ON');
        conn.pragma('journal_mode = WAL');
        done();
      },
    },
  };
}

function postgresConfig() {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL é obrigatório quando DB_CLIENT=pg.');
  }
  return {
    ...shared,
    client: 'pg',
    connection: {
      connectionString: env.databaseUrl,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
    },
    pool: { min: 0, max: 10 },
  };
}

export function buildKnexConfig() {
  return env.dbClient === 'pg' ? postgresConfig() : sqliteConfig();
}
