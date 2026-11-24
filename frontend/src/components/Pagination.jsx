export function Pagination({ meta, onPage, onLimit }) {
  if (!meta) return null;
  const { page, totalPages, total, limit } = meta;
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span className="pagination__info">{first}–{last} de {total}</span>
      <label className="pagination__limit">
        <span>Por página</span>
        <select className="input" value={limit} onChange={(event) => onLimit(Number(event.target.value))}>
          {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <div className="pagination__buttons">
        <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
        <span>{page} / {totalPages}</span>
        <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Próxima</button>
      </div>
    </div>
  );
}
