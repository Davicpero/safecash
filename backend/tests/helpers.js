import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();
export const api = () => request(app);

const tokens = {};

export async function loginAs(role) {
  const credentials = {
    ADMIN: ['admin@safecash.dev', 'Admin@123'],
    OPERATOR: ['operador@safecash.dev', 'Operador@123'],
    AUDITOR: ['auditor@safecash.dev', 'Auditor@123'],
  }[role];

  if (!tokens[role]) {
    const response = await api().post('/api/auth/login').send({ email: credentials[0], password: credentials[1] });
    tokens[role] = response.body.token;
  }
  return tokens[role];
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

export const validTransaction = (overrides = {}) => ({
  description: 'Pagamento de Aluguel',
  amount: '2000.00',
  type: 'EXPENSE',
  category: 'Aluguel',
  date: '2026-11-05',
  ...overrides,
});
