/** Etapa 3 — Usuários (necessários para a trilha "quem criou / quem alterou"). */
export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name', 120).notNullable();
    table.string('email', 160).notNullable().unique();
    table.string('password_hash', 120).notNullable();
    table.string('role', 20).notNullable().defaultTo('OPERATOR')
      .checkIn(['ADMIN', 'OPERATOR', 'AUDITOR'], 'users_role_check');
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable();
    table.timestamp('updated_at', { useTz: true }).notNullable();
  });
}

export async function down(knex) {
  await knex.schema.dropTable('users');
}
