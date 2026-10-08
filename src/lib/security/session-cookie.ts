/**
 * Constantes de session partagées entre le middleware et les composants
 * serveur. Ce module est volontairement **sans dépendance runtime** pour
 * rester importable depuis `src/middleware.ts`.
 *
 * Provisoire (J0-05) : le nom du cookie sera aligné sur la librairie d'auth
 * retenue en J1-01.
 */
export const SESSION_COOKIE_NAME = 'app_session';
