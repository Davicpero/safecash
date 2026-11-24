import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { permissionsOf } from '../../config/permissions.js';
import { db } from '../../database/connection.js';
import { AppError } from '../../utils/AppError.js';
import { AUDIT_ACTIONS, recordAudit } from '../audit/audit.service.js';

// Hash fixo para comparar quando o e-mail não existe: o tempo de resposta fica igual
// e um atacante não descobre quais e-mails estão cadastrados.
const DUMMY_HASH = bcrypt.hashSync('safecash-dummy-password', 10);

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: permissionsOf(user.role),
  };
}

export function signToken(user) {
  return jwt.sign({ role: user.role, name: user.name }, env.jwtSecret, {
    subject: String(user.id),
    expiresIn: env.jwtExpiresIn,
  });
}

export async function login({ email, password }, context) {
  const user = await db('users').where({ email }).first();
  const passwordOk = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

  if (!user || !passwordOk || !user.active) {
    await recordAudit(null, {
      entity: 'auth', action: AUDIT_ACTIONS.LOGIN_FAILED, userId: user?.id,
      after: { email }, context,
    });
    // Mensagem genérica de propósito: não revela se o e-mail existe
    throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
  }

  await recordAudit(null, { entity: 'auth', action: AUDIT_ACTIONS.LOGIN, userId: user.id, context });

  return { token: signToken(user), user: toPublicUser(user) };
}
