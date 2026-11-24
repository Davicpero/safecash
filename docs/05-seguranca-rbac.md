# 05 · Segurança e RBAC (Etapa 5)

## Matriz de permissões

| Permissão | ADMIN | OPERATOR | AUDITOR |
|---|:-:|:-:|:-:|
| `transaction:read` — listar, ver, dashboard | ✅ | ✅ | ✅ |
| `transaction:create` | ✅ | ✅ | ❌ |
| `transaction:update` | ✅ | ✅ | ❌ |
| `transaction:delete` (soft) | ✅ | ✅ | ❌ |
| `transaction:read-deleted` — ver excluídas | ✅ | ❌ | ✅ |
| `transaction:restore` | ✅ | ❌ | ❌ |
| `audit:read` — trilha de auditoria | ✅ | ❌ | ✅ |
| `report:read` — exportar CSV | ✅ | ✅ | ✅ |
| `user:manage` — usuários e perfis | ✅ | ❌ | ❌ |

Fonte da verdade: `backend/src/config/permissions.js`. O frontend só **esconde** botões; quem **bloqueia** é a API (testado em `tests/auth.test.js`).

**Separação de funções:** quem lança (OPERATOR) não apaga rastros nem restaura; quem fiscaliza (AUDITOR) não altera nada.

## Camadas de defesa

| Ameaça | Defesa | Onde |
|---|---|---|
| Acesso sem login | JWT obrigatório em tudo, exceto `/auth/login`, `/health` e `/docs` | `app.js`, `middlewares/authenticate.js` |
| Token roubado de usuário demitido | A cada requisição, confere se o usuário ainda existe e está ativo | `authenticate.js` |
| Escalada de privilégio | Permissão checada por rota | `middlewares/authorize.js` |
| Força bruta no login | 10 tentativas **erradas** por IP a cada 15 min (429) | `auth.routes.js` |
| Descobrir quais e-mails existem | Mesma mensagem e mesmo tempo de resposta para e-mail inexistente e senha errada | `auth.service.js` |
| Senha vazada do banco | bcrypt com salt (custo 10) | `auth.service.js`, `users.routes.js` |
| Dados inválidos / valor negativo | Zod em body, query e params + `CHECK` no banco | `*.schemas.js`, migrations |
| Forjar campos de auditoria | Esquemas `.strict()` | `transaction.schemas.js` |
| SQL injection | Consultas parametrizadas do Knex; busca com `LIKE` escapado | `transaction.repository.js` |
| Lançamento duplicado | `Idempotency-Key` + `UNIQUE` | `transaction.service.js` |
| Edição simultânea sobrescrevendo outra | Trava otimista (`version`) | `transaction.repository.js` |
| Apagar provas | Sem DELETE físico; `audit_logs` sem rota de escrita | todo o módulo |
| Cabeçalhos inseguros / clickjacking | Helmet | `app.js` |
| Site de terceiros chamando a API | CORS com lista de origens | `CORS_ORIGIN` |
| Corpo gigante derrubando a API | Limite de 100 kb no JSON | `app.js` |
| CSV injection (fórmula no Excel) | Células iniciadas com `= + - @` viram texto | `reports.routes.js` |
| Vazar detalhes internos | Em produção, erro 500 responde mensagem genérica | `errorHandler.js` |
| Segredo fraco em produção | A API não sobe em produção sem `JWT_SECRET` | `config/env.js` |

## Onde o token fica no navegador

O token fica no `localStorage`, o que é simples e adequado ao escopo da disciplina. O risco é que um script injetado na página (XSS) consiga lê-lo. Mitigações aplicadas: React escapa todo texto exibido, não usamos `dangerouslySetInnerHTML` e a validade do token é curta (8 h). **Evolução recomendada para produção real:** cookie `HttpOnly` + `SameSite=Strict` com refresh token.

## Checklist de segurança antes do deploy

- [ ] `JWT_SECRET` com 48+ bytes aleatórios
- [ ] `CORS_ORIGIN` só com a URL do frontend de produção
- [ ] `NODE_ENV=production`
- [ ] Banco PostgreSQL com senha forte e SSL
- [ ] Trocar as senhas dos usuários de demonstração ou desativá-los
- [ ] `.env` fora do Git (já está no `.gitignore`)
