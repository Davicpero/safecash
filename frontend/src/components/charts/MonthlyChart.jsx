import { memo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCents, formatCentsCompact, formatMonth } from '../../utils/format.js';
import { CHART_COLORS } from './chartColors.js';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{formatMonth(label)}</strong>
      <span><i style={{ background: CHART_COLORS.income }} />Entradas <b>{formatCents(row.incomeCents)}</b></span>
      <span><i style={{ background: CHART_COLORS.expense }} />Saídas <b>{formatCents(row.expenseCents)}</b></span>
      <span className="chart-tooltip__net">Resultado <b>{formatCents(row.netCents)}</b></span>
    </div>
  );
}

/** Entradas x saídas por mês (barras agrupadas, um único eixo em R$). */
export const MonthlyChart = memo(function MonthlyChart({ data }) {
  return (
    <figure className="chart">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="month" tickFormatter={formatMonth} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} />
          <YAxis tickFormatter={formatCentsCompact} tickLine={false} axisLine={false} width={72}
            tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--hover)' }} />
          <Legend iconType="circle" iconSize={8}
            formatter={(value) => <span className="chart-legend">{value}</span>} />
          <Bar dataKey="incomeCents" name="Entradas" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expenseCents" name="Saídas" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
      <details className="chart-table">
        <summary>Ver em tabela</summary>
        <table className="mini-table">
          <thead><tr><th>Mês</th><th className="num">Entradas</th><th className="num">Saídas</th><th className="num">Resultado</th></tr></thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month}>
                <td>{formatMonth(row.month)}</td>
                <td className="num">{formatCents(row.incomeCents)}</td>
                <td className="num">{formatCents(row.expenseCents)}</td>
                <td className="num">{formatCents(row.netCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
});
