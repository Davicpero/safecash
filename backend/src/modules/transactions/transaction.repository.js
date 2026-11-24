import { db } from '../../database/connection.js';
import { fromCents, toNumber } from '../../utils/money.js';
import { SORTABLE_FIELDS } from './transaction.schemas.js';

/**
 * Camada de acesso a dados: só aqui existe SQL de transações.
 * As consultas usam apenas funções portáveis (SUM, CASE, SUBSTR, LOWER)
 * para rodar igual em SQLite (desenvolvimento) e PostgreSQL (produção).
 */

const BASE_COLUMNS = [
  't.id', 't.description', 't.amount_cents', 't.type', 't.category', 't.transaction_date',
  't.notes', 't.version', 't.created_at', 't.updated_at', 't.deleted_at',
  'cu.id as created_by_id', 'cu.name as created_by_name',
  'uu.id as updated_by_id', 'uu.name as updated_by_name',
  'du.id as deleted_by_id', 'du.name as deleted_by_name',
];

function baseQuery(conn = db) {
  return conn('transactions as t')
    .leftJoin('users as cu', 'cu.id', 't.created_by')
    .leftJoin('users as uu', 'uu.id', 't.updated_by')
    .leftJoin('users as du', 'du.id', 't.deleted_by');
}

const person = (id, name) => (id ? { id, name } : null);

/** Linha do banco -> objeto da API (camelCase, valor em texto e em centavos). */
export function toTransactionDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    description: row.description,
    amount: fromCents(row.amount_cents),
    amountCents: toNumber(row.amount_cents),
    type: row.type,
    category: row.category,
    date: row.transaction_date,
    notes: row.notes,
    version: row.version,
    isDeleted: Boolean(row.deleted_at),
    createdAt: row.created_at,
    createdBy: person(row.created_by_id, row.created_by_name),
    updatedAt: row.updated_at,
    updatedBy: person(row.updated_by_id, row.updated_by_name),
    deletedAt: row.deleted_at,
    deletedBy: person(row.deleted_by_id, row.deleted_by_name),
  };
}

function escapeLike(term) {
  return term.toLowerCase().replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Filtros comuns à listagem, ao relatório e ao dashboard. */
export function applyFilters(query, filters = {}) {
  const { search, type, category, from, to, status = 'active' } = filters;

  if (status === 'active') query.whereNull('t.deleted_at');
  if (status === 'deleted') query.whereNotNull('t.deleted_at');

  if (type) query.where('t.type', type);
  if (category) query.where('t.category', category);
  if (from) query.where('t.transaction_date', '>=', from);
  if (to) query.where('t.transaction_date', '<=', to);
  if (search) {
    const like = `%${escapeLike(search)}%`;
    query.where((builder) => builder
      .whereRaw("LOWER(t.description) LIKE ? ESCAPE '\\'", [like])
      .orWhereRaw("LOWER(t.category) LIKE ? ESCAPE '\\'", [like]));
  }
  return query;
}

export async function findById(id, conn = db) {
  const row = await baseQuery(conn).select(BASE_COLUMNS).where('t.id', id).first();
  return toTransactionDto(row);
}

export async function findRawById(id, conn = db) {
  return conn('transactions').where({ id }).first();
}

export async function findByIdempotencyKey(key, conn = db) {
  const row = await conn('transactions').select('id').where({ idempotency_key: key }).first();
  return row ? findById(row.id, conn) : null;
}

export async function list({ page, limit, sort, order, ...filters }) {
  const filtered = applyFilters(baseQuery(), filters);

  const [{ total }] = await filtered.clone().clearSelect().count({ total: 't.id' });
  const rows = await filtered
    .select(BASE_COLUMNS)
    .orderBy(`t.${SORTABLE_FIELDS[sort]}`, order)
    .orderBy('t.id', order) // desempate estável para a paginação não repetir linhas
    .limit(limit)
    .offset((page - 1) * limit);

  const totalNumber = toNumber(total);
  return {
    data: rows.map(toTransactionDto),
    meta: { page, limit, total: totalNumber, totalPages: Math.max(1, Math.ceil(totalNumber / limit)) },
  };
}

export async function listForReport(filters) {
  const rows = await applyFilters(baseQuery(), filters)
    .select(BASE_COLUMNS)
    .orderBy('t.transaction_date', 'asc')
    .orderBy('t.id', 'asc');
  return rows.map(toTransactionDto);
}

export async function listCategories() {
  const rows = await db('transactions')
    .distinct('category')
    .whereNull('deleted_at')
    .orderBy('category');
  return rows.map((row) => row.category);
}

export async function insert(data, conn) {
  const [row] = await conn('transactions').insert(data).returning('id');
  return typeof row === 'object' ? row.id : row;
}

/** UPDATE com trava otimista: só altera se a versão ainda for a esperada. */
export async function updateWithVersion(id, expectedVersion, data, conn) {
  return conn('transactions')
    .where({ id, version: expectedVersion })
    .whereNull('deleted_at')
    .update({ ...data, version: expectedVersion + 1 });
}

export async function markDeleted(id, { userId, at }, conn) {
  return conn('transactions')
    .where({ id })
    .whereNull('deleted_at')
    .update({ deleted_at: at, deleted_by: userId, version: conn.raw('version + 1') });
}

export async function restore(id, { userId, at }, conn) {
  return conn('transactions')
    .where({ id })
    .whereNotNull('deleted_at')
    .update({
      deleted_at: null, deleted_by: null, updated_at: at, updated_by: userId,
      version: conn.raw('version + 1'),
    });
}
