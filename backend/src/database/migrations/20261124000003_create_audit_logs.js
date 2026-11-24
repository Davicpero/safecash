/**
 * Etapa 3 — Trilha de auditoria (append-only).
 * Cada criação, edição, exclusão lógica, restauração e login gera uma linha
 * com o estado antes e depois. A API não expõe rota para alterar ou apagar esta tabela.
 */
export async function up(knex) {
  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.string('entity', 40).notNullable();
    table.integer('entity_id');
    table.string('action', 20).notNullable();
    table.integer('user_id').references('id').inTable('users');
    table.text('before_data');
    table.text('after_data');
    table.string('reason', 255);
    table.string('ip', 64);
    table.string('request_id', 64);
    table.timestamp('created_at', { useTz: true }).notNullable();
  });
}

export async function down(knex) {
  await knex.schema.dropTable('audit_logs');
}
