import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { PERMISSIONS, ROLES } from '../../config/permissions.js';
import { db } from '../../database/connection.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../utils/AppError.js';
import { nowIso } from '../../utils/dates.js';
import { recordAudit, requestContext } from '../audit/audit.service.js';

/** Etapa 5 — Gestão de usuários e perfis (somente ADMIN). */
export const userRoutes = Router();

userRoutes.use(authorize(PERMISSIONS.USER_MANAGE));

const roleField = z.enum(Object.values(ROLES), { error: 'Perfil deve ser ADMIN, OPERATOR ou AUDITOR.' });

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto.').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  password: z.string()
    .min(8, 'A senha precisa de ao menos 8 caracteres.')
    .max(72, 'A senha pode ter no máximo 72 caracteres.')
    .regex(/[A-Za-z]/, 'A senha precisa ter letras.')
    .regex(/\d/, 'A senha precisa ter números.'),
  role: roleField.default(ROLES.OPERATOR),
}).strict();

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: roleField.optional(),
  active: z.boolean().optional(),
}).strict();

const USER_COLUMNS = ['id', 'name', 'email', 'role', 'active', 'created_at as createdAt'];
const normalizeUser = (user) => ({ ...user, active: Boolean(user.active) });

userRoutes.get('/', async (_req, res) => {
  const users = await db('users').select(USER_COLUMNS).orderBy('name');
  res.json({ data: users.map(normalizeUser) });
});

userRoutes.post('/', validate({ body: createUserSchema }), async (req, res) => {
  const { password, ...data } = req.valid.body;
  const exists = await db('users').where({ email: data.email }).first();
  if (exists) throw AppError.conflict('EMAIL_IN_USE', 'Já existe um usuário com este e-mail.');

  const at = nowIso();
  const user = await db.transaction(async (trx) => {
    const [row] = await trx('users').insert({
      ...data,
      password_hash: await bcrypt.hash(password, 10),
      active: true,
      created_at: at,
      updated_at: at,
    }).returning('id');
    const id = typeof row === 'object' ? row.id : row;
    const created = await trx('users').select(USER_COLUMNS).where({ id }).first();
    await recordAudit(trx, {
      entity: 'user', entityId: id, action: 'CREATE', userId: req.user.id,
      after: normalizeUser(created), context: requestContext(req),
    });
    return created;
  });

  res.status(201).json({ data: normalizeUser(user) });
});

userRoutes.patch('/:id',
  validate({ params: z.object({ id: z.coerce.number().int().positive() }), body: updateUserSchema }),
  async (req, res) => {
    const { id } = req.valid.params;
    const changes = req.valid.body;

    if (id === req.user.id && (changes.active === false || (changes.role && changes.role !== ROLES.ADMIN))) {
      throw AppError.badRequest('Você não pode desativar nem rebaixar o próprio usuário.');
    }

    const user = await db.transaction(async (trx) => {
      const before = await trx('users').select(USER_COLUMNS).where({ id }).first();
      if (!before) throw AppError.notFound('Usuário não encontrado.');

      await trx('users').where({ id }).update({ ...changes, updated_at: nowIso() });
      const after = await trx('users').select(USER_COLUMNS).where({ id }).first();
      await recordAudit(trx, {
        entity: 'user', entityId: id, action: 'UPDATE', userId: req.user.id,
        before: normalizeUser(before), after: normalizeUser(after), context: requestContext(req),
      });
      return after;
    });

    res.json({ data: normalizeUser(user) });
  });
