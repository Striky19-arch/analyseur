import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

/**
 * Sessions réelles pour l'E2E (J1-04) : la garde `requireUser()` rejette tout
 * jeton absent de la base, un cookie factice ne suffit plus. On crée donc un
 * utilisateur et une session **en base** comme le ferait une connexion
 * (`sessions.id` = SHA-256 du jeton brut, cf. `src/lib/auth/session.ts`).
 */

const DB_PATH = path.join(process.cwd(), 'data', 'e2e.db');

export type E2ESession = { token: string; userId: string; email: string };

/**
 * Remet les compteurs de rate limiting à zéro (les specs partagent
 * `data/e2e.db` et la même IP) : chaque scénario repart d'un état connu.
 */
export function clearRateLimits(): void {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Base E2E introuvable : ${DB_PATH}`);
  }
  const db = new Database(DB_PATH);
  try {
    db.prepare('DELETE FROM rate_limit_hits').run();
  } finally {
    db.close();
  }
}

/** Crée un compte actif + sa session, renvoie le jeton brut (à mettre en cookie). */
export function createE2ESession(role: 'user' | 'admin'): E2ESession {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Base E2E introuvable : ${DB_PATH}`);
  }
  const db = new Database(DB_PATH);
  try {
    const suffix = `${Date.now()}-${randomBytes(4).toString('hex')}`;
    const userId = `e2e-${role}-${suffix}`;
    const email = `${userId}@example.com`;
    const token = randomBytes(32).toString('base64url');
    db.prepare(
      `INSERT INTO users (id, email, password_hash, role, status) VALUES (?, ?, 'hash-factice-e2e', ?, 'active')`,
    ).run(userId, email, role);
    db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
      createHash('sha256').update(token).digest('hex'),
      userId,
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );
    return { token, userId, email };
  } finally {
    db.close();
  }
}
