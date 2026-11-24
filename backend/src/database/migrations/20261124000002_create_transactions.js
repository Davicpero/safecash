/**
 * Etapa 3 — Transações.
 *
 * Decisões de integridade:
 * - amount_cents INTEGER: dinheiro em centavos, nunca float (evita 0.1 + 0.2 = 0.30000000000000004).
 * - CHECK amount_cents > 0: o valor é sempre absoluto; o sinal vem de "type".
 * - deleted_at / deleted_by: soft delete (Regra de Ouro, H1). Não existe DELETE físico na API.
 * - created_by / updated_by: rastreabilidade de quem criou e de quem alterou.
 * - version: trava otimista. Duas pessoas editando o mesmo registro não se sobrescrevem.
 * - idempotency_key UNIQUE: o mesmo envio repetido (duplo clique, retry de rede) não duplica lançamento.
 */
export async function up(knex) {
  await knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.string('description', 140).notNullable();
    table.integer('amount_cents').notNullable();
    table.string('type', 10).notNullable();
    table.string('category', 60).notNullable();
    table.string('transaction_date', 10).notNullable(); // AAAA-MM-DD
    table.text('notes');
    table.string('idempotency_key', 80).unique();
    table.integer('version').notNullable().defaultTo(1);

    table.integer('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable();
    table.integer('updated_by').references('id').inTable('users');
    table.timestamp('updated_at', { useTz: true });
    table.integer('deleted_by').references('id').inTable('users');
    table.timestamp('deleted_at', { useTz: true });

    table.check('?? > 0', ['amount_cents'], 'transactions_amount_positive');
    table.check("?? in ('INCOME', 'EXPENSE')", ['type'], 'transactions_type_check');
  });
}

export async function down(knex) {
  await knex.schema.dropTable('transactions');
}
