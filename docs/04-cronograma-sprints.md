# 04 · Cronograma de sprints (H8)

Cada etapa é uma sprint com três trilhas: **Backend**, **Frontend** e **Gestão/Qualidade**.
Para importar no Trello ou no GitHub Projects, use [`trello-import.csv`](trello-import.csv) (uma linha por cartão).

> **Ajuste em relação ao plano original:** a Etapa 3 previa só GET, POST e PUT. Incluímos o **DELETE (soft delete)** nela, porque é um requisito obrigatório do enunciado (Regra de Ouro, H1) e porque o frontend da mesma etapa já precisa do botão de excluir.

## Quadro geral

| Etapa | Backend | Frontend | Gestão / Qualidade | Entregável verificável |
|---|---|---|---|---|
| 1 | Iniciar projeto Node (`backend/package.json`, Express 5, scripts) | Iniciar projeto React com Vite | Levantar requisitos funcionais e não funcionais → [`01-requisitos.md`](01-requisitos.md) | `npm run dev` sobe API e web |
| 2 | Arquitetura de pastas em camadas (rotas → service → repository) | Criar a logo (`Logo.jsx`, `favicon.svg`) | Organizar tarefas no Trello/GitHub Projects | [`02-arquitetura.md`](02-arquitetura.md), quadro criado |
| 3 | Rotas GET, POST, PUT e **DELETE (soft)** + migrations `users`, `transactions`, `audit_logs` | Consumir rotas de leitura, gravação, atualização e exclusão | Revisar regras de negócio (centavos, soft delete) | CRUD funcionando via Swagger e tela |
| 4 | Autenticação JWT (`/auth/login`, `/auth/me`, bcrypt) | Tela de login com autenticação (`LoginPage.jsx`, `AuthContext`) | Validação do fluxo de dados e endpoints | Login → token → rotas liberadas |
| 5 | Rotas protegidas e middlewares (`authenticate`, `authorize`, `validate`) | Criação do dashboard (layout, cartões de saldo) | Definição dos critérios de segurança e RBAC → [`05-seguranca-rbac.md`](05-seguranca-rbac.md) | Auditor recebe 403 ao tentar criar |
| 6 | Rotas do dashboard e agregações (`/dashboard/summary`, `/monthly`, `/categories`) + SSE | Consumo do dashboard e exibição de gráficos | Validação dos fluxos de navegação | Saldo muda em tempo real em duas abas |
| 7 | Filtros, paginação e busca (`GET /transactions?...`) | Componentização de tabela, busca e filtros | Modelagem de desempenho das consultas → [`06-desempenho.md`](06-desempenho.md) | Busca com debounce, 10/20/50/100 por página |
| 8 | Tratamento centralizado de erros (`errorHandler`) e validação Zod | Feedbacks: toasts, loaders, skeletons, modais de erro | Homologação de usabilidade e padronização → checklist em [`07-testes.md`](07-testes.md) | Todo erro tem `code`, `message`, `requestId` |
| 9 | Índices no banco, relatório CSV, idempotência | Memoização, code splitting, responsividade | Estratégia de testes unitários e e2e → [`07-testes.md`](07-testes.md) | `npm test` (28 testes) e `npm run test:e2e` (6) passam |
| 10 | Build de produção (Dockerfile, `render.yaml`) | Deploy do frontend (Vercel/Netlify) | Documentação final da API (Swagger), handover → [`08-deploy.md`](08-deploy.md) | URL pública funcionando |
| 11 | — | — | Gravar vídeo da aplicação e publicar no GitHub → [`09-roteiro-video.md`](09-roteiro-video.md) | Link do vídeo no README |

## Definição de pronto (vale para todo cartão)

- [ ] Código revisado por **outra pessoa** do grupo em um Pull Request
- [ ] `npm test` e `npm run build` passando (o CI do GitHub mostra verde)
- [ ] Sem `console.log` esquecido, sem código comentado morto
- [ ] Nomes em inglês no código, textos de tela em português
- [ ] Se mudou rota: Swagger (`backend/src/docs/openapi.yaml`) atualizado
- [ ] Cartão movido para **Concluído** com o link do PR

## Colunas sugeridas no quadro

`Backlog` → `A fazer (sprint)` → `Em andamento` → `Em revisão (PR aberto)` → `Concluído`

Etiquetas: `backend`, `frontend`, `gestão`, `bug`, `segurança`, `docs`.

## Fluxo de trabalho com Git (C10: colaboração e conflitos)

### Branches

```
main         ← sempre estável; só recebe merge de PR aprovado
└── develop  ← integração da sprint
    ├── feat/etapa-3-rotas-transacoes
    ├── feat/etapa-4-login
    └── fix/saldo-negativo-vermelho
```

### Commits no padrão Conventional Commits

```
feat(transactions): adiciona soft delete com motivo
fix(dashboard): corrige total do mês sem lançamentos
docs(readme): documenta rotas de relatório
test(auth): cobre token expirado
refactor(api): extrai cliente HTTP para services/api.js
```

### Como resolver um merge conflict (passo a passo para a apresentação)

```bash
git checkout feat/minha-tarefa
git fetch origin
git merge origin/develop          # aparece: CONFLICT (content): Merge conflict in src/...
# abra o arquivo, procure por <<<<<<< ======= >>>>>>>
# converse com quem escreveu o outro lado e decida juntos o resultado
# apague os marcadores, mantenha o código correto
npm test                          # garanta que nada quebrou
git add src/arquivo-resolvido.js
git commit                        # mensagem: "merge: resolve conflito em X mantendo Y"
git push
```

Dica para a avaliação: **registre um conflito real** (print do VS Code mostrando os marcadores e o PR resolvido). É evidência direta da competência C10.
