import { z } from 'zod';
import { MAX_AMOUNT_CENTS, toCents } from '../../utils/money.js';
import { isValidIsoDate } from '../../utils/dates.js';

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'];
export const SORTABLE_FIELDS = {
  date: 'transaction_date',
  amount: 'amount_cents',
  description: 'description',
  createdAt: 'created_at',
};

/**
 * Valor absoluto em reais: aceita "2000.00", "2000,00" ou 2000.
 * Rejeita negativo, zero, mais de 2 casas decimais e acima do teto.
 * Saída já convertida para centavos (inteiro).
 */
const amountField = z
  .union([z.string(), z.number()], { error: 'Informe o valor.' })
  .transform((value, ctx) => {
    const raw = String(value).trim();
    if (raw.startsWith('-')) {
      ctx.addIssue({ code: 'custom', message: 'O valor deve ser positivo. Use o tipo (entrada/saída) para indicar o sentido.' });
      return z.NEVER;
    }
    const cents = toCents(value);
    if (cents === null) {
      ctx.addIssue({ code: 'custom', message: 'Valor inválido. Use até 2 casas decimais, ex.: 2000.00' });
      return z.NEVER;
    }
    if (cents <= 0) {
      ctx.addIssue({ code: 'custom', message: 'O valor deve ser maior que zero.' });
      return z.NEVER;
    }
    if (cents > MAX_AMOUNT_CENTS) {
      ctx.addIssue({ code: 'custom', message: 'Valor acima do limite de R$ 10.000.000,00 por lançamento.' });
      return z.NEVER;
    }
    return cents;
  });

const dateField = z
  .string({ error: 'Informe a data.' })
  .refine(isValidIsoDate, 'Data inválida. Use o formato AAAA-MM-DD.');

const textField = (label, max) => z
  .string({ error: `Informe ${label}.` })
  .trim()
  .min(2, `${label[0].toUpperCase()}${label.slice(1)} precisa ter ao menos 2 caracteres.`)
  .max(max, `${label[0].toUpperCase()}${label.slice(1)} pode ter no máximo ${max} caracteres.`);

const transactionFields = {
  description: textField('a descrição', 140),
  amount: amountField,
  type: z.enum(TRANSACTION_TYPES, { error: 'Tipo deve ser INCOME (entrada) ou EXPENSE (saída).' }),
  category: textField('a categoria', 60),
  date: dateField,
  notes: z.string().trim().max(500, 'Observações podem ter no máximo 500 caracteres.')
    .nullish().transform((v) => v || null),
};

// .strict(): campos desconhecidos (ex.: "created_by", "deleted_at") são rejeitados,
// o cliente não consegue forjar campos de auditoria.
export const createTransactionSchema = z.object(transactionFields).strict();

export const updateTransactionSchema = z.object({
  ...transactionFields,
  version: z.coerce.number({ error: 'Informe a versão do registro.' }).int().positive(),
}).strict();

export const deleteTransactionSchema = z.object({
  reason: z.string().trim().max(255).optional(),
}).strict();

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido.'),
});

const optionalDate = dateField.optional();
const booleanFromQuery = z.enum(['true', 'false']).optional().transform((v) => v === 'true');

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  category: z.string().trim().max(60).optional(),
  from: optionalDate,
  to: optionalDate,
  status: z.enum(['active', 'deleted', 'all']).default('active'),
  sort: z.enum(Object.keys(SORTABLE_FIELDS)).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).refine((q) => !q.from || !q.to || q.from <= q.to, {
  message: 'A data inicial deve ser anterior à final.', path: ['from'],
});

export const reportQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  category: z.string().trim().max(60).optional(),
  from: optionalDate,
  to: optionalDate,
  includeDeleted: booleanFromQuery,
});
