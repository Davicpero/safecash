import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { env } from './config/env.js';
import { db } from './database/connection.js';
import { authenticate } from './middlewares/authenticate.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { requestId } from './middlewares/requestId.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { reportRoutes } from './modules/reports/reports.routes.js';
import { transactionRoutes } from './modules/transactions/transaction.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { subscribe } from './realtime/events.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const openApiDocument = YAML.parse(fs.readFileSync(path.join(here, 'docs', 'openapi.yaml'), 'utf8'));

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // IP real atrás do proxy do Render/Railway (usado no rate limit e na auditoria)

  app.use(requestId);
  // A página do Swagger usa scripts inline; ela recebe um helmet sem CSP, o resto da API recebe o completo
  const strictHeaders = helmet();
  const docsHeaders = helmet({ contentSecurityPolicy: false });
  app.use((req, res, next) => (req.path.startsWith('/api/docs')
    ? docsHeaders(req, res, next)
    : strictHeaders(req, res, next)));
  app.use(cors({
    origin: env.corsOrigins,
    exposedHeaders: ['X-Request-Id', 'Idempotent-Replayed'],
  }));
  app.use(express.json({ limit: '100kb' }));
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  // Rotas públicas
  app.get('/api/health', async (_req, res) => {
    await db.raw('select 1');
    res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, { customSiteTitle: 'SafeCash API' }));
  app.get('/api/openapi.json', (_req, res) => res.json(openApiDocument));

  app.use('/api/auth', authRoutes);

  // Daqui para baixo, tudo exige token
  app.use('/api', authenticate);
  app.get('/api/events', subscribe);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/users', userRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
