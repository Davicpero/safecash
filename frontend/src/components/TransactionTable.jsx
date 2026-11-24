import { memo } from 'react';
import { TYPE_LABEL, formatCents, formatDate } from '../utils/format.js';
import { IconArrowDown, IconArrowUp, IconEdit, IconHistory, IconRestore, IconTrash } from './Icons.jsx';

const SORTABLE = [
  ['date', 'Data'],
  ['description', 'Descrição'],
  ['amount', 'Valor'],
];

/**
 * Etapa 7/9 — Tabela de transações.
 * No celular, cada linha vira um cartão (só CSS). Linhas memoizadas:
 * mudar a página ou um filtro não re-renderiza linhas que não mudaram.
 */
export function TransactionTable({ rows, sort, order, onSort, permissions, onEdit, onDelete, onRestore, onHistory }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {SORTABLE.map(([field, label]) => (
              <th key={field} className={field === 'amount' ? 'num' : undefined}
                aria-sort={sort === field ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" className="th-sort" onClick={() => onSort(field)}>
                  {label} {sort === field && <span aria-hidden="true">{order === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
            ))}
            <th>Categoria</th>
            <th>Registro</th>
            <th className="actions-col"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TransactionRow key={row.id} row={row} permissions={permissions}
              onEdit={onEdit} onDelete={onDelete} onRestore={onRestore} onHistory={onHistory} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TransactionRow = memo(function TransactionRow({ row, permissions, onEdit, onDelete, onRestore, onHistory }) {
  const isIncome = row.type === 'INCOME';
  return (
    <tr className={row.isDeleted ? 'is-deleted' : undefined}>
      <td data-label="Data" className="nowrap">{formatDate(row.date)}</td>
      <td data-label="Descrição">
        <div className="cell-desc">
        <span className={`type-icon type-icon--${row.type.toLowerCase()}`} title={TYPE_LABEL[row.type]}>
          {isIncome ? <IconArrowUp width={14} height={14} /> : <IconArrowDown width={14} height={14} />}
        </span>
        <span>
          {row.description}
          {row.isDeleted && <span className="badge badge--deleted">Excluída</span>}
          {row.notes && <small className="cell-notes">{row.notes}</small>}
        </span>
        </div>
      </td>
      <td data-label="Valor" className={`num amount amount--${row.type.toLowerCase()}`}>
        {isIncome ? '+ ' : '− '}{formatCents(row.amountCents)}
      </td>
      <td data-label="Categoria"><span className="chip">{row.category}</span></td>
      <td data-label="Registro" className="cell-meta">
        {row.isDeleted
          ? <>Excluída por {row.deletedBy?.name}</>
          : row.updatedBy
            ? <>Editada por {row.updatedBy.name}</>
            : <>Criada por {row.createdBy?.name}</>}
      </td>
      <td className="actions-col">
        <div className="row-actions">
          {permissions.history && (
            <button type="button" className="icon-btn" onClick={() => onHistory(row)} title="Histórico" aria-label="Ver histórico">
              <IconHistory width={18} height={18} />
            </button>
          )}
          {!row.isDeleted && permissions.update && (
            <button type="button" className="icon-btn" onClick={() => onEdit(row)} title="Editar" aria-label="Editar">
              <IconEdit width={18} height={18} />
            </button>
          )}
          {!row.isDeleted && permissions.delete && (
            <button type="button" className="icon-btn icon-btn--danger" onClick={() => onDelete(row)} title="Excluir" aria-label="Excluir">
              <IconTrash width={18} height={18} />
            </button>
          )}
          {row.isDeleted && permissions.restore && (
            <button type="button" className="icon-btn" onClick={() => onRestore(row)} title="Restaurar" aria-label="Restaurar">
              <IconRestore width={18} height={18} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});
