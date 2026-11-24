import { db } from '../../database/connection.js';
import { firstDayMonthsAgo, lastMonths } from '../../utils/dates.js';
import { fromCents, toNumber } from '../../utils/money.js';
import { applyFilters } from '../transactions/transaction.repository.js';

/**
 * Etapa 6 — Agregações do dashboard.
 * Somas feitas no banco, sempre em centavos e sempre ignorando registros excluídos.
 */

const INCOME_SUM = db.raw("COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount_cents ELSE 0 END), 0) as income");
const EXPENSE_SUM = db.raw("COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount_cents ELSE 0 END), 0) as expense");

const money = (cents) => ({ amount: fromCents(cents), amountCents: cents });

export async function summary(filters = {}) {
  const [periodRow] = await applyFilters(db('transactions as t'), filters)
    .select(INCOME_SUM, EXPENSE_SUM)
    .count({ count: 't.id' });

  // Saldo atual é sempre o acumulado total, independente do período filtrado
  const [allTimeRow] = await db('transactions as t').whereNull('t.deleted_at').select(INCOME_SUM, EXPENSE_SUM);

  const income = toNumber(periodRow.income);
  const expense = toNumber(periodRow.expense);
  const balance = toNumber(allTimeRow.income) - toNumber(allTimeRow.expense);

  return {
    balance: money(balance),
    income: money(income),
    expense: money(expense),
    net: money(income - expense),
    count: toNumber(periodRow.count),
    generatedAt: new Date().toISOString(),
  };
}

export async function monthly({ months }) {
  const monthExpr = db.raw('SUBSTR(t.transaction_date, 1, 7)');
  const rows = await db('transactions as t')
    .whereNull('t.deleted_at')
    .where('t.transaction_date', '>=', firstDayMonthsAgo(months - 1))
    .select(db.raw('SUBSTR(t.transaction_date, 1, 7) as month'), INCOME_SUM, EXPENSE_SUM)
    .groupBy(monthExpr)
    .orderBy('month');

  const byMonth = new Map(rows.map((row) => [row.month, row]));

  // Meses sem movimento aparecem zerados, o gráfico não "pula" meses
  return lastMonths(months).map((month) => {
    const row = byMonth.get(month);
    const income = toNumber(row?.income);
    const expense = toNumber(row?.expense);
    return { month, incomeCents: income, expenseCents: expense, netCents: income - expense };
  });
}

export async function byCategory({ type, from, to }) {
  const rows = await applyFilters(db('transactions as t'), { type, from, to })
    .select('t.category')
    .sum({ total: 't.amount_cents' })
    .count({ count: 't.id' })
    .groupBy('t.category')
    .orderBy('total', 'desc');

  const grandTotal = rows.reduce((sum, row) => sum + toNumber(row.total), 0);

  return rows.map((row) => {
    const total = toNumber(row.total);
    return {
      category: row.category,
      totalCents: total,
      total: fromCents(total),
      count: toNumber(row.count),
      // percentual com 1 casa, calculado sobre inteiros
      percent: grandTotal ? Math.round((total * 1000) / grandTotal) / 10 : 0,
    };
  });
}
