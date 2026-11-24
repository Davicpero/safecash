import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import { requestContext } from '../audit/audit.service.js';
import { loginSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';

export const authRoutes = Router();

// Proteção contra força bruta: N tentativas ERRADAS por IP a cada 15 minutos
// (logins bem-sucedidos não contam, para não bloquear a equipe no mesmo Wi-Fi)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.loginRateLimit,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (req, res) => res.status(429).json({
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Muitas tentativas de login. Aguarde alguns minutos.',
      requestId: req.id,
    },
  }),
});

authRoutes.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res) => {
  const result = await authService.login(req.valid.body, requestContext(req));
  res.json(result);
});

authRoutes.get('/me', authenticate, async (req, res) => {
  res.json({ user: authService.toPublicUser(req.user) });
});
