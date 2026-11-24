import { Router } from 'express';
import { PERMISSIONS, hasPermission } from '../../config/permissions.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../utils/AppError.js';
import { requestContext } from '../audit/audit.service.js';
import {
  createTransactionSchema,
  deleteTransactionSchema,
  idParamSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from './transaction.schemas.js';
import * as service from './transaction.service.js';

/**
 * Rotas de transações (todas exigem login; ver app.js).
 * Os handlers são controllers finos: leem a requisição validada,
 * chamam o service e escolhem o status HTTP.
 */
export const transactionRoutes = Router();

const P = PERMISSIONS;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,80}$/;

function readIdempotencyKey(req) {
  const key = req.get('Idempotency-Key');
  if (key === undefined) return undefined;
  if (!IDEMPOTENCY_KEY.test(key)) {
    throw AppError.badRequest('Idempotency-Key inválida (8 a 80 caracteres: letras, números, - ou _).');
  }
  return key;
}

transactionRoutes.get('/',
  authorize(P.TRANSACTION_READ),
  validate({ query: listTransactionsQuerySchema }),
  async (req, res) => {
    const filters = req.valid.query;
    if (filters.status !== 'active' && !hasPermission(req.user.role, P.TRANSACTION_READ_DELETED)) {
      throw AppError.forbidden('Somente auditores e administradores veem transações excluídas.');
    }
    res.json(await service.list(filters));
  });

transactionRoutes.get('/categories',
  authorize(P.TRANSACTION_READ),
  async (_req, res) => {
    res.json({ data: await service.categories() });
  });

transactionRoutes.get('/:id',
  authorize(P.TRANSACTION_READ),
  validate({ params: idParamSchema }),
  async (req, res) => {
    const allowDeleted = hasPermission(req.user.role, P.TRANSACTION_READ_DELETED);
    res.json({ data: await service.getById(req.valid.params.id, { allowDeleted }) });
  });

transactionRoutes.get('/:id/history',
  authorize(P.AUDIT_READ),
  validate({ params: idParamSchema }),
  async (req, res) => {
    res.json({ data: await service.history(req.valid.params.id) });
  });

transactionRoutes.post('/',
  authorize(P.TRANSACTION_CREATE),
  validate({ body: createTransactionSchema }),
  async (req, res) => {
    const { transaction, replayed } = await service.create(req.valid.body, {
      user: req.user,
      idempotencyKey: readIdempotencyKey(req),
      context: requestContext(req),
    });
    if (replayed) res.setHeader('Idempotent-Replayed', 'true');
    res.status(replayed ? 200 : 201).json({ data: transaction });
  });

transactionRoutes.put('/:id',
  authorize(P.TRANSACTION_UPDATE),
  validate({ params: idParamSchema, body: updateTransactionSchema }),
  async (req, res) => {
    const transaction = await service.update(req.valid.params.id, req.valid.body, {
      user: req.user, context: requestContext(req),
    });
    res.json({ data: transaction });
  });

// Soft delete: a rota DELETE existe, mas apenas marca o registro como excluído
transactionRoutes.delete('/:id',
  authorize(P.TRANSACTION_DELETE),
  validate({ params: idParamSchema, body: deleteTransactionSchema }),
  async (req, res) => {
    const transaction = await service.softDelete(req.valid.params.id, {
      reason: req.valid.body.reason, user: req.user, context: requestContext(req),
    });
    res.json({ data: transaction });
  });

transactionRoutes.patch('/:id/restore',
  authorize(P.TRANSACTION_RESTORE),
  validate({ params: idParamSchema }),
  async (req, res) => {
    const transaction = await service.restore(req.valid.params.id, {
      user: req.user, context: requestContext(req),
    });
    res.json({ data: transaction });
  });
