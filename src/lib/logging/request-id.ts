/**
 * Identifiant de corrélation de requête (J0-07). Module volontairement **sans
 * dépendance runtime** pour rester importable depuis `src/proxy.ts`.
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Nouvel identifiant de corrélation (UUID aléatoire). */
export function newRequestId(): string {
  return crypto.randomUUID();
}
