# 06 · Modelagem de desempenho (Etapas 7 e 9)

## Consultas mais frequentes

| # | Tela | Consulta | Frequência |
|---|---|---|---|
| Q1 | Transações | Listar ativas por período, ordenado por data, 10 por página | Toda troca de filtro/página |
| Q2 | Dashboard | Somar entradas e saídas por mês (6 meses) | Toda abertura do dashboard e todo evento em tempo real |
| Q3 | Topo de todas as telas | Saldo acumulado (soma de todas as ativas) | Todo evento em tempo real |
| Q4 | Histórico | Auditoria de uma transação | Ao abrir o histórico |

Todas filtram `deleted_at IS NULL` (soft delete), então o índice começa por essa coluna.

## Índices criados (`migrations/20261124000004_add_performance_indexes.js`)

| Índice | Colunas | Atende |
|---|---|---|
| `idx_transactions_active_date` | `(deleted_at, transaction_date)` | Q1, Q2 |
| `idx_transactions_active_type` | `(deleted_at, type)` | filtros por tipo, Q3 |
| `idx_transactions_category` | `(category)` | filtro e agrupamento por categoria |
| `idx_transactions_created_by` | `(created_by)` | joins com usuário |
| `idx_audit_entity` | `(entity, entity_id)` | Q4 |
| `idx_audit_created_at` | `(created_at)` | tela de auditoria |

## Medição real (PostgreSQL 16, 100.059 lançamentos)

Medido com `EXPLAIN ANALYZE` durante o desenvolvimento:

| Consulta | Sem índice | Com índice | Ganho | Plano com índice |
|---|---|---|---|---|
| Q1 — listagem do mês, 10 por página | 14,4 ms (Seq Scan) | **1,2 ms** | ~12× | Index Scan em `idx_transactions_active_date` |
| Q2 — totais mensais de 6 meses | 15,7 ms (Seq Scan) | **4,5 ms** | ~3,5× | Bitmap Index Scan em `idx_transactions_active_date` |

O ganho cresce com o volume: o Seq Scan lê a tabela inteira, o índice lê só o trecho do período.

Para reproduzir:

```sql
EXPLAIN ANALYZE
SELECT * FROM transactions t
WHERE t.deleted_at IS NULL AND t.transaction_date BETWEEN '2026-11-01' AND '2026-11-30'
ORDER BY t.transaction_date DESC, t.id DESC
LIMIT 10;
```

## Outras decisões de desempenho

**Backend**
- **Paginação no banco** (`LIMIT/OFFSET`), nunca no JavaScript; `limit` máximo 100.
- **Desempate estável** (`ORDER BY data, id`) para a página 2 não repetir itens da página 1.
- **Somas no banco** (`SUM(CASE ...)`), não trazendo milhares de linhas para somar em JS.
- **Inteiros** em vez de decimais: soma de inteiros é a operação mais barata que existe.
- **Meses vazios** preenchidos na API (zero), sem consulta extra.

**Frontend**
- **Debounce de 350 ms** na busca: digitar "aluguel" faz 1 requisição, não 7.
- **AbortController:** se o usuário muda o filtro antes da resposta chegar, a requisição antiga é cancelada (sem "resultado fantasma").
- **`React.memo`** nas linhas da tabela, filtros, cartões e gráficos; **`useMemo`/`useCallback`** nas props, para evitar re-render em cascata.
- **Code splitting** com `lazy()`: cada tela é um arquivo separado; a biblioteca de gráficos (a maior) só é baixada ao abrir o dashboard.
- **Tempo real por evento (SSE)**, não por polling: zero requisições enquanto nada muda.

## Métricas a acompanhar em produção

| Métrica | Meta | Como medir |
|---|---|---|
| p95 de `GET /api/transactions` | < 200 ms | logs do `morgan` / painel do Render |
| p95 de `GET /api/dashboard/summary` | < 150 ms | idem |
| Tamanho inicial do frontend (gzip) | < 150 kb | saída do `npm run build` |
| Lighthouse Performance (mobile) | ≥ 85 | Chrome DevTools → Lighthouse |

## Próximos passos se o volume crescer muito

1. **Paginação por cursor** (`WHERE (data, id) < (...)`) no lugar de `OFFSET`.
2. **Tabela de saldos diários** atualizada na mesma transação do lançamento, para o saldo ser O(1).
3. **Índice de texto** (`pg_trgm`) para a busca por descrição.
