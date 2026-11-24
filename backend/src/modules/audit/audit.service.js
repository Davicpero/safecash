import { db } from '../../database/connection.js';
import { nowIso } from '../../utils/dates.js';

export const AUDIT_ACTIONS = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  RESTORE: 'RESTORE',
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
});

/**
 * Grava uma linha de auditoria. Recebe "trx" para participar da mesma
 * transação do banco da operação auditada: ou grava os dois, ou nenhum.
 */
export async function recordAudit(trx, { entity, entityId, action, userId, before, after, reason, context }) {
  await (trx ?? db)('audit_logs').insert({
    entity,
    entity_id: entityId ?? null,
    action,
    user_id: userId ?? null,
    before_data: before ? JSON.stringify(before) : null,
    after_data: after ? JSON.stringify(after) : null,
    reason: reason ?? null,
    ip: context?.ip ?? null,
    request_id: context?.requestId ?? null,
    created_at: nowIso(),
  });
}

/** Histórico de um registro, do mais recente ao mais antigo, com o nome de quem fez. */
export async function listEntityHistory(entity, entityId) {
  const rows = await db('audit_logs as a')
    .leftJoin('users as u', 'u.id', 'a.user_id')
    .select('a.id', 'a.action', 'a.before_data', 'a.after_data', 'a.reason',
      'a.created_at', 'a.request_id', 'u.id as user_id', 'u.name as user_name')
    .where({ 'a.entity': entity, 'a.entity_id': entityId })
    .orderBy('a.id', 'desc');

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    reason: row.reason,
    createdAt: row.created_at,
    requestId: row.request_id,
    user: row.user_id ? { id: row.user_id, name: row.user_name } : null,
    before: row.before_data ? JSON.parse(row.before_data) : null,
    after: row.after_data ? JSON.parse(row.after_data) : null,
  }));
}

export function requestContext(req) {
  return { ip: req.ip, requestId: req.id };
}
