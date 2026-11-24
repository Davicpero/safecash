/**
 * CLI de banco: npm run db:migrate | db:rollback | db:seed | db:reset
 */
import { db } from './connection.js';

const command = process.argv[2];

const actions = {
  async migrate() {
    const [batch, files] = await db.migrate.latest();
    console.log(`Migrations aplicadas (lote ${batch}):`, files.length ? files : 'nenhuma pendente');
  },
  async rollback() {
    const [batch, files] = await db.migrate.rollback();
    console.log(`Rollback do lote ${batch}:`, files);
  },
  async seed() {
    const [files] = await db.seed.run();
    console.log('Seeds executados:', files);
  },
  async reset() {
    await db.migrate.rollback(undefined, true);
    await actions.migrate();
    await actions.seed();
  },
};

try {
  if (!actions[command]) {
    console.error(`Comando desconhecido: ${command}. Use migrate | rollback | seed | reset.`);
    process.exitCode = 1;
  } else {
    await actions[command]();
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
