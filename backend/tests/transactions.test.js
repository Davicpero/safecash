import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { db } from '../src/database/connection.js';
import { api, auth, loginAs, validTransaction } from './helpers.js';

async function balanceCents(token) {
  const response = await api().get('/api/dashboard/summary').set(auth(token));
  return response.body.data.balance.amountCents;
}

describe('CRUD de transações', () => {
  it('cria "Pagamento de Aluguel - R$ 2.000,00" e o saldo cai exatamente 200000 centavos', async () => {
    const token = await loginAs('OPERATOR');
    const before = await balanceCents(token);

    const response = await api().post('/api/transactions').set(auth(token)).send(validTransaction());
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      description: 'Pagamento de Aluguel', amount: '2000.00', amountCents: 200000,
      type: 'EXPENSE', version: 1, isDeleted: false,
    });
    expect(response.body.data.createdBy.name).toBe('Otávio Operador');

    expect(await balanceCents(token)).toBe(before - 200000);
  });

  it('rejeita valor negativo, zero e com 3 casas decimais', async () => {
    const token = await loginAs('OPERATOR');
    for (const amount of ['-50.00', '0', '10.123', 'abc']) {
      const response = await api().post('/api/transactions').set(auth(token)).send(validTransaction({ amount }));
      expect(response.status, `amount=${amount}`).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].field).toBe('amount');
    }
  });

  it('rejeita data inexistente e campos de auditoria forjados', async () => {
    const token = await loginAs('OPERATOR');
    const badDate = await api().post('/api/transactions').set(auth(token)).send(validTransaction({ date: '2026-02-30' }));
    expect(badDate.status).toBe(400);

    const forged = await api().post('/api/transactions').set(auth(token)).send(validTransaction({ created_by: 1 }));
    expect(forged.status).toBe(400);
  });

  it('o mesmo Idempotency-Key não duplica o lançamento', async () => {
    const token = await loginAs('OPERATOR');
    const key = randomUUID();
    const payload = validTransaction({ description: 'Duplo clique' });

    const first = await api().post('/api/transactions').set(auth(token)).set('Idempotency-Key', key).send(payload);
    const second = await api().post('/api/transactions').set(auth(token)).set('Idempotency-Key', key).send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(second.body.data.id).toBe(first.body.data.id);
  });

  it('edita com trava otimista e recusa versão desatualizada (409)', async () => {
    const token = await loginAs('OPERATOR');
    const created = (await api().post('/api/transactions').set(auth(token))
      .send(validTransaction({ description: 'Conta de luz', amount: '300.00' }))).body.data;

    const updated = await api().put(`/api/transactions/${created.id}`).set(auth(token))
      .send(validTransaction({ description: 'Conta de luz', amount: '312.45', version: created.version }));
    expect(updated.status).toBe(200);
    expect(updated.body.data.amount).toBe('312.45');
    expect(updated.body.data.version).toBe(2);
    expect(updated.body.data.updatedBy.name).toBe('Otávio Operador');

    const stale = await api().put(`/api/transactions/${created.id}`).set(auth(token))
      .send(validTransaction({ description: 'Outra edição', version: created.version }));
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
  });

  it('DELETE é soft delete: o registro continua no banco e sai do saldo', async () => {
    const token = await loginAs('OPERATOR');
    const created = (await api().post('/api/transactions').set(auth(token))
      .send(validTransaction({ description: 'Receita lançada errado', type: 'INCOME', amount: '999.99' }))).body.data;
    const balanceWith = await balanceCents(token);

    const removed = await api().delete(`/api/transactions/${created.id}`).set(auth(token))
      .send({ reason: 'Lançamento em duplicidade' });
    expect(removed.status).toBe(200);
    expect(removed.body.data.isDeleted).toBe(true);
    expect(removed.body.data.deletedBy.name).toBe('Otávio Operador');

    // Continua fisicamente no banco
    const row = await db('transactions').where({ id: created.id }).first();
    expect(row).toBeTruthy();
    expect(row.deleted_at).not.toBeNull();

    // Saiu do saldo e da listagem padrão
    expect(await balanceCents(token)).toBe(balanceWith - 99999);
    const list = await api().get('/api/transactions?search=lançada errado').set(auth(token));
    expect(list.body.data.find((t) => t.id === created.id)).toBeUndefined();

    // Operador não vê excluídos; não dá para excluir duas vezes nem editar
    expect((await api().get('/api/transactions?status=deleted').set(auth(token))).status).toBe(403);
    expect((await api().delete(`/api/transactions/${created.id}`).set(auth(token))).status).toBe(409);
    const editDeleted = await api().put(`/api/transactions/${created.id}`).set(auth(token))
      .send(validTransaction({ version: removed.body.data.version }));
    expect(editDeleted.body.error.code).toBe('TRANSACTION_DELETED');
  });

  it('auditor vê excluídos e a trilha completa; admin restaura', async () => {
    const operator = await loginAs('OPERATOR');
    const auditor = await loginAs('AUDITOR');
    const admin = await loginAs('ADMIN');

    const created = (await api().post('/api/transactions').set(auth(operator))
      .send(validTransaction({ description: 'Para auditar' }))).body.data;
    await api().put(`/api/transactions/${created.id}`).set(auth(operator))
      .send(validTransaction({ description: 'Para auditar (editado)', version: 1 }));
    await api().delete(`/api/transactions/${created.id}`).set(auth(operator)).send({ reason: 'teste' });

    const deletedList = await api().get('/api/transactions?status=deleted&search=para auditar').set(auth(auditor));
    expect(deletedList.status).toBe(200);
    expect(deletedList.body.data.some((t) => t.id === created.id)).toBe(true);

    const history = await api().get(`/api/transactions/${created.id}/history`).set(auth(auditor));
    expect(history.status).toBe(200);
    expect(history.body.data.map((h) => h.action)).toEqual(['DELETE', 'UPDATE', 'CREATE']);
    expect(history.body.data[0].reason).toBe('teste');
    expect(history.body.data[1].before.description).toBe('Para auditar');
    expect(history.body.data[1].after.description).toBe('Para auditar (editado)');

    expect((await api().patch(`/api/transactions/${created.id}/restore`).set(auth(operator))).status).toBe(403);
    const restored = await api().patch(`/api/transactions/${created.id}/restore`).set(auth(admin));
    expect(restored.status).toBe(200);
    expect(restored.body.data.isDeleted).toBe(false);
  });

  it('não existe nenhuma rota que apague fisicamente: a contagem nunca diminui', async () => {
    const token = await loginAs('ADMIN');
    const [{ total: before }] = await db('transactions').count({ total: 'id' });
    const list = await api().get('/api/transactions?limit=3').set(auth(token));
    for (const t of list.body.data) {
      await api().delete(`/api/transactions/${t.id}`).set(auth(token));
    }
    const [{ total: after }] = await db('transactions').count({ total: 'id' });
    expect(Number(after)).toBe(Number(before));
    for (const t of list.body.data) {
      await api().patch(`/api/transactions/${t.id}/restore`).set(auth(token));
    }
  });
});

