# 07 · Estratégia de testes e homologação (Etapas 8 e 9)

## Pirâmide de testes

```
          ▲  E2E (Playwright)           6 testes   — fluxo real no navegador, desktop + celular
         ▲▲▲ Integração (Supertest)    24 testes   — API + banco de verdade (SQLite e PostgreSQL)
       ▲▲▲▲▲ Unitário (Vitest)          4 testes   — dinheiro e datas
```

| Tipo | Ferramenta | Onde | Comando |
|---|---|---|---|
| Unitário | Vitest | `backend/tests/money.test.js` | `cd backend && npm test` |
| Integração | Vitest + Supertest | `backend/tests/*.test.js` | `cd backend && npm test` |
| Integração no PostgreSQL | idem | idem | `DB_CLIENT=pg DATABASE_URL=... npm test` |
| Ponta a ponta | Playwright | `frontend/e2e/` | `cd frontend && npm run test:e2e` |
| Contínuo | GitHub Actions | `.github/workflows/ci.yml` | automático a cada push/PR |

Os testes de integração usam um banco SQLite **em memória**, recriado a cada arquivo: rápidos (≈4 s) e sem sujar o banco de desenvolvimento.

## O que é testado (casos que importam para a avaliação)

**Regra de Ouro e rastreabilidade (H1)**
- `DELETE` marca `deleted_at`, o registro **continua no banco**, e sai do saldo e da listagem.
- Excluir 3 registros não reduz a contagem de linhas da tabela.
- Histórico mostra `CREATE → UPDATE → DELETE` com antes/depois e motivo.
- Transação excluída não pode ser editada; excluir duas vezes → 409.

**Integridade financeira**
- "Pagamento de Aluguel R$ 2.000,00" reduz o saldo em **exatamente** 200.000 centavos.
- `0.1 + 0.2` em centavos = 30 exatos.
- Valor negativo, zero, com 3 casas decimais ou texto → 400 com o campo `amount` apontado.
- Data inexistente (30/02) → 400.
- Campo forjado (`created_by`) → 400.
- Mesma `Idempotency-Key` duas vezes → um único lançamento.
- Edição com versão antiga → 409 `VERSION_CONFLICT`.
- Saldo do dashboard = soma manual de todas as linhas ativas.

**Segurança**
- Sem token → 401; token adulterado → 401 `INVALID_TOKEN`.
- Senha errada → 401 com mensagem genérica.
- Auditor criando transação → 403; operador vendo usuários → 403; operador vendo excluídas → 403; operador restaurando → 403.

**Erros padronizados**
- JSON malformado → 400 `INVALID_JSON` com `requestId`.
- ID inexistente → 404.

**E2E (desktop e celular)**
- Login → novo lançamento com máscara de valor → toast → saldo do topo cai R$ 2.000,00.
- Formulário vazio mostra o erro de cada campo.
- Auditor não vê botões de escrita e é redirecionado se abrir `/usuarios`.

## Como rodar o E2E

```bash
# terminal 1
cd backend && npm run db:reset && npm run dev
# terminal 2
cd frontend
npx playwright install chromium   # só na primeira vez
npm run test:e2e
```

## Checklist de homologação de usabilidade (Etapa 8)

Faça com os três perfis, no desktop **e** no celular.

**Feedback**
- [ ] Toda ação que salva mostra um toast de sucesso
- [ ] Todo erro mostra mensagem em português, sem termos técnicos
- [ ] Erros de validação aparecem **embaixo do campo** certo
- [ ] Carregamentos mostram skeleton ou spinner (nada de tela "congelada")
- [ ] Botão de salvar fica desabilitado enquanto salva (sem duplo envio)
- [ ] Lista vazia mostra mensagem e próximo passo, não uma tabela vazia

**Dinheiro**
- [ ] Valores sempre em `R$ 1.234,56`
- [ ] Entradas com `+` em verde-azulado, saídas com `−`
- [ ] Saldo negativo fica em vermelho
- [ ] Campo de valor aceita só números e formata enquanto digita

**Ações destrutivas**
- [ ] Excluir pede confirmação, explica que o registro fica na auditoria e aceita motivo
- [ ] Restaurar pede confirmação

**Navegação e acessibilidade**
- [ ] Dá para usar tudo só com teclado (Tab, Enter, Esc fecha modal)
- [ ] O item de menu da tela atual fica destacado
- [ ] Celular: menu inferior, tabela em cartões, modal abre de baixo
- [ ] Botões só com ícone têm `aria-label`
- [ ] Gráfico tem a opção "Ver em tabela"
- [ ] Cores do gráfico validadas para daltonismo (entradas `#0d9488`, saídas `#e11d48`)

**Padronização**
- [ ] Mesmos espaçamentos, raios e cores em todas as telas (tokens no `:root` do CSS)
- [ ] Títulos de página com subtítulo explicando a tela
- [ ] Datas no formato `dd/mm/aaaa`
