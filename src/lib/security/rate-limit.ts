import type { Database } from 'better-sqlite3';

import { getDb } from '@/db/client';
import {
  clearRateLimitKey,
  countRateLimitHits,
  oldestRateLimitHit,
  pruneRateLimitHits,
  recordRateLimitHit,
} from '@/db/queries/rate-limits';

/**
 * Rate limiting (J1-05, CDC §14.1) : fenêtre glissante par clé de périmètre,
 * **par IP et par compte** (les deux sont cumulatifs, le premier déclenché
 * bloque). Règle d'auth : 10 tentatives par fenêtre de 60 s — **la 10ᵉ
 * tentative de la fenêtre est refusée** (DoD J1-05 : « 10 tentatives de
 * connexion en 1 min → 429 RATE_LIMITED »).
 *
 * Choisie sur table SQLite plutôt qu'en mémoire (l'alternative du CDC) : le
 * compteur survit aux redémarrages et reste inspectable/testable depuis les
 * tests. Les mêmes primitives serviront à l'upload et à la génération (J3/J5).
 */
export type RateLimitRule = { limit: number; windowMs: number };

/** Règle d'authentification : seuil 10 tentatives / 60 s. */
export const AUTH_RATE_LIMIT: RateLimitRule = { limit: 10, windowMs: 60_000 };

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Enregistre la tentative **puis** décide : `count >= limit` refuse (la 10ᵉ
 * tentative d'une fenêtre tombe donc sous le seuil). Les tentatives refusées
 * sont aussi comptées — marteler prolonge le blocage, la fenêtre glissante
 * s'efface seule après 60 s de calme. `Retry-After` vise la sortie de la
 * plus ancienne tentative encore dans la fenêtre.
 */
export function consumeRateLimit(
  key: string,
  rule: RateLimitRule = AUTH_RATE_LIMIT,
  options: { now?: number; db?: Database } = {},
): RateLimitDecision {
  const db = options.db ?? getDb();
  const now = options.now ?? Date.now();
  const since = now - rule.windowMs;

  recordRateLimitHit(key, now, db);
  pruneRateLimitHits(since, db);

  const count = countRateLimitHits(key, since, db);
  if (count < rule.limit) {
    return { allowed: true };
  }
  const oldest = oldestRateLimitHit(key, since, db);
  const retryAfterMs = oldest !== null ? oldest + rule.windowMs - now : rule.windowMs;
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
}

/** Périmètres d'un flux d'auth : IP (si connue) **et** compte (e-mail normalisé). */
export type AuthScopes = { ipKey: string | null; accountKey: string };

export function authScopes(
  action: 'login' | 'register',
  email: string,
  ip?: string | null,
): AuthScopes {
  return {
    ipKey: ip ? `${action}:ip:${ip}` : null,
    accountKey: `${action}:account:${email}`,
  };
}

/**
 * Contrôle des deux périmètres pour un flux d'auth ; renvoie la décision du
 * premier déclenché. La tentative est comptée dans les deux cas (refusée ou
 * non).
 */
export function checkAuthRateLimits(
  scopes: AuthScopes,
  rule: RateLimitRule = AUTH_RATE_LIMIT,
  options: { now?: number; db?: Database } = {},
): RateLimitDecision {
  for (const key of [scopes.ipKey, scopes.accountKey]) {
    if (key === null) {
      continue;
    }
    const decision = consumeRateLimit(key, rule, options);
    if (!decision.allowed) {
      return decision;
    }
  }
  return { allowed: true };
}

/**
 * Efface le compteur du compte après une **connexion réussie** : les erreurs
 * d'un utilisateur légitime n'accumulent pas de blocage pour lui (le compteur
 * par IP, lui, reste — c'est la digue contre le spray de mots de passe).
 */
export function resetAccountRateLimit(scopes: AuthScopes, db: Database = getDb()): void {
  clearRateLimitKey(scopes.accountKey, db);
}
