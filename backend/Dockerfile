# Imagem de produção da API (Etapa 10 — Build)
FROM node:22-alpine AS deps
WORKDIR /app
# better-sqlite3 pode precisar compilar no Alpine
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3333/api/health || exit 1
CMD ["node", "src/server.js"]
