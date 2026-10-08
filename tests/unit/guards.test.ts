import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Intégration (DoD J1-04, CDC §6.2) : la garde recharge la session **et** le
 * statut utilisateur à chaque requête. Un statut changé en base (`revoked`,
 * `pending`) est refusé à l'appel suivant et la session est purgée.
 */

const hoisted = vi.hoisted(() => ({
  /** Cookies de la « requête » simulée (mock de `next/headers`). */
  requestCookies: new Map<string, string>(),
}));

vi.mock('next/server', () => ({
  // `connection()` hors contexte Next lèverait : la garde est testée en direct.
  connection: async () => undefined,
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      hoisted.requestCookies.has(name)
        ? { name, value: hoisted.requestCookies.get(name) as string }
        : undefined,
    has: (name: string) => hoisted.requestCookies.has(name),
    set: () => undefined,
    delete: () => undefined,
  }),
}));

vi.mock('@/lib/i18n/redirect', () => ({
  currentLocale: async () => 'fr',
  redirectTo: (href: string): never => {
    throw new Error(`REDIRECT:${href}`);
  },
}));

import { getDb } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { insertUser } from '@/db/queries/users';
import { requireAdmin, requireUser } from '@/lib/auth/guards';
import {
  createSession,
  deleteSessionByToken,
  loadSessionUser,
  verifySessionToken,
  type SessionUser,
} from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/security/session-cookie';

const PASSWORD_HASH = 'argon2id-factice-pour-tests';

function makeUser(
  db: ReturnType<typeof getDb>,
  id: string,
  role: 'user' | 'admin',
  status: 'active' | 'revoked' | 'pending' = 'active',
): string {
  insertUser({ id, email: `${id}@example.com`, passwordHash: PASSWORD_HASH, role, status }, db);
  return `${id}@example.com`;
}

function setRequestToken(token: string | null): void {
  hoisted.requestCookies.clear();
  if (token) {
    hoisted.requestCookies.set(SESSION_COOKIE_NAME, token);
  }
}

describe('garde requireUser / requireAdmin (J1-04, CDC §6.2)', () => {
  let dir: string;
  let db: ReturnType<typeof getDb>;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-guards-test-'));
    process.env.DATABASE_PATH = path.join(dir, 'guards.db');
    db = getDb();
    runMigrations(db);
  });

  afterAll(() => {
    db.close();
    delete process.env.DATABASE_PATH;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    setRequestToken(null);
  });

  it('utilisateur actif avec session : accès accordé', async () => {
    makeUser(db, 'u-actif', 'user');
    const { token } = createSession('u-actif', {}, db);
    setRequestToken(token);

    await expect(requireUser()).resolves.toMatchObject({
      id: 'u-actif',
      role: 'user',
      status: 'active',
    } satisfies Partial<SessionUser>);
  });

  it('révocation immédiate : statut changé en base → refus à l’appel suivant, session purgée', async () => {
    makeUser(db, 'u-revoke', 'user');
    const { token } = createSession('u-revoke', {}, db);
    setRequestToken(token);

    // Accès OK tant que le compte est actif.
    await expect(requireUser()).resolves.toMatchObject({ id: 'u-revoke' });

    // Révocation « en base » (J2-04 fera la transaction complète) : sans
    // redémarrage, sans reconnexion, la requête suivante est refusée.
    db.prepare("UPDATE users SET status = 'revoked' WHERE id = 'u-revoke'").run();
    await expect(requireUser()).rejects.toThrow('REDIRECT:/login?reason=revoked');

    // La session ne survit pas : la ligne est purgée.
    expect(verifySessionToken(token, db)).toBeNull();
  });

  it('compte pending : refusé (redirect /login) et session purgée', async () => {
    makeUser(db, 'u-pending', 'user', 'pending');
    const { token } = createSession('u-pending', {}, db);
    setRequestToken(token);

    await expect(requireUser()).rejects.toThrow('REDIRECT:/login');
    expect(verifySessionToken(token, db)).toBeNull();
  });

  it('absence de cookie ou jeton inconnu : refusé (redirect /login)', async () => {
    await expect(requireUser()).rejects.toThrow('REDIRECT:/login');
    setRequestToken('jeton-inconnu');
    await expect(requireUser()).rejects.toThrow('REDIRECT:/login');
  });

  it('requireAdmin : un utilisateur non-admin est refusé (redirect /)', async () => {
    makeUser(db, 'u-simple', 'user');
    const { token } = createSession('u-simple', {}, db);
    setRequestToken(token);

    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/');
  });

  it('requireAdmin : un admin actif est admis', async () => {
    makeUser(db, 'u-admin', 'admin');
    const { token } = createSession('u-admin', {}, db);
    setRequestToken(token);

    await expect(requireAdmin()).resolves.toMatchObject({ id: 'u-admin', role: 'admin' });
  });

  it('loadSessionUser : cœur de la garde — résultat discriminé par raison', () => {
    makeUser(db, 'u-coeur', 'user');
    const { token } = createSession('u-coeur', {}, db);

    expect(loadSessionUser(token, db)).toMatchObject({ ok: true });
    expect(loadSessionUser('jeton-inconnu', db)).toEqual({ ok: false, reason: 'invalid' });

    db.prepare("UPDATE users SET status = 'revoked' WHERE id = 'u-coeur'").run();
    expect(loadSessionUser(token, db)).toEqual({
      ok: false,
      reason: 'not_active',
      status: 'revoked',
    });
    // Deuxième appel : la session a été purgée au premier refus.
    expect(loadSessionUser(token, db)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('jeton jamais stocké en clair : la base ne connaît que le hash', () => {
    makeUser(db, 'u-hash', 'user');
    const { token } = createSession('u-hash', {}, db);
    const rows = db.prepare('SELECT id FROM sessions WHERE user_id = ?').all('u-hash') as {
      id: string;
    }[];
    expect(rows.some((row) => row.id === token)).toBe(false);
    deleteSessionByToken(token, db);
  });
});
