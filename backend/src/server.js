import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabase, db, migrateLatest } from './database/connection.js';

await migrateLatest();
if (env.seedOnStart) await db.seed.run();

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`SafeCash API rodando em http://localhost:${env.port}`);
  console.log(`Documentação: http://localhost:${env.port}/api/docs`);
});

async function shutdown(signal) {
  console.log(`${signal} recebido, encerrando...`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  // conexões SSE ficam abertas; força a saída após 5s
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
