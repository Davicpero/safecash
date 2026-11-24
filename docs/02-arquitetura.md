# 02 · Arquitetura (Etapa 2)

## Visão geral

```mermaid
flowchart LR
  subgraph Cliente["Navegador (desktop ou celular)"]
    UI[React + Vite]
  end
  subgraph API["Node.js + Express 5"]
    MW[Middlewares<br/>helmet · cors · requestId<br/>authenticate · authorize · validate]
    R[Rotas / controllers]
    S[Services<br/>regras de negócio]
    REPO[Repository<br/>SQL via Knex]
    SSE[Hub de eventos SSE]
    ERR[errorHandler central]
  end
  DB[(SQLite dev<br/>PostgreSQL prod)]

  UI -- "HTTPS + JWT" --> MW --> R --> S --> REPO --> DB
  S -- "transactions:changed" --> SSE -- "text/event-stream" --> UI
  R -. erro .-> ERR
```

### Por que em camadas

| Camada | Responsabilidade | Não pode |
|---|---|---|
| **Rotas** (`*.routes.js`) | Ler a requisição já validada, chamar o service, escolher o status HTTP | Ter SQL ou regra de negócio |
| **Service** (`*.service.js`) | Regras: soft delete, trava otimista, idempotência, auditoria, avisar o SSE | Conhecer `req`/`res` |
| **Repository** (`*.repository.js`) | SQL e conversão linha do banco → objeto da API | Decidir regra de negócio |
| **Middlewares** | Segurança, validação, erros, rastreio | — |

Assim cada parte é testável e trocável: mudar de SQLite para PostgreSQL mexeu só na configuração do Knex.

## Estrutura de pastas

```
safecash/
├── backend/
│   ├── src/
│   │   ├── app.js                  # monta o Express (middlewares + rotas)
│   │   ├── server.js               # sobe o servidor, migrations e desligamento gracioso
│   │   ├── config/                 # env.js (variáveis), permissions.js (RBAC)
│   │   ├── database/
│   │   │   ├── migrations/         # versões do banco (users, transactions, audit_logs, índices)
│   │   │   ├── seeds/              # dados de demonstração
│   │   │   ├── connection.js       # instância única do Knex
│   │   │   └── cli.js              # npm run db:migrate | db:seed | db:reset
│   │   ├── middlewares/            # authenticate, authorize, validate, errorHandler, requestId
│   │   ├── modules/                # um módulo por domínio
│   │   │   ├── auth/  transactions/  dashboard/  reports/  audit/  users/
│   │   ├── realtime/events.js      # Server-Sent Events (saldo em tempo real)
│   │   ├── utils/                  # AppError, money (centavos), dates
│   │   └── docs/openapi.yaml       # documentação Swagger
│   └── tests/                      # Vitest + Supertest
├── frontend/
│   ├── src/
│   │   ├── components/             # Logo, Modal, Table, Form, Filters, charts/...
│   │   ├── contexts/               # AuthContext (sessão), BalanceContext (saldo ao vivo)
│   │   ├── hooks/                  # useDebounce, useDataChanged
│   │   ├── pages/                  # Login, Dashboard, Transações, Auditoria, Usuários
│   │   ├── services/               # api.js (HTTP), realtime.js (SSE)
│   │   ├── utils/format.js         # moeda, datas, máscara de valor
│   │   └── styles/global.css
│   └── e2e/                        # Playwright (desktop + celular)
├── docs/                           # este material
└── .github/workflows/ci.yml        # testes e build a cada push
```

## Modelo de dados

```mermaid
erDiagram
  USERS ||--o{ TRANSACTIONS : "cria (created_by)"
  USERS ||--o{ TRANSACTIONS : "altera (updated_by)"
  USERS ||--o{ TRANSACTIONS : "exclui (deleted_by)"
  USERS ||--o{ AUDIT_LOGS : "executa"
  TRANSACTIONS ||--o{ AUDIT_LOGS : "tem histórico"

  USERS {
    int id PK
    string name
    string email UK
    string password_hash
    string role "ADMIN | OPERATOR | AUDITOR"
    boolean active
    timestamp created_at
    timestamp updated_at
  }
  TRANSACTIONS {
    int id PK
    string description
    int amount_cents "CHECK > 0"
    string type "INCOME | EXPENSE"
    string category
    string transaction_date "AAAA-MM-DD"
    text notes
    string idempotency_key UK
    int version "trava otimista"
    int created_by FK
    timestamp created_at
    int updated_by FK
    timestamp updated_at
    int deleted_by FK
    timestamp deleted_at "NULL = ativa"
  }
  AUDIT_LOGS {
    int id PK
    string entity "transaction | user | auth"
    int entity_id
    string action "CREATE | UPDATE | DELETE | RESTORE | LOGIN | LOGIN_FAILED"
    int user_id FK
    text before_data "JSON"
    text after_data "JSON"
    string reason
    string ip
    string request_id
    timestamp created_at
  }
```

## Fluxo de uma criação de transação

```mermaid
sequenceDiagram
  participant F as Frontend
  participant A as API
  participant DB as Banco
  participant O as Outros navegadores

  F->>A: POST /api/transactions<br/>Authorization: Bearer JWT<br/>Idempotency-Key: uuid
  A->>A: authenticate → authorize(transaction:create) → validate(Zod)
  A->>DB: já existe essa Idempotency-Key?
  alt já existe (duplo clique / reenvio)
    A-->>F: 200 + registro original (nada é duplicado)
  else nova
    A->>DB: BEGIN
    A->>DB: INSERT transactions
    A->>DB: INSERT audit_logs (CREATE, after)
    A->>DB: COMMIT
    A-->>F: 201 + transação
    A--)O: SSE transactions:changed
    O->>A: GET /api/dashboard/summary
  end
```

## Decisões técnicas (ADR resumido)

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Centavos inteiros | `FLOAT`/`DECIMAL` em JS | `0.1 + 0.2 = 0.30000000000000004` em ponto flutuante |
| Knex (query builder) | ORM pesado (Prisma/Sequelize) | SQL visível para estudar; migrations; troca SQLite ↔ PostgreSQL sem mudar código |
| SSE para tempo real | WebSocket / polling | Só o servidor precisa falar; SSE é HTTP puro, reconecta sozinho e atravessa proxies |
| Trava otimista (`version`) | Lock no banco | Sem travar linhas; conflito vira mensagem clara para o usuário |
| Idempotency-Key | Checar "mesma descrição e valor" | Dois aluguéis iguais no mesmo dia podem ser legítimos; a chave identifica o *envio*, não o conteúdo |
| RBAC por permissão | `if (role === 'ADMIN')` espalhado | Criar um perfil novo não exige mexer em rotas |
