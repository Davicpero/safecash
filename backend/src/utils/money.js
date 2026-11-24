/**
 * Dinheiro trafega como texto/decimal na borda da API ("2000.00")
 * e é guardado como inteiro em centavos (200000).
 * Toda conta é feita com inteiros, o que elimina erros de arredondamento.
 */

export const MAX_AMOUNT_CENTS = 1_000_000_000; // R$ 10.000.000,00 por lançamento

const DECIMAL_PATTERN = /^\d{1,8}([.,]\d{1,2})?$/;

/**
 * Converte "2000", "2000.5", "2000,50" ou 2000.5 em centavos.
 * Retorna null se o valor não for um decimal positivo com no máximo 2 casas.
 */
export function toCents(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    value = String(value);
  }
  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (!DECIMAL_PATTERN.test(text)) return null;

  const [reais, centavos = ''] = text.replace(',', '.').split('.');
  return Number(reais) * 100 + Number(centavos.padEnd(2, '0'));
}

/** 200050 -> "2000.50" (sem ponto flutuante no caminho). */
export function fromCents(cents) {
  const value = Number(cents);
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const reais = Math.trunc(abs / 100);
  const centavos = String(abs % 100).padStart(2, '0');
  return `${sign}${reais}.${centavos}`;
}

/** Normaliza resultados de SUM/COUNT (o driver pg devolve bigint como string). */
export function toNumber(value) {
  return value === null || value === undefined ? 0 : Number(value);
}
