const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Valida AAAA-MM-DD e se a data existe no calendário (rejeita 2026-02-30). */
export function isValidIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function nowIso() {
  return new Date().toISOString();
}

/** Primeiro dia do mês, N meses atrás, em AAAA-MM-DD. */
export function firstDayMonthsAgo(months, reference = new Date()) {
  const date = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - months, 1));
  return date.toISOString().slice(0, 10);
}

/** Lista de meses "AAAA-MM" do mais antigo ao atual. */
export function lastMonths(count, reference = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - (count - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
}
