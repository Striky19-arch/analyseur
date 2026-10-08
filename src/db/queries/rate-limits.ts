import type { Database } from 'better-sqlite3';

import { getDb } from '../client';

/**
 * DAL — rate limiting (J1-05). **Tout accès SQL passe par `src/db/queries/`** :
 * ces fonctions sont les seules à préparer des requêtes sur `rate_limit_hits`.
 */

/** Enregistre une tentative à l'instant `at` (epoch ms). */
export function recordRateLimitHit(key: string, at: number, db: Database = getDb()): void {
  db.prepare('INSERT INTO rate_limit_hits (key, hit_at) VALUES (?, ?)').run(key, at);
}

/** Nombre de tentatives de `key` depuis `since` (epoch ms, inclus). */
export function countRateLimitHits(key: string, since: number, db: Database = getDb()): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM rate_limit_hits WHERE key = ? AND hit_at >= ?')
    .get(key, since) as { n: number };
  return row.n;
}

/** Plus ancienne tentative encore dans la fenêtre (pour calculer `Retry-After`). */
export function oldestRateLimitHit(
  key: string,
  since: number,
  db: Database = getDb(),
): number | null {
  const row = db
    .prepare('SELECT MIN(hit_at) AS t FROM rate_limit_hits WHERE key = ? AND hit_at >= ?')
    .get(key, since) as { t: number | null };
  return row.t ?? null;
}

/** Purge des tentatives antérieures à `before` (appelée à chaque enregistrement). */
export function pruneRateLimitHits(before: number, db: Database = getDb()): void {
  db.prepare('DELETE FROM rate_limit_hits WHERE hit_at < ?').run(before);
}

/** Efface l'historique d'un périmètre (connexion réussie, tests). */
export function clearRateLimitKey(key: string, db: Database = getDb()): void {
  db.prepare('DELETE FROM rate_limit_hits WHERE key = ?').run(key);
}
