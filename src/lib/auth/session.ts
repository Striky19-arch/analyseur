import { createHash, randomBytes } from 'node:crypto';

import type { Database } from 'better-sqlite3';

import { getDb } from '@/db/client';
import {
  deleteSessionById,
  deleteUserSessions as deleteUserSessionRows,
  findSessionById,
  insertSession,
  updateSessionExpiry,
  type SessionRow,
} from '@/db/queries/sessions';
import { findUserById } from '@/db/queries/users';

// ---------------------------------------------------------------------------
// Sessions en base (J1-01, CDC §5.2 / §6.2) : aucun JWT autonome — une session
// n'existe que si sa ligne existe en base, ce qui rend la révocation immédiate.
// Toute la couche SQL est déléguée à `src/db/queries/` (DAL, J1-04).
// ---------------------------------------------------------------------------

/** Inactivité maximale : 7 jours (CDC §14.1, durée glissante). */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Plafond absolu de session : 30 jours depuis la création (CDC §14.1). */
export const SESSION_MAX_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Le glissement n'écrit la ligne qu'au plus une fois par jour (limite l'écriture). */
export const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

/** Cookies de session (CDC §14.1) : `HttpOnly`, `SameSite=Lax`, `Secure` en production. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
} as const;

export type SessionMeta = { ip?: string | null; userAgent?: string | null };

export type { SessionRow };

/** Jeton brut (cookie) → ID **haché** stocké en base (CDC §5.2 : « ID haché »). */
function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Crée une session en base et renvoie le jeton brut (à déposer dans le cookie).
 * La base ne stocke que le hash SHA-256 du jeton : une fuite de la table
 * `sessions` ne permet pas d'usurper les sessions.
 */
export function createSession(
  userId: string,
  meta: SessionMeta = {},
  db: Database = getDb(),
): { token: string; session: SessionRow } {
  const token = generateSessionToken();
  const session: SessionRow = {
    id: hashSessionToken(token),
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
    createdAt: Date.now(),
  };
  insertSession(session, db);
  return { token, session };
}

/**
 * Vérifie un jeton **en base** : la session n'existe que si sa ligne existe et
 * n'est pas expirée (CDC §6.2 — aucune session « JWT autonome »). Une session
 * expirée est supprimée (nettoyage paresseux).
 *
 * **Glissement « 7 j / 30 j max »** (CDC §14.1, J1-05) : chaque vérification
 * réussie repousse l'expiration à `min(now + 7 j, created_at + 30 j)` — au plus
 * une écriture par jour. Le plafond absolu étant porté par `expires_at`, une
 * session meurt au plus tard 30 jours après sa création.
 */
export function verifySessionToken(token: string, db: Database = getDb()): SessionRow | null {
  const now = Date.now();
  const session = findSessionById(hashSessionToken(token), db);
  if (!session) {
    return null;
  }
  if (session.expiresAt <= now) {
    deleteSessionById(session.id, db);
    return null;
  }

  const target = Math.min(now + SESSION_TTL_MS, session.createdAt + SESSION_MAX_TTL_MS);
  if (session.expiresAt < target - SESSION_RENEW_AFTER_MS) {
    updateSessionExpiry(session.id, target, db);
    return { ...session, expiresAt: target };
  }
  return session;
}

/** Supprime la session portée par ce jeton (déconnexion, rotation). */
export function deleteSessionByToken(token: string, db: Database = getDb()): void {
  deleteSessionById(hashSessionToken(token), db);
}

/** Supprime **toutes** les sessions d'un utilisateur (révocation — J2-04). */
export function deleteUserSessions(userId: string, db: Database = getDb()): void {
  deleteUserSessionRows(userId, db);
}

/**
 * Rotation à la connexion (J1-01) : le jeton d'avant connexion est révoqué et
 * un **nouveau** jeton est émis (anti-fixation de session). Les sessions des
 * autres appareils de l'utilisateur sont conservées (liste des sessions
 * actives en J8-01).
 */
export function rotateSessionAtLogin(
  userId: string,
  meta: SessionMeta = {},
  previousToken?: string | null,
  db: Database = getDb(),
): { token: string; session: SessionRow } {
  if (previousToken) {
    deleteSessionByToken(previousToken, db);
  }
  return createSession(userId, meta, db);
}

// ---------------------------------------------------------------------------
// Vérification par requête (J1-04, CDC §6.2) — cœur testable de `requireUser` :
// recharge la session **et** le statut utilisateur à chaque appel, sans aucun
// cache. Un utilisateur révoqué est donc refusé dès sa requête suivante.
// ---------------------------------------------------------------------------

/** Utilisateur authentifié, sans secret (jamais de hash de mot de passe). */
export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'revoked' | 'pending';
  locale: string;
  theme: string;
};

export type LoadSessionUserResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: 'invalid' | 'not_active'; status?: 'revoked' | 'pending' };

export function loadSessionUser(token: string, db: Database = getDb()): LoadSessionUserResult {
  const session = verifySessionToken(token, db);
  if (!session) {
    return { ok: false, reason: 'invalid' };
  }

  const user = findUserById(session.userId, db);
  if (!user) {
    return { ok: false, reason: 'invalid' };
  }
  if (user.status !== 'active') {
    // La session ne survit pas à la perte du statut `active` (défense en
    // profondeur ; la transaction de révocation J2-04 supprime aussi les lignes).
    deleteSessionById(session.id, db);
    return { ok: false, reason: 'not_active', status: user.status };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      locale: user.locale,
      theme: user.theme,
    },
  };
}
