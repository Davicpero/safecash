import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/**
 * Etapa 8 — Tratamento centralizado de erros.
 * Todas as respostas de erro têm o mesmo formato:
 * { error: { code, message, details?, requestId } }
 */
export function notFound(req, _res, next) {
  next(AppError.notFound(`Rota ${req.method} ${req.originalUrl} não existe.`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  const normalized = normalize(error);

  if (normalized.status >= 500 && !env.isTest) {
    console.error(`[${req.id}]`, error);
  }

  res.status(normalized.status).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
      requestId: req.id,
    },
  });
}

function normalize(error) {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos.',
      error.issues.map((issue) => ({ field: issue.path.join('.') || null, message: issue.message })));
  }

  // JSON malformado no corpo da requisição
  if (error.type === 'entity.parse.failed') {
    return new AppError(400, 'INVALID_JSON', 'O corpo da requisição não é um JSON válido.');
  }
  if (error.type === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Corpo da requisição grande demais.');
  }

  // Violação de UNIQUE (SQLite e PostgreSQL)
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
    return new AppError(409, 'DUPLICATE', 'Registro duplicado.');
  }
  // Violação de CHECK / FK: a validação da API deveria ter barrado antes
  if (String(error.code).startsWith('SQLITE_CONSTRAINT') || ['23514', '23503'].includes(error.code)) {
    return new AppError(422, 'CONSTRAINT_VIOLATION', 'Os dados violam uma regra de integridade do banco.');
  }

  return new AppError(500, 'INTERNAL_ERROR',
    env.isProduction ? 'Erro interno. Tente novamente.' : error.message);
}
