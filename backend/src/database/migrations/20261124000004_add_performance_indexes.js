/**
 * Etapa 9 — Índices para as consultas mais frequentes:
 * - listagem/filtros por data, tipo e categoria (sempre com deleted_at IS NULL);
 * - agregações do dashboard por mês;
 * - histórico de auditoria de um registro.
 */
export async function up(knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.index(['deleted_at', 'transaction_date'], 'idx_transactions_active_date');
    table.index(['deleted_at', 'type'], 'idx_transactions_active_type');
    table.index(['category'], 'idx_transactions_category');
    table.index(['created_by'], 'idx_transactions_created_by');
  });
  await knex.schema.alterTable('audit_logs', (table) => {
    table.index(['entity', 'entity_id'], 'idx_audit_entity');
    table.index(['created_at'], 'idx_audit_created_at');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('audit_logs', (table) => {
    table.dropIndex(['entity', 'entity_id'], 'idx_audit_entity');
    table.dropIndex(['created_at'], 'idx_audit_created_at');
  });
  await knex.schema.alterTable('transactions', (table) => {
    table.dropIndex(['deleted_at', 'transaction_date'], 'idx_transactions_active_date');
    table.dropIndex(['deleted_at', 'type'], 'idx_transactions_active_type');
    table.dropIndex(['category'], 'idx_transactions_category');
    table.dropIndex(['created_by'], 'idx_transactions_created_by');
  });
}
