import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta. Antes de rodar:
 *   1) backend:  cd backend && npm run db:reset && npm run dev
 *   2) navegador: npx playwright install chromium   (uma vez)
 *   3) aqui:     npm run test:e2e
 * O Vite é iniciado automaticamente pelo webServer abaixo.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    // Permite usar um Chrome já instalado: CHROME_PATH=/caminho/do/chrome
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
