# 08 · Build, deploy e handover (Etapa 10)

Arquitetura de produção sugerida (tudo com plano gratuito):

```
Vercel ou Netlify (frontend estático)  ──HTTPS──▶  Render (API Node)  ──▶  Render PostgreSQL
```

## 1. Banco + API no Render

1. Suba o repositório no GitHub.
2. Render → **New → Blueprint** → escolha o repositório. O arquivo `render.yaml` cria:
   - o banco `safecash-db` (PostgreSQL);
   - o serviço `safecash-api` (pasta `backend`), com `JWT_SECRET` gerado automaticamente.
3. Em **Environment** do serviço, preencha `CORS_ORIGIN` com a URL do frontend (passo 2).
4. Teste: `https://SEU-SERVICO.onrender.com/api/health` → `{"status":"ok"}`.
   Documentação: `https://SEU-SERVICO.onrender.com/api/docs`.

> As migrations rodam sozinhas a cada subida. Com `SEED_ON_START=true`, os dados de demonstração entram **só se o banco estiver vazio**.
> No plano gratuito o serviço "dorme" após inatividade; a primeira requisição pode levar ~30 s.

## 2. Frontend na Vercel

1. Vercel → **Add New Project** → importe o repositório.
2. **Root Directory:** `frontend` · Framework: Vite (detectado).
3. **Environment Variables:** `VITE_API_URL = https://SEU-SERVICO.onrender.com/api`
4. Deploy. O `vercel.json` já redireciona todas as rotas para o `index.html` (SPA).

**Netlify (alternativa):** Base directory `frontend`, build `npm run build`, publish `dist`, mesma variável `VITE_API_URL`. O arquivo `public/_redirects` já cuida das rotas.

**S3 (alternativa):** `npm run build` e envie `dist/` para um bucket com hospedagem estática; configure o documento de erro como `index.html`.

## 3. Rodar a produção localmente com Docker

```bash
docker compose up --build
# API em http://localhost:3333 com PostgreSQL
cd frontend && npm run dev
```

## 4. Build de produção (o que cada comando gera)

| Parte | Comando | Resultado |
|---|---|---|
| Frontend | `cd frontend && npm run build` | `dist/` com HTML, CSS e JS minificados e divididos por tela |
| API (imagem) | `docker build -t safecash-api backend` | Imagem Node 22 Alpine, só dependências de produção, usuário sem root, healthcheck |
| API (sem Docker) | `npm ci --omit=dev && node src/server.js` | Servidor com migrations automáticas |

## 5. Variáveis de ambiente

| Variável | Onde | Exemplo | Obrigatória em produção |
|---|---|---|---|
| `NODE_ENV` | API | `production` | sim |
| `PORT` | API | `3333` | o Render define sozinho |
| `DB_CLIENT` | API | `pg` | sim |
| `DATABASE_URL` | API | `postgres://...` | sim |
| `DATABASE_SSL` | API | `false` só no Docker local | não (padrão: ligado em produção) |
| `JWT_SECRET` | API | 48+ bytes aleatórios | **sim, a API não sobe sem** |
| `JWT_EXPIRES_IN` | API | `8h` | não |
| `CORS_ORIGIN` | API | `https://safecash.vercel.app` | sim |
| `LOGIN_RATE_LIMIT` | API | `10` | não |
| `SEED_ON_START` | API | `true` na demo | não |
| `VITE_API_URL` | Frontend | `https://.../api` | sim |

## 6. Handover: checklist de entrega

- [ ] README com instalação testada em uma máquina "limpa" por alguém que não programou o projeto
- [ ] Swagger público e atualizado
- [ ] URL do frontend e da API no topo do README
- [ ] Credenciais de demonstração no README (e só de demonstração)
- [ ] CI verde na branch `main`
- [ ] Quadro do Trello/GitHub Projects com todos os cartões em "Concluído"
- [ ] Vídeo gravado e linkado (Etapa 11)
- [ ] Tag de versão: `git tag v1.0.0 && git push --tags`
