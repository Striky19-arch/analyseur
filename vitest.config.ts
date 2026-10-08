import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    // Les appels d'auth émettent des événements d'audit pino : sortis en
    // silencieux pour garder la sortie des tests lisible.
    env: { LOG_LEVEL: 'silent' },
    // Unitaires et intégration (J0-06) ; l'E2E Playwright vit dans tests/e2e.
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      // Code vendor shadcn régénérable, hors périmètre de couverture.
      exclude: ['src/components/ui/**', 'src/**/*.d.ts'],
    },
  },
});
