import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CategoryChart } from '../components/charts/CategoryChart.jsx';
import { MonthlyChart } from '../components/charts/MonthlyChart.jsx';
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback.jsx';
import { IconArrowDown, IconArrowUp, IconWallet } from '../components/Icons.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { useBalance } from '../contexts/BalanceContext.jsx';
import { useDataChanged } from '../hooks/useDataChanged.js';
import { api } from '../services/api.js';
import { TYPE_LABEL, formatCents, formatDate, monthRange } from '../utils/format.js';

const PERIODS = {
  month: { label: 'Este mês', range: () => monthRange(0) },
  lastMonth: { label: 'Mês passado', range: () => monthRange(-1) },
  all: { label: 'Tudo', range: () => ({}) },
};

/** Etapa 6 — Dashboard: saldo, totais do período, gráfico mensal, categorias e últimos lançamentos. */
export default function DashboardPage() {
  const { summary: balanceSummary } = useBalance();
  const [period, setPeriod] = useState('month');
  const [state, setState] = useState({ loading: true, error: null });
  const [data, setData] = useState({ summary: null, monthly: [], categories: [], recent: [] });

  const load = useCallback(async () => {
    const range = PERIODS[period].range();
    try {
      const [summary, monthly, categories, recent] = await Promise.all([
        api.summary(range),
        api.monthly(6),
        api.categories({ ...range, type: 'EXPENSE' }),
        api.listTransactions({ limit: 5, sort: 'date', order: 'desc' }),
      ]);
      setData({ summary: summary.data, monthly: monthly.data, categories: categories.data, recent: recent.data });
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error });
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);
  useDataChanged(load); // atualiza sozinho quando qualquer lançamento muda

  const { summary } = data;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Dashboard</h1>
          <p className="page__subtitle">Visão do fluxo de caixa, atualizada em tempo real.</p>
        </div>
        <div className="segmented segmented--small" role="tablist" aria-label="Período">
          {Object.entries(PERIODS).map(([key, { label }]) => (
            <button key={key} type="button" role="tab" aria-selected={period === key}
              className={`segmented__option ${period === key ? 'is-active' : ''}`} onClick={() => setPeriod(key)}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {state.error && <ErrorState error={state.error} onRetry={load} />}

      <section className="stats">
        <StatCard label="Saldo atual" tone="brand" highlight icon={<IconWallet />}
          cents={balanceSummary?.balance.amountCents} hint="Acumulado de todos os lançamentos ativos" />
        <StatCard label="Entradas" tone="income" icon={<IconArrowUp />}
          cents={summary?.income.amountCents} hint={PERIODS[period].label} />
        <StatCard label="Saídas" tone="expense" icon={<IconArrowDown />}
          cents={summary?.expense.amountCents} hint={PERIODS[period].label} />
        <StatCard label="Resultado do período" tone="neutral"
          cents={summary?.net.amountCents} hint={summary ? `${summary.count} lançamentos` : undefined} />
      </section>

      <section className="grid-2">
        <article className="card">
          <header className="card__header">
            <h2>Entradas x saídas</h2>
            <span className="card__hint">Últimos 6 meses</span>
          </header>
          {state.loading ? <Skeleton height={280} /> : <MonthlyChart data={data.monthly} />}
        </article>

        <article className="card">
          <header className="card__header">
            <h2>Para onde vai o dinheiro</h2>
            <span className="card__hint">Saídas · {PERIODS[period].label}</span>
          </header>
          {state.loading && <Skeleton height={220} />}
          {!state.loading && data.categories.length === 0 && (
            <EmptyState title="Sem saídas no período" description="Os gastos por categoria aparecem aqui." />
          )}
          {!state.loading && data.categories.length > 0 && <CategoryChart data={data.categories} />}
        </article>
      </section>

      <article className="card">
        <header className="card__header">
          <h2>Últimos lançamentos</h2>
          <Link to="/transacoes" className="btn btn--link">Ver todos</Link>
        </header>
        {state.loading && <Skeleton height={160} />}
        {!state.loading && data.recent.length === 0 && (
          <EmptyState title="Nenhum lançamento ainda" description="Cadastre o primeiro em Transações."
            action={<Link to="/transacoes?novo=1" className="btn btn--primary">Novo lançamento</Link>} />
        )}
        <ul className="recent">
          {data.recent.map((item) => (
            <li key={item.id}>
              <span className={`type-icon type-icon--${item.type.toLowerCase()}`} title={TYPE_LABEL[item.type]}>
                {item.type === 'INCOME' ? <IconArrowUp width={14} height={14} /> : <IconArrowDown width={14} height={14} />}
              </span>
              <div className="recent__info">
                <strong>{item.description}</strong>
                <span>{item.category} · {formatDate(item.date)}</span>
              </div>
              <span className={`amount amount--${item.type.toLowerCase()}`}>
                {item.type === 'INCOME' ? '+ ' : '− '}{formatCents(item.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
