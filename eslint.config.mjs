import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // J0-04 : aucun littéral de texte dans les composants (i18n obligatoire).
    // Exclusion des composants shadcn générés (`src/components/ui`), qui sont
    // du code vendor régénérable depuis le registry.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**'],
    rules: {
      'react/jsx-no-literals': 'error',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Artefacts générés (couverture, Playwright) : hors périmètre du lint.
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
  ]),
]);

export default eslintConfig;
