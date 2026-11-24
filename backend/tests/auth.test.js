import { describe, expect, it } from 'vitest';
import { api, auth, loginAs } from './helpers.js';

describe('autenticação e RBAC', () => {
  it('faz login e devolve token + permissões', async () => {
    const response = await api().post('/api/auth/login')
      .send({ email: 'OPERADOR@safecash.dev', password: 'Operador@123' });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeTypeOf('string');
    expect(response.body.user.role).toBe('OPERATOR');
    expect(response.body.user.permissions).toContain('transaction:create');
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  it('recusa senha errada com mensagem genérica', async () => {
    const response = await api().post('/api/auth/login')
      .send({ email: 'operador@safecash.dev', password: 'errada' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('bloqueia rota protegida sem token', async () => {
    const response = await api().get('/api/transactions');
    expect(response.status).toBe(401);
  });

  it('bloqueia token adulterado', async () => {
    const response = await api().get('/api/transactions').set(auth('abc.def.ghi'));
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('auditor não pode criar transação (403)', async () => {
    const token = await loginAs('AUDITOR');
    const response = await api().post('/api/transactions').set(auth(token))
      .send({ description: 'x', amount: '1', type: 'INCOME', category: 'x', date: '2026-01-01' });
    expect(response.status).toBe(403);
  });

  it('operador não gerencia usuários (403)', async () => {
    const token = await loginAs('OPERATOR');
    const response = await api().get('/api/users').set(auth(token));
    expect(response.status).toBe(403);
  });

  it('admin lista usuários', async () => {
    const token = await loginAs('ADMIN');
    const response = await api().get('/api/users').set(auth(token));
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(3);
  });
});
