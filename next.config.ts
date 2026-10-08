import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { securityHeaders } from './src/lib/security/headers';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  // Image Docker multi-étapes (cdc.md §17) : le runtime copie `.next/standalone`.
  output: 'standalone',
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    // En-têtes de sécurité de base sur toutes les routes (J0-05) ; durcissement
    // CSP/HSTS en J9-02.
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default withNextIntl(nextConfig);
