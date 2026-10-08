/**
 * En-têtes de sécurité de base (J0-05), appliqués à toutes les routes par
 * `next.config.ts`. La CSP est volontairement en **report-only** : elle
 * surveille sans bloquer tant que le durcissement n'est pas fait (J9-02 :
 * CSP stricte, HSTS, HTTPS obligatoire).
 */
export type SecurityHeader = { key: string; value: string };

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // `unsafe-inline`/`unsafe-eval` tolérés en report-only (Next.js injecte des
  // scripts inline) : à resserrer avec la CSP stricte de J9-02.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
].join('; ');

export const securityHeaders: SecurityHeader[] = [
  { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
