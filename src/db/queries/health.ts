import type { Database } from 'better-sqlite3';

import { getDb } from '../client';

/** Vérifie l'accès à la base (`SELECT 1`) — consommé par `GET /api/health`. */
export function pingDatabase(db: Database = getDb()): boolean {
  const row = db.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
  return row?.ok === 1;
}
