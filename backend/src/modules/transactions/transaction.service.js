import { db } from '../../database/connection.js';
import { broadcast } from '../../realtime/events.js';
import { AppError } from '../../utils/AppError.js';
import { nowIso } from '../../utils/dates.js';
import { AUDIT_ACTIONS, listEntityHistory, recordAudit } from '../audit/audit.service.js';
import * as repository from './transaction.repository.js';

/**
 * Regras de negócio de transações.
 * Toda escrita acontece dentro de db.transaction(): a alteração e a linha de
 * auditoria são gravadas juntas ou nenhuma é gravada.
 */

const ENTITY = 'transaction';

function toColumns(input) {
  return {
    description: input.description,
    amount_cents: input.amount,
    type: input.type,
    category: input.category,
    transaction_date: input.date,
    notes: input.notes ?? null,
  };
}

/** Snapshot enxuto para a auditoria (sem nomes de usuários, que podem mudar). */
function snapshot(dto) {
  if (!dto) return null;
  const { createdBy, updatedBy, deletedBy, ...rest } = dto;
  return {
    ...rest,
    createdById: createdBy?.id ?? null,
    updatedById: updatedBy?.id ?? null,
    deletedById: deletedBy?.id ?? null,
  };
}

function notifyChange(action, transaction) {
  broadcast('transactions:changed', { action, id: transaction.id, at: nowIso() });
}

export async function list(filters) {
  return repository.list(filters);
}

export async function getById(id, { allowDeleted = false } = {}) {
  const transaction = await repository.findById(id);
  if (!transaction || (transaction.isDeleted && !allowDeleted)) {
    throw AppError.notFound('Transação não encontrada.');
  }
  return transaction;
}

export async function create(input, { user, idempotencyKey, context }) {
  // Envio repetido com a mesma chave: devolve o lançamento original em vez de duplicar
  if (idempotencyKey) {
    const existing = await repository.findByIdempotencyKey(idempotencyKey);
    if (existing) return { transaction: existing, replayed: true };
  }

  const at = nowIso();
  let transaction;
  try {
    transaction = await insertWithAudit(input, { user, idempotencyKey, context, at });
  } catch (error) {
    // Duas requisições com a mesma chave chegaram juntas: a segunda perde na
    // restrição UNIQUE do banco e devolve o registro que a primeira criou.
    const isUniqueViolation = error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505';
    if (idempotencyKey && isUniqueViolation) {
      const existing = await repository.findByIdempotencyKey(idempotencyKey);
      if (existing) return { transaction: existing, replayed: true };
    }
    throw error;
  }

  notifyChange('created', transaction);
  return { transaction, replayed: false };
}

async function insertWithAudit(input, { user, idempotencyKey, context, at }) {
  return db.transaction(async (trx) => {
    const id = await repository.insert({
      ...toColumns(input),
      idempotency_key: idempotencyKey ?? null,
      version: 1,
      created_by: user.id,
      created_at: at,
    }, trx);

    const created = await repository.findById(id, trx);
    await recordAudit(trx, {
      entity: ENTITY, entityId: id, action: AUDIT_ACTIONS.CREATE,
      userId: user.id, after: snapshot(created), context,
    });
    return created;
  });
}

export async function update(id, input, { user, context }) {
  const { version, ...fields } = input;
  const at = nowIso();

  const transaction = await db.transaction(async (trx) => {
    const before = await repository.findById(id, trx);
    if (!before) throw AppError.notFound('Transação não encontrada.');
    if (before.isDeleted) {
      throw AppError.conflict('TRANSACTION_DELETED', 'Transação excluída não pode ser editada. Restaure-a primeiro.');
    }

    const changed = await repository.updateWithVersion(id, version, {
      ...toColumns(fields),
      updated_by: user.id,
      updated_at: at,
    }, trx);

    if (changed === 0) {
      throw AppError.conflict('VERSION_CONFLICT',
        'Este lançamento foi alterado por outra pessoa. Recarregue para ver a versão atual.',
        { currentVersion: before.version });
    }

    const after = await repository.findById(id, trx);
    await recordAudit(trx, {
      entity: ENTITY, entityId: id, action: AUDIT_ACTIONS.UPDATE,
      userId: user.id, before: snapshot(before), after: snapshot(after), context,
    });
    return after;
  });

  notifyChange('updated', transaction);
  return transaction;
}

/** Regra de Ouro (H1): nunca DELETE físico, apenas marcação de excluído. */
export async function softDelete(id, { reason, user, context }) {
  const at = nowIso();

  const transaction = await db.transaction(async (trx) => {
    const before = await repository.findById(id, trx);
    if (!before) throw AppError.notFound('Transação não encontrada.');
    if (before.isDeleted) {
      throw AppError.conflict('ALREADY_DELETED', 'Esta transação já está excluída.');
    }

    await repository.markDeleted(id, { userId: user.id, at }, trx);
    const after = await repository.findById(id, trx);
    await recordAudit(trx, {
      entity: ENTITY, entityId: id, action: AUDIT_ACTIONS.DELETE,
      userId: user.id, before: snapshot(before), after: snapshot(after), reason, context,
    });
    return after;
  });

  notifyChange('deleted', transaction);
  return transaction;
}

export async function restore(id, { user, context }) {
  const at = nowIso();

  const transaction = await db.transaction(async (trx) => {
    const before = await repository.findById(id, trx);
    if (!before) throw AppError.notFound('Transação não encontrada.');
    if (!before.isDeleted) {
      throw AppError.conflict('NOT_DELETED', 'Esta transação não está excluída.');
    }

    await repository.restore(id, { userId: user.id, at }, trx);
    const after = await repository.findById(id, trx);
    await recordAudit(trx, {
      entity: ENTITY, entityId: id, action: AUDIT_ACTIONS.RESTORE,
      userId: user.id, before: snapshot(before), after: snapshot(after), context,
    });
    return after;
  });

  notifyChange('restored', transaction);
  return transaction;
}

export async function history(id) {
  await getById(id, { allowDeleted: true });
  return listEntityHistory(ENTITY, id);
}

export async function categories() {
  return repository.listCategories();
}
