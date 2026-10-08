import type { Database } from 'better-sqlite3';

import { getDb } from '../client';

/**
 * DAL — utilisateurs (J1-04). **Tout accès SQL passe par `src/db/queries/`** :
 * ces fonctions sont les seules à préparer des requêtes sur `users`.
 */

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: 'user' | 'admin';
  status: 'active' | 'revoked' | 'pending';
  revokedAt: number | null;
  revokedBy: string | null;
  revokedReason: string | null;
  locale: string;
  theme: string;
  preferences: string | null;
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number | null;
};

const USER_COLUMNS =
  'id, email, name, password_hash, role, status, revoked_at, revoked_by, revoked_reason, locale, theme, preferences, created_at, updated_at, last_login_at';

function mapUser(row: Record<string, unknown>): UserRow {
  return {
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string | null) ?? null,
    passwordHash: row.password_hash as string,
    role: row.role as UserRow['role'],
    status: row.status as UserRow['status'],
    revokedAt: (row.revoked_at as number | null) ?? null,
    revokedBy: (row.revoked_by as string | null) ?? null,
    revokedReason: (row.revoked_reason as string | null) ?? null,
    locale: row.locale as string,
    theme: row.theme as string,
    preferences: (row.preferences as string | null) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    lastLoginAt: (row.last_login_at as number | null) ?? null,
  };
}

export function findUserByEmail(email: string, db: Database = getDb()): UserRow | null {
  const row = db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`).get(email) as
    Record<string, unknown> | undefined;
  return row ? mapUser(row) : null;
}

export function findUserById(id: string, db: Database = getDb()): UserRow | null {
  const row = db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(id) as
    Record<string, unknown> | undefined;
  return row ? mapUser(row) : null;
}

export function insertUser(
  user: {
    id: string;
    email: string;
    name?: string | null;
    passwordHash: string;
    role: 'user' | 'admin';
    status: 'active' | 'revoked' | 'pending';
  },
  db: Database = getDb(),
): void {
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(user.id, user.email, user.name ?? null, user.passwordHash, user.role, user.status);
}

export function setLastLoginAt(userId: string, at: number, db: Database = getDb()): void {
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(at, userId);
}
