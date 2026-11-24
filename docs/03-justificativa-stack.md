# 03 · Justificativa da stack (H2, H3, H4)

> Pergunta da SafeCash: *por que JavaScript/Node.js é a escolha certa para um sistema de tesouraria multiplataforma?*

## Resposta curta

Uma única linguagem (JavaScript) roda **no navegador do desktop, no navegador do celular e no servidor**. Isso dá à SafeCash três coisas que uma startup precisa ao mesmo tempo: **velocidade de entrega**, **um time menor que cobre o produto inteiro** e **o maior mercado de profissionais e bibliotecas do mundo**. Os riscos clássicos do JavaScript em finanças (ponto flutuante, tipagem fraca) foram tratados no projeto com técnicas específicas, descritas abaixo.

## 1. Requisito multiplataforma (Web + Mobile responsivo)

| Necessidade da SafeCash | Como a stack atende |
|---|---|
| Rodar em qualquer computador sem instalar nada | React gera uma aplicação web; basta um navegador |
| Funcionar bem no celular | O mesmo React com CSS responsivo: a tabela vira cartões e o menu vira barra inferior (veja os prints do README) |
| Evoluir para app nativo no futuro | **React Native** reaproveita a lógica (`services/api.js`, `utils/format.js`, contextos) e o conhecimento do time |
| Uma única fonte de regras de formatação de dinheiro | `utils/format.js` e `utils/money.js` são JavaScript puro e podem ser compartilhados entre web, mobile e API |

## 2. Por que Node.js no backend

1. **Mesma linguagem do frontend.** Um desenvolvedor consegue ir de uma tela React até a consulta SQL sem trocar de linguagem. Em um time pequeno, isso reduz gargalos: qualquer pessoa pode corrigir qualquer camada.
2. **Ótimo para APIs de E/S.** Uma API de tesouraria passa a maior parte do tempo esperando o banco e a rede. O modelo assíncrono do Node (event loop) atende muitas requisições simultâneas com pouca memória.
3. **Tempo real nativo.** O saldo ao vivo usa *Server-Sent Events*: centenas de conexões abertas custam pouco no Node, porque ele não reserva uma thread por conexão.
4. **Ecossistema maduro para cada requisito do enunciado:**

| Requisito | Biblioteca |
|---|---|
| API REST | Express 5 (com tratamento nativo de erros em funções `async`) |
| Validação de esquema | Zod |
| Banco relacional + migrations | Knex (SQLite no desenvolvimento, PostgreSQL em produção) |
| Autenticação | jsonwebtoken + bcryptjs |
| Segurança HTTP | Helmet, CORS, express-rate-limit |
| Documentação | Swagger UI (OpenAPI 3.1) |
| Testes | Vitest + Supertest (API), Playwright (ponta a ponta) |

## 3. Por que React no frontend

- Componentes reutilizáveis (tabela, modal, formulário, cartões de saldo) mantêm a interface consistente.
- Estado previsível: o saldo é um contexto (`BalanceContext`) que qualquer tela lê e que se atualiza sozinho.
- **Vite** dá recarregamento instantâneo no desenvolvimento e build de produção otimizado (divisão de código por tela).

## 4. Dados de mercado

- **Stack Overflow Developer Survey 2025:** JavaScript segue como a linguagem mais usada; **Node.js (≈49%) e React (≈45%)** são as duas tecnologias web mais usadas; **PostgreSQL** é o banco mais usado entre profissionais. Fonte: <https://survey.stackoverflow.co/2025/technology/>
- **State of JavaScript 2025:** Node.js é o runtime de backend de 90% dos respondentes; React é o framework mais usado. Fonte: <https://www.infoq.com/news/2026/03/state-of-js-survey-2025>

Para a SafeCash, isso significa **contratar mais rápido** e **encontrar resposta pronta para quase todo problema**.

## 5. Os riscos do JavaScript em finanças, e como foram neutralizados

| Risco | Exemplo | Solução aplicada no projeto |
|---|---|---|
| Ponto flutuante | `0.1 + 0.2 === 0.30000000000000004` | Todo valor é **inteiro em centavos** (`amount_cents`). A conversão de "2000,50" para `200050` é feita por texto, sem float (`utils/money.js`). Teste automatizado comprova. |
| Tipagem fraca | `"10" + 5 === "105"` | **Zod** valida e converte toda entrada antes da regra de negócio; o banco reforça com `CHECK`. |
| Erros em código assíncrono derrubando o servidor | promessa rejeitada sem `catch` | Express 5 encaminha erros `async` ao `errorHandler` central. |
| "Qualquer um pode mandar qualquer campo" | cliente envia `created_by: 1` | Esquemas `.strict()` recusam campos desconhecidos. |

## 6. Alternativas consideradas

| Stack | Ponto forte | Por que não foi a escolha aqui |
|---|---|---|
| Java + Spring | Robustez, muito usado em bancos | Duas linguagens no time (Java + JS no front), mais código para o mesmo CRUD, ciclo de desenvolvimento mais lento para uma startup |
| Python + Django/FastAPI | Produtividade, dados/IA | Também exige JS no frontend; tempo real exige peças extras |
| PHP + Laravel | Hospedagem barata | Menos aderente a tempo real e a apps mobile com o mesmo código |

**Conclusão:** para uma startup que precisa entregar rápido, em web e celular, com time enxuto e tempo real, JavaScript fullstack é a escolha mais eficiente, **desde que** as regras de integridade financeira sejam tratadas com disciplina, como foi feito neste projeto.
