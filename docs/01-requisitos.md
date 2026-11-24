# 01 · Levantamento de requisitos (Etapa 1)

**Cliente:** SafeCash, startup de antecipação de recebíveis.
**Problema:** o controle de transações hoje é feito em sistemas legados que **permitem lançamentos duplicados** e **não têm trilha de auditoria**.
**Objetivo do produto:** um Core Engine de tesouraria em que pequenas empresas controlem entradas e saídas com precisão bancária, sem perder o histórico de nada.

## Atores

| Ator | Perfil no sistema | O que faz |
|---|---|---|
| Administrador financeiro | `ADMIN` | Tudo: lança, edita, exclui, **restaura** excluídos, gerencia usuários |
| Operador de caixa | `OPERATOR` | Lança, edita e exclui (soft delete) transações, exporta extrato |
| Auditor / contador | `AUDITOR` | Somente leitura; vê excluídos e a trilha de auditoria completa |

## Requisitos funcionais (RF)

| ID | Requisito | Onde está implementado |
|---|---|---|
| RF01 | Login com e-mail e senha, retornando token JWT | `POST /api/auth/login`, `LoginPage.jsx` |
| RF02 | Listar transações com **paginação** | `GET /api/transactions?page&limit` |
| RF03 | **Buscar** por descrição/categoria e **filtrar** por tipo, categoria, período e situação | `GET /api/transactions?search&type&category&from&to&status` |
| RF04 | Ordenar por data, valor ou descrição | `?sort&order`, cabeçalho clicável da tabela |
| RF05 | **Criar** transação (descrição, valor, tipo, categoria, data, observações) | `POST /api/transactions` |
| RF06 | **Editar** transação | `PUT /api/transactions/:id` |
| RF07 | **Excluir** transação apenas logicamente (soft delete), com motivo opcional | `DELETE /api/transactions/:id` |
| RF08 | Restaurar transação excluída (só ADMIN) | `PATCH /api/transactions/:id/restore` |
| RF09 | Exibir o **saldo em tempo real** em todas as telas | `GET /api/events` (SSE) + `BalanceContext.jsx` |
| RF10 | Dashboard com entradas, saídas, resultado do período, gráfico mensal e gastos por categoria | `/api/dashboard/*`, `DashboardPage.jsx` |
| RF11 | Ver a trilha de auditoria de cada transação (quem criou, alterou, excluiu, quando e o que mudou) | `GET /api/transactions/:id/history`, `HistoryModal.jsx` |
| RF12 | Ver a trilha de auditoria geral, incluindo logins e tentativas falhas | `GET /api/audit`, `AuditPage.jsx` |
| RF13 | Exportar extrato em CSV compatível com Excel | `GET /api/reports/transactions.csv` |
| RF14 | Gerenciar usuários: criar, mudar perfil, ativar/desativar | `/api/users`, `UsersPage.jsx` |

## Requisitos não funcionais (RNF)

| ID | Categoria | Requisito | Como foi atendido |
|---|---|---|---|
| RNF01 | Integridade | Nenhum erro de arredondamento | Valores guardados em **centavos inteiros**; float nunca entra em conta |
| RNF02 | Rastreabilidade | Nada pode ser apagado fisicamente (H1) | Não existe `DELETE` SQL em transações; colunas `deleted_at`/`deleted_by` |
| RNF03 | Rastreabilidade | Saber quem criou e quem alterou cada registro | `created_by/at`, `updated_by/at`, `deleted_by/at` + tabela `audit_logs` com antes/depois |
| RNF04 | Integridade | Impedir lançamentos duplicados | Header `Idempotency-Key` + `UNIQUE` no banco; o frontend gera uma chave por formulário |
| RNF05 | Integridade | Duas pessoas editando o mesmo registro não se sobrescrevem | Trava otimista com coluna `version` (409 `VERSION_CONFLICT`) |
| RNF06 | Integridade | Alteração e auditoria gravadas juntas | `db.transaction()`: grava as duas ou nenhuma |
| RNF07 | Segurança | Validar o esquema de todo dado de entrada; valor absoluto nunca negativo | Zod em todas as rotas + `CHECK (amount_cents > 0)` no banco |
| RNF08 | Segurança | Autenticação stateless e autorização por perfil | JWT + RBAC por permissões |
| RNF09 | Segurança | Senhas nunca em texto puro | bcrypt (custo 10) |
| RNF10 | Segurança | Proteção contra força bruta no login | 10 tentativas erradas por IP a cada 15 min |
| RNF11 | Segurança | Cabeçalhos HTTP seguros e CORS restrito | Helmet + lista de origens permitidas |
| RNF12 | Usabilidade | Multiplataforma: funcionar bem em celular e desktop | Layout responsivo; tabela vira cartões e menu vira barra inferior no celular |
| RNF13 | Desempenho | Listagem responde rápido mesmo com muitos registros | Paginação no banco, índices compostos, busca com debounce |
| RNF14 | Manutenibilidade | Código limpo e testável | Camadas (rotas → service → repository), testes automatizados, CI |
| RNF15 | Portabilidade | Rodar sem instalar banco no desenvolvimento e com PostgreSQL em produção | Knex com SQLite (dev) e PostgreSQL (prod), mesmas migrations |
| RNF16 | Observabilidade | Erros rastreáveis | `X-Request-Id` em toda resposta e gravado na auditoria |

## Regras de negócio (RN)

- **RN01 — Regra de Ouro:** excluir = marcar como excluído. O registro sai do saldo e da listagem padrão, mas continua no banco e visível para ADMIN/AUDITOR.
- **RN02:** `amount` é sempre positivo. O sentido do dinheiro é dado por `type`: `INCOME` (entrada) soma, `EXPENSE` (saída) subtrai.
- **RN03:** valor máximo por lançamento: R$ 10.000.000,00; no máximo 2 casas decimais.
- **RN04:** a data precisa existir no calendário (31/02 é recusado).
- **RN05:** transação excluída não pode ser editada; precisa ser restaurada primeiro.
- **RN06:** o saldo atual é sempre o acumulado de todas as transações ativas; os filtros de período afetam só os totais do período.
- **RN07:** o cliente não pode enviar campos de auditoria (`created_by`, `deleted_at`...). O esquema é estrito e recusa campos desconhecidos.
- **RN08:** um administrador não pode desativar nem rebaixar o próprio usuário.

## Mapa com as habilidades da Situação de Aprendizagem

| Habilidade | Evidência no projeto |
|---|---|
| H1 — Rastreabilidade | Soft delete, colunas de autoria, `audit_logs`, teste "a contagem nunca diminui" |
| H2, H3, H4 — Justificativa da stack | [`03-justificativa-stack.md`](03-justificativa-stack.md) |
| H5 — CRUD com saldo atualizado | Dashboard + saldo do topo atualizados por SSE; teste e2e do aluguel de R$ 2.000,00 |
| H6, H10 — README e documentação das rotas | `README.md` + Swagger em `/api/docs` |
| H8 — Cronograma de sprints | [`04-cronograma-sprints.md`](04-cronograma-sprints.md) + `trello-import.csv` |
| C10 — Atitude profissional | Clean Code, padrão de commits e PRs, CI, fluxo de resolução de conflitos |
