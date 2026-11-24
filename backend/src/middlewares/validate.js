/**
 * Etapa 5/8 — Validação de esquema (Zod) antes do controller.
 * O resultado já tipado e limpo fica em req.valid.{body,query,params}.
 * (No Express 5, req.query é somente leitura, por isso não o sobrescrevemos.)
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid = req.valid ?? {};
    for (const part of ['params', 'query', 'body']) {
      if (schemas[part]) {
        // parse() lança ZodError; o errorHandler converte em 400 VALIDATION_ERROR
        req.valid[part] = schemas[part].parse(req[part] ?? {});
      }
    }
    next();
  };
}
