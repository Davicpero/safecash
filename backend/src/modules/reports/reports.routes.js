import { Router } from 'express';
import { PERMISSIONS, hasPermission } from '../../config/permissions.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../utils/AppError.js';
import { listForReport } from '../transactions/transaction.repository.js';
import { reportQuerySchema } from '../transactions/transaction.schemas.js';

/** Etapa 9 — Relatório de extrato em CSV (abre direto no Excel / Google Sheets). */
export const reportRoutes = Router();

const TYPE_LABEL = { INCOME: 'Entrada', EXPENSE: 'Saída' };

// Proteção contra "CSV injection": célula que começa com = + - @ vira texto
function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

reportRoutes.get('/transactions.csv',
  authorize(PERMISSIONS.REPORT_READ),
  validate({ query: reportQuerySchema }),
  async (req, res) => {
    const { includeDeleted, ...filters } = req.valid.query;
    if (includeDeleted && !hasPermission(req.user.role, PERMISSIONS.TRANSACTION_READ_DELETED)) {
      throw AppError.forbidden('Somente auditores e administradores exportam registros excluídos.');
    }

    const rows = await listForReport({ ...filters, status: includeDeleted ? 'all' : 'active' });

    const header = ['ID', 'Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)', 'Criado por',
      'Criado em', 'Alterado por', 'Alterado em', 'Excluído por', 'Excluído em'];
    const lines = rows.map((t) => [
      t.id, t.date, t.description, t.category, TYPE_LABEL[t.type],
      (t.type === 'EXPENSE' ? '-' : '') + t.amount.replace('.', ','),
      t.createdBy?.name, t.createdAt, t.updatedBy?.name, t.updatedAt, t.deletedBy?.name, t.deletedAt,
    ].map(csvCell).join(';'));

    const filename = `safecash-extrato-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM + ";" como separador: o Excel em português abre com acentos e colunas corretas
    res.send(`﻿${[header.map(csvCell).join(';'), ...lines].join('\r\n')}`);
  });
