import { describe, expect, it } from 'vitest';
import { fromCents, toCents } from '../src/utils/money.js';
import { isValidIsoDate } from '../src/utils/dates.js';

describe('money (unitário)', () => {
  it('converte reais em centavos sem erro de ponto flutuante', () => {
    expect(toCents('2000.00')).toBe(200000);
    expect(toCents('2000,5')).toBe(200050);
    expect(toCents(0.1)).toBe(10);
    expect(toCents('19.99')).toBe(1999);
    // 0.1 + 0.2 em float dá 0.30000000000000004; somando centavos dá 30 exatos
    expect(toCents('0.1') + toCents('0.2')).toBe(30);
  });

  it('rejeita formatos inválidos', () => {
    expect(toCents('12.345')).toBeNull();
    expect(toCents('abc')).toBeNull();
    expect(toCents('-10')).toBeNull();
    expect(toCents('')).toBeNull();
    expect(toCents(Number.NaN)).toBeNull();
    expect(toCents(null)).toBeNull();
  });

  it('formata centavos de volta para decimal', () => {
    expect(fromCents(200000)).toBe('2000.00');
    expect(fromCents(5)).toBe('0.05');
    expect(fromCents(-12345)).toBe('-123.45');
  });

  it('valida datas reais do calendário', () => {
    expect(isValidIsoDate('2026-11-24')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('24/11/2026')).toBe(false);
  });
});
