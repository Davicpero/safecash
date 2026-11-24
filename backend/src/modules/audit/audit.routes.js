import { Router } from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '../../config/permissions.js';
import { db } from '../../database/connection.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { toNumber } from '../../utils/money.js';

/** Consulta da trilha de auditoria (ADMIN e AUDITOR). Somente leitura. */
export const auditRoutes = Router();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  entity: z.enum(['transaction', 'user', 'auth']).optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGIN_FAILED']).optional(),
  userId: z.coerce.number().int().positive().optional(),
});

auditRoutes.get('/',
  authorize(PERMISSIONS.AUDIT_READ),
  validate({ query: querySchema }),
  async (req, res) => {
    const { page, limit, entity, action, userId } = req.valid.query;

    const query = db('audit_logs as a').leftJoin('users as u', 'u.id', 'a.user_id');
    if (entity) query.where('a.entity', entity);
    if (action) query.where('a.action', action);
    if (userId) query.where('a.user_id', userId);

    const [{ total }] = await query.clone().count({ total: 'a.id' });
    const rows = await query
      .select('a.id', 'a.entity', 'a.entity_id', 'a.action', 'a.reason', 'a.ip', 'a.request_id',
        'a.before_data', 'a.after_data', 'a.created_at', 'u.id as user_id', 'u.name as user_name')
      .orderBy('a.id', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const totalNumber = toNumber(total);
    res.json({
      data: rows.map((row) => ({
        id: row.id,
        entity: row.entity,
        entityId: row.entity_id,
        action: row.action,
        reason: row.reason,
        ip: row.ip,
        requestId: row.request_id,
        createdAt: row.created_at,
        user: row.user_id ? { id: row.user_id, name: row.user_name } : null,
        before: row.before_data ? JSON.parse(row.before_data) : null,
        after: row.after_data ? JSON.parse(row.after_data) : null,
      })),
      meta: { page, limit, total: totalNumber, totalPages: Math.max(1, Math.ceil(totalNumber / limit)) },
    });
  });
