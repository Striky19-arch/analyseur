import { cookies } from 'next/headers';
import { connection } from 'next/server';

import { getDb } from '@/db/client';
import { currentLocale, redirectTo } from '@/lib/i18n/redirect';
import { SESSION_COOKIE_NAME } from '@/lib/security/session-cookie';

import { loadSessionUser, type LoadSessionUserResult, type SessionUser } from './session';

/**
 * Garde d'accès (J1-04, CDC §6.2) : recharge la session **et** le statut de
 * l'utilisateur **à chaque requête protégée** — un utilisateur révoqué (statut
 * modifié en base) est refusé dès sa requête suivante, redirigé vers
 * `/login?reason=revoked`. C'est ici la vérification d'autorisation réelle,
 * côté Node (le proxy ne fait qu'un pré-contrôle de cookie).
 */
export async function requireUser(): Promise<SessionUser> {
  // Rendu lié à la requête : l'expiration de la session lit `Date.now()`,
  // valeur « instable » que Next 16 (Instant Navigations) refuse de prerender.
  await connection();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const result: LoadSessionUserResult = token
    ? loadSessionUser(token, getDb())
    : { ok: false, reason: 'invalid' };

  if (!result.ok) {
    if (result.reason === 'not_active' && result.status === 'revoked') {
      redirectTo('/login?reason=revoked', await currentLocale());
    }
    redirectTo('/login', await currentLocale());
  }
  return result.user;
}

/** Admin = `role='admin'` **ET** `status='active'` (CDC §6.3). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') {
    redirectTo('/', await currentLocale());
  }
  return user;
}
