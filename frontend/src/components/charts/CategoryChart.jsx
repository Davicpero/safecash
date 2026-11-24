import { memo } from 'react';
import { formatCents } from '../../utils/format.js';
import { CHART_COLORS } from './chartColors.js';

/**
 * Gastos por categoria: barras horizontais ordenadas (mais legível que pizza
 * para comparar tamanhos). Feito em HTML/CSS: leve, acessível e já com os valores escritos.
 */
export const CategoryChart = memo(function CategoryChart({ data, type = 'EXPENSE' }) {
  const max = Math.max(...data.map((item) => item.totalCents), 1);
  const color = type === 'INCOME' ? CHART_COLORS.income : CHART_COLORS.expense;
  const top = data.slice(0, 7);
  const rest = data.slice(7);
  const rows = rest.length
    ? [...top, {
      category: `Outras (${rest.length})`,
      totalCents: rest.reduce((sum, item) => sum + item.totalCents, 0),
      percent: Math.round(rest.reduce((sum, item) => sum + item.percent, 0) * 10) / 10,
    }]
    : top;

  return (
    <ul className="hbars">
      {rows.map((item) => (
        <li key={item.category} className="hbars__row" title={`${item.category}: ${formatCents(item.totalCents)} (${item.percent}%)`}>
          <span className="hbars__label">{item.category}</span>
          <span className="hbars__track">
            <span className="hbars__bar" style={{ width: `${Math.max(2, (item.totalCents / max) * 100)}%`, background: color }} />
          </span>
          <span className="hbars__value">
            {formatCents(item.totalCents)} <small>{item.percent.toLocaleString('pt-BR')}%</small>
          </span>
        </li>
      ))}
    </ul>
  );
});
