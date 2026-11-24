import bcrypt from 'bcryptjs';

/**
 * Dados de demonstração: 3 usuários (um por perfil) e ~6 meses de lançamentos.
 * Só executa em banco vazio, para nunca sobrescrever dados reais.
 */

export const DEMO_USERS = [
  { name: 'Ana Administradora', email: 'admin@safecash.dev', password: 'Admin@123', role: 'ADMIN' },
  { name: 'Otávio Operador', email: 'operador@safecash.dev', password: 'Operador@123', role: 'OPERATOR' },
  { name: 'Alice Auditora', email: 'auditor@safecash.dev', password: 'Auditor@123', role: 'AUDITOR' },
];

// [dia do mês, descrição, categoria, tipo, valor em centavos]
const MONTHLY_TEMPLATE = [
  [3, 'Recebimento de cliente - Contrato mensal', 'Clientes', 'INCOME', 1_850_000],
  [5, 'Pagamento de Aluguel', 'Aluguel', 'EXPENSE', 200_000],
  [7, 'Folha de pagamento', 'Pessoal', 'EXPENSE', 920_000],
  [10, 'Antecipação de recebíveis - taxa', 'Tarifas bancárias', 'EXPENSE', 38_750],
  [12, 'Assinatura de software (ERP)', 'Tecnologia', 'EXPENSE', 49_990],
  [15, 'Recebimento de cliente - Projeto avulso', 'Clientes', 'INCOME', 640_000],
  [18, 'Energia elétrica', 'Utilidades', 'EXPENSE', 31_245],
  [20, 'Impostos (DAS Simples Nacional)', 'Impostos', 'EXPENSE', 152_380],
  [24, 'Marketing digital', 'Marketing', 'EXPENSE', 75_000],
  [27, 'Rendimento de aplicação', 'Investimentos', 'INCOME', 12_874],
];

function isoDate(year, monthIndex, day) {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return date.toISOString().slice(0, 10);
}

export async function seed(knex) {
  const [{ total }] = await knex('users').count({ total: 'id' });
  if (Number(total) > 0) {
    console.log('Seed ignorado: o banco já possui usuários.');
    return;
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const userIds = {};
  for (const user of DEMO_USERS) {
    const [row] = await knex('users').insert({
      name: user.name,
      email: user.email,
      password_hash: await bcrypt.hash(user.password, 10),
      role: user.role,
      active: true,
      created_at: nowIso,
      updated_at: nowIso,
    }).returning('id');
    userIds[user.role] = typeof row === 'object' ? row.id : row;
  }

  const today = now.toISOString().slice(0, 10);
  const transactions = [];

  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo -= 1) {
    const year = now.getUTCFullYear();
    const monthIndex = now.getUTCMonth() - monthsAgo;
    // Pequena variação mês a mês para o gráfico não ficar "reto"
    const variation = 1 + ((5 - monthsAgo) % 3) * 0.06;

    for (const [day, description, category, type, cents] of MONTHLY_TEMPLATE) {
      const date = isoDate(year, monthIndex, day);
      if (date > today) continue;
      const amount = category === 'Aluguel' ? cents : Math.round(cents * variation);
      transactions.push({
        description, category, type,
        amount_cents: amount,
        transaction_date: date,
        notes: null,
        version: 1,
        created_by: userIds.OPERATOR,
        created_at: `${date}T12:00:00.000Z`,
      });
    }
  }

  for (const transaction of transactions) {
    const [row] = await knex('transactions').insert(transaction).returning('id');
    const id = typeof row === 'object' ? row.id : row;
    await knex('audit_logs').insert({
      entity: 'transaction',
      entity_id: id,
      action: 'CREATE',
      user_id: transaction.created_by,
      after_data: JSON.stringify({ id, ...transaction, source: 'seed' }),
      reason: 'Carga inicial de demonstração',
      created_at: transaction.created_at,
    });
  }

  console.log(`Seed concluído: ${DEMO_USERS.length} usuários e ${transactions.length} transações.`);
}
