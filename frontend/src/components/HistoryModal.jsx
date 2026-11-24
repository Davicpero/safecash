import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { ACTION_LABEL, TYPE_LABEL, formatCents, formatDate, formatDateTime } from '../utils/format.js';
import { ErrorState, PageLoader } from './Feedback.jsx';
import { Modal } from './Modal.jsx';

const TRACKED_FIELDS = [
  ['description', 'Descrição', (v) => v],
  ['amountCents', 'Valor', (v) => formatCents(v)],
  ['type', 'Tipo', (v) => TYPE_LABEL[v] ?? v],
  ['category', 'Categoria', (v) => v],
  ['date', 'Data', (v) => formatDate(v)],
  ['notes', 'Observações', (v) => v || '—'],
];

/** Linha do tempo de auditoria de uma transação: quem fez o quê, quando, e o que mudou. */
export function HistoryModal({ transaction, onClose }) {
  const [state, setState] = useState({ loading: true, entries: [], error: null });

  useEffect(() => {
    if (!transaction) return;
    setState({ loading: true, entries: [], error: null });
    api.transactionHistory(transaction.id)
      .then(({ data }) => setState({ loading: false, entries: data, error: null }))
      .catch((error) => setState({ loading: false, entries: [], error }));
  }, [transaction]);

  return (
    <Modal open={Boolean(transaction)} title={`Histórico · ${transaction?.description ?? ''}`} onClose={onClose} size="lg">
      {state.loading && <PageLoader label="Carregando trilha de auditoria..." />}
      {state.error && <ErrorState error={state.error} />}
      <ol className="timeline">
        {state.entries.map((entry) => (
          <li key={entry.id} className={`timeline__item timeline__item--${entry.action.toLowerCase()}`}>
            <div className="timeline__head">
              <strong>{ACTION_LABEL[entry.action]}</strong>
              <span>por {entry.user?.name ?? 'sistema'}</span>
              <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
            </div>
            {entry.reason && <p className="timeline__reason">Motivo: {entry.reason}</p>}
            {entry.action === 'UPDATE' && <Diff before={entry.before} after={entry.after} />}
          </li>
        ))}
      </ol>
    </Modal>
  );
}

function Diff({ before, after }) {
  const changes = TRACKED_FIELDS.filter(([key]) => (before?.[key] ?? null) !== (after?.[key] ?? null));
  if (!changes.length) return null;
  return (
    <table className="diff">
      <tbody>
        {changes.map(([key, label, format]) => (
          <tr key={key}>
            <th>{label}</th>
            <td className="diff__before">{format(before[key])}</td>
            <td aria-hidden="true">→</td>
            <td className="diff__after">{format(after[key])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
