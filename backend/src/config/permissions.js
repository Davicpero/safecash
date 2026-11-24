/**
 * RBAC (Role-Based Access Control).
 * Cada perfil recebe uma lista de permissões. As rotas pedem permissões,
 * nunca perfis, assim um novo perfil não exige mudar as rotas.
 */
export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  AUDITOR: 'AUDITOR',
});

export const PERMISSIONS = Object.freeze({
  TRANSACTION_READ: 'transaction:read',
  TRANSACTION_CREATE: 'transaction:create',
  TRANSACTION_UPDATE: 'transaction:update',
  TRANSACTION_DELETE: 'transaction:delete',
  TRANSACTION_RESTORE: 'transaction:restore',
  TRANSACTION_READ_DELETED: 'transaction:read-deleted',
  AUDIT_READ: 'audit:read',
  REPORT_READ: 'report:read',
  USER_MANAGE: 'user:manage',
});

const P = PERMISSIONS;

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: Object.values(P),
  [ROLES.OPERATOR]: [
    P.TRANSACTION_READ,
    P.TRANSACTION_CREATE,
    P.TRANSACTION_UPDATE,
    P.TRANSACTION_DELETE,
    P.REPORT_READ,
  ],
  [ROLES.AUDITOR]: [
    P.TRANSACTION_READ,
    P.TRANSACTION_READ_DELETED,
    P.AUDIT_READ,
    P.REPORT_READ,
  ],
});

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsOf(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}
