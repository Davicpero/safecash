import { randomUUID } from 'node:crypto';

/** Cada requisição ganha um ID, devolvido no header X-Request-Id e gravado na auditoria. */
export function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && incoming.length <= 64 ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
