import { ApiError } from '@/lib/api/errors';

/**
 * Protection CSRF (J1-05, CDC §14.1) :
 * - **Server Actions** : couvertes par la vérification d'origine **native** de
 *   Next.js (l'en-tête `Origin` est comparé à l'hôte de la requête avant
 *   l'exécution de l'action) — rien à ajouter côté application ;
 * - **Route Handlers mutants** (upload, annulation de job, etc.) : chaque
 *   handler doit appeler `assertSameOrigin(request)` en tête.
 *
 * Règle stricte (seule défense contre un POST cross-site sans jeton) :
 * - `Origin` présent → son hôte doit être celui de la requête (`Host`, ou
 *   `X-Forwarded-Host` derrière un proxy) ;
 * - `Origin` absent → seul un navigateur est acceptable : `Sec-Fetch-Site`
 *   vaut `same-origin` (fetch de l'application) ou `none` (navigation
 *   directe) ; un client sans ces en-têtes est refusé.
 */
export function assertSameOrigin(request: Request): void {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const origin = request.headers.get('origin');

  if (origin !== null) {
    if (host !== null && sameHost(origin, host)) {
      return;
    }
    throw new ApiError('FORBIDDEN', 'Origine de la requête refusée.');
  }

  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'same-origin' || secFetchSite === 'none') {
    return;
  }
  throw new ApiError('FORBIDDEN', 'Origine de la requête refusée.');
}

/** Compare l'hôte (et port) de l'`Origin` à celui de la requête, insensible à la casse. */
function sameHost(origin: string, host: string): boolean {
  try {
    return new URL(origin).host.toLowerCase() === host.trim().toLowerCase();
  } catch {
    return false;
  }
}
