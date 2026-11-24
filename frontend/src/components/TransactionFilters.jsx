import { memo } from 'react';
import { IconSearch } from './Icons.jsx';

/** Etapa 7 — Barra de busca e filtros (componente controlado e memoizado). */
export const TransactionFilters = memo(function TransactionFilters({ filters, categories, canSeeDeleted, onChange, onClear }) {
  const set = (field) => (event) => onChange({ [field]: event.target.value });
  const hasFilters = filters.search || filters.type || filters.category || filters.from || filters.to
    || filters.status !== 'active';

  return (
    <div className="filters">
      <label className="search">
        <IconSearch />
        <input
          type="search"
          className="input"
          placeholder="Buscar por descrição ou categoria"
          value={filters.search}
          onChange={set('search')}
          aria-label="Buscar"
        />
      </label>

      <select className="input" value={filters.type} onChange={set('type')} aria-label="Tipo">
        <option value="">Entradas e saídas</option>
        <option value="INCOME">Só entradas</option>
        <option value="EXPENSE">Só saídas</option>
      </select>

      <select className="input" value={filters.category} onChange={set('category')} aria-label="Categoria">
        <option value="">Todas as categorias</option>
        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>

      <div className="filters__dates">
        <input className="input" type="date" value={filters.from} onChange={set('from')} aria-label="De" max={filters.to || undefined} />
        <span>até</span>
        <input className="input" type="date" value={filters.to} onChange={set('to')} aria-label="Até" min={filters.from || undefined} />
      </div>

      {canSeeDeleted && (
        <select className="input" value={filters.status} onChange={set('status')} aria-label="Situação">
          <option value="active">Ativas</option>
          <option value="deleted">Excluídas</option>
          <option value="all">Todas</option>
        </select>
      )}

      {hasFilters && <button type="button" className="btn btn--link" onClick={onClear}>Limpar filtros</button>}
    </div>
  );
});