describe('listagem, filtros e dashboard', () => {
  it('pagina com metadados', async () => {
    const token = await loginAs('OPERATOR');
    const response = await api().get('/api/transactions?page=2&limit=5').set(auth(token));
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(5);
    expect(response.body.meta).toMatchObject({ page: 2, limit: 5 });
    expect(response.body.meta.total).toBeGreaterThan(10);
  });

  it('filtra por tipo, categoria e período', async () => {
    const token = await loginAs('OPERATOR');
    const response = await api()
      .get('/api/transactions?type=INCOME&category=Clientes&from=2000-01-01&to=2100-12-31&limit=100')
      .set(auth(token));
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((t) => t.type === 'INCOME' && t.category === 'Clientes')).toBe(true);
  });

  it('recusa período invertido e limite acima de 100', async () => {
    const token = await loginAs('OPERATOR');
    expect((await api().get('/api/transactions?from=2026-12-01&to=2026-01-01').set(auth(token))).status).toBe(400);
    expect((await api().get('/api/transactions?limit=1000').set(auth(token))).status).toBe(400);
  });

  it('saldo do dashboard = soma das entradas - saídas ativas', async () => {
    const token = await loginAs('OPERATOR');
    const rows = await db('transactions').whereNull('deleted_at');
    const expected = rows.reduce((sum, t) => sum + (t.type === 'INCOME' ? t.amount_cents : -t.amount_cents), 0);
    expect(await balanceCents(token)).toBe(expected);
  });

  it('série mensal sempre tem os N meses pedidos', async () => {
    const token = await loginAs('OPERATOR');
    const response = await api().get('/api/dashboard/monthly?months=6').set(auth(token));
    expect(response.body.data).toHaveLength(6);
    expect(response.body.data[5].month).toBe(new Date().toISOString().slice(0, 7));
  });

  it('gastos por categoria somam 100%', async () => {
    const token = await loginAs('OPERATOR');
    const response = await api().get('/api/dashboard/categories?type=EXPENSE').set(auth(token));
    const percent = response.body.data.reduce((sum, c) => sum + c.percent, 0);
    expect(percent).toBeGreaterThan(99.5);
    expect(percent).toBeLessThan(100.5);
  });

  it('exporta CSV com BOM e separador ;', async () => {
    const token = await loginAs('OPERATOR');
    const response = await api().get('/api/reports/transactions.csv').set(auth(token));
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text.startsWith('﻿"ID";"Data"')).toBe(true);
  });
});

describe('erros padronizados', () => {
  it('JSON malformado vira 400 INVALID_JSON', async () => {
    const token = await loginAs('OPERATOR');
    const response = await api().post('/api/transactions').set(auth(token))
      .set('Content-Type', 'application/json').send('{"description": ');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
    expect(response.body.error.requestId).toBeTypeOf('string');
  });

  it('id inexistente vira 404', async () => {
    const token = await loginAs('OPERATOR');
    const response = await api().get('/api/transactions/999999').set(auth(token));
    expect(response.status).toBe(404);
  });
});
