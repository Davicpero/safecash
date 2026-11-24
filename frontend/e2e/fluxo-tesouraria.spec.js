import { expect, test } from '@playwright/test';

/** Converte "R$ 62.434,17" em centavos (inteiro) para comparar sem float. */
const toCents = (text) => Number(text.replace(/[^\d,-]/g, '').replace(',', ''));

async function login(page, perfil) {
  await page.goto('/login');
  await page.getByRole('button', { name: perfil }).click();
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('.live-balance__value')).toBeVisible();
}

test('operador lança "Pagamento de Aluguel - R$ 2.000,00" e o saldo cai na hora', async ({ page }) => {
  await login(page, 'Operador');
  const saldo = page.locator('.live-balance__value');
  const antes = toCents(await saldo.innerText());

  await page.goto('/transacoes');
  await page.getByRole('button', { name: /Novo lançamento/ }).click();
  await page.getByPlaceholder('Ex.: Pagamento de Aluguel').fill(`Pagamento de Aluguel e2e ${Date.now()}`);
  await page.getByPlaceholder('0,00').fill('200000');
  await expect(page.getByPlaceholder('0,00')).toHaveValue('2.000,00');
  await page.getByPlaceholder('Escolha ou digite uma nova').fill('Aluguel');
  await page.getByRole('button', { name: 'Lançar' }).click();

  await expect(page.getByText(/Lançamento de R\$\s2\.000,00 registrado/)).toBeVisible();
  await expect.poll(async () => toCents(await saldo.innerText())).toBe(antes - 200000);
});

test('formulário vazio mostra os erros de cada campo', async ({ page }) => {
  await login(page, 'Operador');
  await page.goto('/transacoes');
  await page.getByRole('button', { name: /Novo lançamento/ }).click();
  await page.getByRole('button', { name: 'Lançar' }).click();
  await expect(page.getByText('Informe um valor maior que zero.')).toBeVisible();
  await expect(page.getByText('Informe a categoria.')).toBeVisible();
});

test('auditor não vê botões de escrita nem a tela de usuários', async ({ page }) => {
  await login(page, 'Auditor');
  await page.goto('/transacoes');
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Novo lançamento/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
  await page.goto('/usuarios');
  await expect(page).toHaveURL(/\/$/);
});
