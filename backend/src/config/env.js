/**
 * Configuração centralizada a partir de variáveis de ambiente.
 * Nenhum outro arquivo deve ler process.env diretamente.
 */
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isTest = NODE_ENV === 'test';
const isProduction = NODE_ENV === 'production';

const DEV_SECRET = 'dev-only-secret-troque-em-producao';

export const env = {
  nodeEnv: NODE_ENV,
  isTest,
  isProduction,
  port: Number(process.env.PORT ?? 3333),

  // Banco: "sqlite" (padrão, zero configuração) ou "pg" (PostgreSQL em produção)
  dbClient: process.env.DB_CLIENT ?? 'sqlite',
  databaseUrl: process.env.DATABASE_URL ?? '',
  // SSL ligado por padrão em produção (Render, Neon, Supabase); DATABASE_SSL=false desliga (Docker local)
  databaseSsl: process.env.DATABASE_SSL ? process.env.DATABASE_SSL === 'true' : isProduction,
  sqliteFile: isTest ? ':memory:' : (process.env.SQLITE_FILE ?? './data/safecash.db'),

  jwtSecret: process.env.JWT_SECRET ?? DEV_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',

  // Lista separada por vírgula. Ex.: "http://localhost:5173,https://safecash.vercel.app"
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  loginRateLimit: Number(process.env.LOGIN_RATE_LIMIT ?? 10),

  // Popular o banco com dados de demonstração na primeira subida (apenas se estiver vazio)
  seedOnStart: process.env.SEED_ON_START === 'true',
};

if (isProduction && env.jwtSecret === DEV_SECRET) {
  throw new Error('JWT_SECRET precisa ser definido em produção.');
}
