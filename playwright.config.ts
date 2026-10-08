import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);

/**
 * Playwright (J0-06) : tests de bout en bout dans `tests/e2e`.
 * Le serveur est autonome : build de production puis `next start` (un serveur
 * déjà lancé est réutilisé hors CI).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  // Les specs partagent la base `data/e2e.db` (paramètres globaux comme
  // `registration_mode`) : aucun parallélisme intra-fichier, sinon les tests
  // se marchent dessus.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    // Locale explicite : next-intl négocie sinon via `Accept-Language`
    // (les navigateurs Playwright parlent `en-US` → pages `/en/*`).
    locale: 'fr-FR',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Base dédiée aux tests E2E (les specs y posent `registration_mode`, etc.).
    env: { DATABASE_PATH: 'data/e2e.db' },
  },
});
