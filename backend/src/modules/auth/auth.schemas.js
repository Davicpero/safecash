import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string({ error: 'Informe o e-mail.' })
    .trim().toLowerCase().email('E-mail inválido.'),
  password: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.').max(128),
});
