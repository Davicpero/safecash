import { hasPermission } from '../config/permissions.js';
import { AppError } from '../utils/AppError.js';

/**
 * Etapa 5 — RBAC. Uso: router.post('/', authorize(PERMISSIONS.TRANSACTION_CREATE), ...)
 * Deve vir depois de authenticate().
 */
export function authorize(...requiredPermissions) {
  return (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized();

    const allowed = requiredPermissions.every((permission) => hasPermission(req.user.role, permission));
    if (!allowed) throw AppError.forbidden();

    next();
  };
}
