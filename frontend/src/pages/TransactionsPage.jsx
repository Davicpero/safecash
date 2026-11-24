import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback.jsx';
import { HistoryModal } from '../components/HistoryModal.jsx';
import { IconDownload, IconPlus } from '../components/Icons.jsx';
import { ConfirmDialog, Modal } from '../components/Modal.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { TransactionFilters } from '../components/TransactionFilters.jsx';
import { TransactionForm } from '../components/TransactionForm.jsx';
import { TransactionTable } from '../components/TransactionTable.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useDataChanged } from '../hooks/useDataChanged.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { api } from '../services/api.js';
import { notifyDataChanged } from '../services/realtime.js';
import { formatCents } from '../utils/format.js';

const EMPTY_FILTERS = { search: '', type: '', category: '', from: '', to: '', status: 'active' };

/** Etapas 3, 7 e 8 — CRUD completo com busca, filtros, paginação e feedbacks. */
export default function TransactionsPage() {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [paging, setPaging] = useState({ page: 1, limit: 10, sort: 'date', order: 'desc' });
  const [result, setResult] = useState({ data: [], meta: null });
  const [state, setState] = useState({ loading: true, error: null });
  const [categories, setCategories] = useState([]);

  const [editing, setEditing] = useState(null); // null = fechado | {} = novo | transação = edição
  const [deleting, setDeleting] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [historyOf, setHistoryOf] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Uma chave por abertura do formulário: duplo clique ou reenvio não duplicam o lançamento
  const idempotencyKey = useRef(null);

  const debouncedSearch = useDebounce(filters.search);
  const query = useMemo(() => ({ ...filters, search: debouncedSearch, ...paging }),
    [filters, debouncedSearch, paging]);

  const permissions = useMemo(() => ({
    create: can('transaction:create'),
    update: can('transaction:update'),
    delete: can('transaction:delete'),
    restore: can('transaction:restore'),
    history: can('audit:read'),
    seeDeleted: can('transaction:read-deleted'),
  }), [can]);

  const abortRef = useRef(null);
  const load = useCallback(async () => {
    abortRef.current?.abort(); // cancela a busca anterior se o usuário continuar digitando
    const controller = new AbortController();
    abortRef.current = controller;
    setState((current) => ({ ...current, loading: true }));
    try {
      const response = await api.listTransactions(query, controller.signal);
      setResult(response);
      setState({ loading: false, error: null });
    } catch (error) {
      if (error.name !== 'AbortError') setState({ loading: false, error });
    }
  }, [query]);

  const loadCategories = useCallback(() => {
    api.getCategories().then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCategories(); }, [loadCategories]);
  useDataChanged(() => { load(); loadCategories(); });

  // Atalho vindo do dashboard: /transacoes?novo=1
  useEffect(() => {
    if (searchParams.get('novo') && permissions.create) {
      openForm({});
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, permissions.create]);

  function openForm(transaction) {
    idempotencyKey.current = crypto.randomUUID();
    setEditing(transaction);
  }

  const handleFilterChange = useCallback((change) => {
    setFilters((current) => ({ ...current, ...change }));
    setPaging((current) => ({ ...current, page: 1 }));
  }, []);

  const handleClear = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPaging((current) => ({ ...current, page: 1 }));
  }, []);

  const handleSort = useCallback((field) => {
    setPaging((current) => ({
      ...current,
      page: 1,
      sort: field,
      order: current.sort === field && current.order === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  async function handleSave(values) {
    const isEdit = Boolean(editing?.id);
    const response = isEdit
      ? await api.updateTransaction(editing.id, { ...values, version: editing.version })
          .catch((error) => {
            if (error.code === 'VERSION_CONFLICT') {
              toast.error('Outra pessoa alterou este lançamento. A lista foi recarregada, abra de novo para editar.');
              setEditing(null);
              load();
              return null;
            }
            throw error;
          })
      : await api.createTransaction(values, idempotencyKey.current);

    if (!response) return;
    setEditing(null);
    toast.success(isEdit ? 'Lançamento atualizado.' : `Lançamento de ${formatCents(response.data.amountCents)} registrado.`);
    notifyDataChanged({ action: isEdit ? 'updated' : 'created', id: response.data.id });
  }

  async function handleDelete(reason) {
    try {
      await api.deleteTransaction(deleting.id, reason);
      toast.success('Lançamento excluído. Ele continua disponível para auditoria.');
      setDeleting(null);
      notifyDataChanged({ action: 'deleted', id: deleting.id });
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleRestore() {
    try {
      await api.restoreTransaction(restoring.id);
      toast.success('Lançamento restaurado.');
      setRestoring(null);
      notifyDataChanged({ action: 'restored', id: restoring.id });
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { search, type, category, from, to, status } = query;
      await api.downloadCsv({ search, type, category, from, to, includeDeleted: status !== 'active' ? 'true' : undefined });
      toast.success('Extrato exportado.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setExporting(false);
    }
  }

  const onEdit = useCallback((row) => openForm(row), []);
  const isFirstLoad = state.loading && !result.meta;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Transações</h1>
          <p className="page__subtitle">Entradas e saídas do caixa. Nada é apagado de verdade: tudo fica auditável.</p>
        </div>
        <div className="page__actions">
          <button type="button" className="btn btn--ghost" onClick={handleExport} disabled={exporting}>
            <IconDownload width={18} height={18} /> Exportar CSV
          </button>
          {permissions.create && (
            <button type="button" className="btn btn--primary" onClick={() => openForm({})}>
              <IconPlus width={18} height={18} /> Novo lançamento
            </button>
          )}
        </div>
      </header>

      <TransactionFilters filters={filters} categories={categories} canSeeDeleted={permissions.seeDeleted}
        onChange={handleFilterChange} onClear={handleClear} />

      <article className={`card card--flush ${state.loading && !isFirstLoad ? 'is-refreshing' : ''}`}>
        {state.error && <ErrorState error={state.error} onRetry={load} />}
        {isFirstLoad && <div className="card__pad"><Skeleton height={36} /><br /><Skeleton height={36} /><br /><Skeleton height={36} /></div>}
        {!isFirstLoad && !state.error && result.data.length === 0 && (
          <EmptyState title="Nenhum lançamento encontrado"
            description="Ajuste os filtros ou cadastre um novo lançamento." />
        )}
        {result.data.length > 0 && (
          <TransactionTable rows={result.data} sort={paging.sort} order={paging.order} onSort={handleSort}
            permissions={permissions} onEdit={onEdit} onDelete={setDeleting}
            onRestore={setRestoring} onHistory={setHistoryOf} />
        )}
        <Pagination meta={result.meta}
          onPage={(page) => setPaging((current) => ({ ...current, page }))}
          onLimit={(limit) => setPaging((current) => ({ ...current, limit, page: 1 }))} />
      </article>

      <Modal open={editing !== null} title={editing?.id ? 'Editar lançamento' : 'Novo lançamento'} onClose={() => setEditing(null)}>
        {editing !== null && (
          <TransactionForm key={editing.id ?? 'new'} initial={editing.id ? editing : null} categories={categories}
            onSubmit={handleSave} onCancel={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDialog open={Boolean(deleting)} title="Excluir lançamento?" confirmLabel="Excluir" askReason
        message={deleting && `"${deleting.description}" (${formatCents(deleting.amountCents)}) sairá do saldo. O registro continua guardado para auditoria e pode ser restaurado por um administrador.`}
        onConfirm={handleDelete} onClose={() => setDeleting(null)} />

      <ConfirmDialog open={Boolean(restoring)} title="Restaurar lançamento?" confirmLabel="Restaurar" tone="primary"
        message={restoring && `"${restoring.description}" voltará a contar no saldo.`}
        onConfirm={handleRestore} onClose={() => setRestoring(null)} />

      <HistoryModal transaction={historyOf} onClose={() => setHistoryOf(null)} />
    </div>
  );
}
