import { useCallback, useEffect, useState } from 'react';
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { api } from '../services/api.js';
import { ACTION_LABEL, formatCents, formatDateTime } from '../utils/format.js';

const ENTITY_LABEL = { transaction: 'Transação', user: 'Usuário', auth: 'Acesso' };

function describe(entry) {
  const data = entry.after ?? entry.before;
  if (entry.entity === 'transaction' && data) {
    return `#${entry.entityId} · ${data.description} · ${formatCents(data.amountCents ?? data.amount_cents ?? 0)}`;
  }
  if (entry.entity === 'user' && data) return `${data.name} (${data.email})`;
  if (entry.entity === 'auth' && entry.after?.email) return entry.after.email;
  return entry.entityId ? `#${entry.entityId}` : '—';
}

/** Trilha de auditoria geral (ADMIN e AUDITOR). Somente leitura. */
export default function AuditPage() {
  const [filters, setFilters] = useState({ entity: '', action: '', page: 1, limit: 20 });
  const [result, setResult] = useState({ data: [], meta: null });
  const [state, setState] = useState({ loading: true, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    try {
      setResult(await api.listAudit(filters));
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error });
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const set = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value, page: 1 }));

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Auditoria</h1>
          <p className="page__subtitle">Registro imutável de tudo o que aconteceu: quem, o quê, quando e de onde.</p>
        </div>
      </header>

      <div className="filters">
        <select className="input" value={filters.entity} onChange={set('entity')} aria-label="Entidade">
          <option value="">Todas as entidades</option>
          {Object.entries(ENTITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="input" value={filters.action} onChange={set('action')} aria-label="Ação">
          <option value="">Todas as ações</option>
          {Object.entries(ACTION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <article className="card card--flush">
        {state.error && <ErrorState error={state.error} onRetry={load} />}
        {state.loading && !result.meta && <div className="card__pad"><Skeleton height={200} /></div>}
        {result.meta && result.data.length === 0 && <EmptyState title="Nenhum registro" />}
        {result.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Quando</th><th>Ação</th><th>Entidade</th><th>Registro</th><th>Usuário</th><th>Motivo</th><th>IP</th></tr>
              </thead>
              <tbody>
                {result.data.map((entry) => (
                  <tr key={entry.id}>
                    <td data-label="Quando" className="nowrap">{formatDateTime(entry.createdAt)}</td>
                    <td data-label="Ação"><span className={`badge badge--${entry.action.toLowerCase()}`}>{ACTION_LABEL[entry.action]}</span></td>
                    <td data-label="Entidade">{ENTITY_LABEL[entry.entity] ?? entry.entity}</td>
                    <td data-label="Registro">{describe(entry)}</td>
                    <td data-label="Usuário">{entry.user?.name ?? '—'}</td>
                    <td data-label="Motivo">{entry.reason ?? '—'}</td>
                    <td data-label="IP" className="cell-meta">{entry.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={result.meta}
          onPage={(page) => setFilters((current) => ({ ...current, page }))}
          onLimit={(limit) => setFilters((current) => ({ ...current, limit, page: 1 }))} />
      </article>
    </div>
  );
}
