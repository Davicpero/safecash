/**
 * Erro de negócio com status HTTP e código estável (o frontend usa o código,
 * não a mensagem, para decidir o que mostrar).
 */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Autenticação necessária.') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Você não tem permissão para esta ação.') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Recurso não encontrado.') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(code, message, details) {
    return new AppError(409, code, message, details);
  }
}
