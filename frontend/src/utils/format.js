/**
 * Formatação para a tela. Os cálculos chegam prontos da API em centavos;
 * aqui só convertemos para texto em pt-BR.
 */
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactBrl = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
});

export const formatCents = (cents) => brl.format(Number(cents) / 100);
export const formatCentsCompact = (cents) => compactBrl.format(Number(cents) / 100);

export function formatDate(isoDate) {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function formatMonth(yearMonth) {
  const [year, month] = yearMonth.split('-');
  return `${MONTHS[Number(month) - 1]}/${year.slice(2)}`;
}

export function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function monthRange(offset = 0) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: iso(first), to: iso(last) };
}

/**
 * Máscara de moeda estilo app de banco: o usuário digita só números
 * e eles entram pela direita (2 → 0,02 → 0,20 → 2,00 → 20,00).
 * Trabalha com centavos inteiros, sem float.
 */
export function maskCurrencyInput(text) {
  const digits = String(text).replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
  if (!digits) return { display: '', cents: 0 };
  const cents = Number(digits);
  return { display: brl.format(cents / 100).replace(/^R\$\s?/, ''), cents };
}

/** Centavos → "2000.00" (formato que a API espera). */
export function centsToApiAmount(cents) {
  const reais = Math.trunc(cents / 100);
  return `${reais}.${String(cents % 100).padStart(2, '0')}`;
}

export const TYPE_LABEL = { INCOME: 'Entrada', EXPENSE: 'Saída' };
export const ROLE_LABEL = { ADMIN: 'Administrador', OPERATOR: 'Operador', AUDITOR: 'Auditor' };
export const ACTION_LABEL = {
  CREATE: 'Criou', UPDATE: 'Editou', DELETE: 'Excluiu', RESTORE: 'Restaurou',
  LOGIN: 'Entrou', LOGIN_FAILED: 'Falha de login',
};
