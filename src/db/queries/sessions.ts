import type { Database } from 'better-sqlite3';

import { getDb } from '../client';

/**
 * DAL — sessions (J1-04). **Tout accès SQL passe par `src/db/queries/`** :
 * ces fonctions sont les seules à préparer des requêtes sur `sessions`.
 * La révocation immédiate (CDC §6.2) repose sur la suppression de lignes ici.
 */

export type SessionRow = {
  id: string;
  userId: string;
  expiresAt: number;
  ip: string | null;
  userAgent: string | null;
  createdAt: number;
};

function mapSession(row: Record<string, unknown>): SessionRow {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    expiresAt: row.expires_at as number,
    ip: (row.ip as string | null) ?? null,
    userAgent: (row.user_agent as string | null) ?? null,
    createdAt: row.created_at as number,
  };
}

export function insertSession(session: SessionRow, db: Database = getDb()): void {
  db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    session.id,
    session.userId,
    session.expiresAt,
    session.ip,
    session.userAgent,
    session.createdAt,
  );
}

export function findSessionById(id: string, db: Database = getDb()): SessionRow | null {
  const row = db
    .prepare(
      'SELECT id, user_id, expires_at, ip, user_agent, created_at FROM sessions WHERE id = ?',
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapSession(row) : null;
}

/** Prolonge l'expiration d'une session (glissement 7 j / 30 j max, J1-05). */
export function updateSessionExpiry(id: string, expiresAt: number, db: Database = getDb()): void {
  db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(expiresAt, id);
}

export function deleteSessionById(id: string, db: Database = getDb()): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function deleteUserSessions(userId: string, db: Database = getDb()): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}
