import { Router } from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '../../config/permissions.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { isValidIsoDate } from '../../utils/dates.js';
import { TRANSACTION_TYPES } from '../transactions/transaction.schemas.js';
import * as dashboard from './dashboard.service.js';

export const dashboardRoutes = Router();

const optionalDate = z.string().refine(isValidIsoDate, 'Data inválida. Use AAAA-MM-DD.').optional();
const periodSchema = z.object({ from: optionalDate, to: optionalDate });

dashboardRoutes.use(authorize(PERMISSIONS.TRANSACTION_READ));

dashboardRoutes.get('/summary', validate({ query: periodSchema }), async (req, res) => {
  res.json({ data: await dashboard.summary(req.valid.query) });
});

dashboardRoutes.get('/monthly',
  validate({ query: z.object({ months: z.coerce.number().int().min(1).max(24).default(6) }) }),
  async (req, res) => {
    res.json({ data: await dashboard.monthly(req.valid.query) });
  });

dashboardRoutes.get('/categories',
  validate({ query: periodSchema.extend({ type: z.enum(TRANSACTION_TYPES).default('EXPENSE') }) }),
  async (req, res) => {
    res.json({ data: await dashboard.byCategory(req.valid.query) });
  });
