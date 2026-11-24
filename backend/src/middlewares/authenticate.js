import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { db } from '../database/connection.js';
import { AppError } from '../utils/AppError.js';

/**
 * Etapa 4/5 — Valida o JWT do cabeçalho "Authorization: Bearer <token>"
 * e confere no banco se o usuário ainda existe e está ativo
 * (um usuário desativado perde o acesso mesmo com token válido).
 */
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw AppError.unauthorized('Token não informado.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    throw new AppError(401, expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      expired ? 'Sessão expirada. Faça login novamente.' : 'Token inválido.');
  }

  const user = await db('users')
    .select('id', 'name', 'email', 'role', 'active')
    .where({ id: Number(payload.sub) })
    .first();

  if (!user || !user.active) {
    throw AppError.unauthorized('Usuário inativo ou inexistente.');
  }

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
}
