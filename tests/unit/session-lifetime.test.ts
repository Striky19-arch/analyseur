import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { insertUser } from '@/db/queries/users';
import {
  SESSION_COOKIE_OPTIONS,
  SESSION_MAX_TTL_MS,
  SESSION_TTL_MS,
  createSession,
  verifySessionToken,
} from '@/lib/auth/session';

/**
 * Durée de session « 7 j glissants / 30 j max » (CDC §14.1, J1-05) et flags
 * du cookie de session (DoD : « aucun cookie non sécurisé émis » — la preuve
 * sur cookie réel est en E2E, ici les options émises par le serveur).
 */
const DAY = 24 * 60 * 60 * 1000;

describe('glissement de session 7 j / 30 j max (J1-05)', () => {
  let dir: string;
  let db: ReturnType<typeof createDatabase>;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-ttl-test-'));
    db = createDatabase(path.join(dir, 'ttl.db'));
    runMigrations(db);
    insertUser(
      { id: 'u1', email: 'u1@example.com', passwordHash: 'hash', role: 'user', status: 'active' },
      db,
    );
  });

  afterAll(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function setLifetime(sessionId: string, createdAt: number, expiresAt: number): void {
    db.prepare('UPDATE sessions SET created_at = ?, expires_at = ? WHERE id = ?').run(
      createdAt,
      expiresAt,
      sessionId,
    );
  }

  it('session fraîche : aucune réécriture (renouvellement au plus une fois par jour)', () => {
    const { token, session } = createSession('u1', {}, db);
    const checked = verifySessionToken(token, db);
    expect(checked?.expiresAt).toBe(session.expiresAt);
  });

  it('session entamée : glissement à « maintenant + 7 j »', () => {
    const now = Date.now();
    const { token, session } = createSession('u1', {}, db);
    setLifetime(session.id, now - 4 * DAY, now + 2 * DAY);

    const checked = verifySessionToken(token, db);
    const expected = now + SESSION_TTL_MS;
    expect(checked?.expiresAt).toBeGreaterThanOrEqual(expected - 5_000);
    expect(checked?.expiresAt).toBeLessThanOrEqual(expected + 5_000);

    const row = db.prepare('SELECT expires_at FROM sessions WHERE id = ?').get(session.id) as {
      expires_at: number;
    };
    expect(row.expires_at).toBe(checked?.expiresAt);
  });

  it('plafond absolu : jamais au-delà de created_at + 30 j', () => {
    const now = Date.now();
    const createdAt = now - 25 * DAY;
    const { token, session } = createSession('u1', {}, db);
    setLifetime(session.id, createdAt, now + DAY);

    const checked = verifySessionToken(token, db);
    expect(checked?.expiresAt).toBe(createdAt + SESSION_MAX_TTL_MS);
  });

  it('session expirée : refusée et purgée', () => {
    const now = Date.now();
    const { token, session } = createSession('u1', {}, db);
    setLifetime(session.id, now - 31 * DAY, now - 1000);

    expect(verifySessionToken(token, db)).toBeNull();
    const rows = db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?').get(session.id) as {
      n: number;
    };
    expect(rows.n).toBe(0);
  });

  it('plafonds : TTL d’inactivité 7 j, plafond absolu 30 j', () => {
    expect(SESSION_TTL_MS).toBe(7 * DAY);
    expect(SESSION_MAX_TTL_MS).toBe(30 * DAY);
  });
});

describe('flags du cookie de session (J1-05, CDC §14.1)', () => {
  it('HttpOnly, SameSite=Lax, Secure en production, chemin /', () => {
    expect(SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(SESSION_COOKIE_OPTIONS.sameSite).toBe('lax');
    expect(SESSION_COOKIE_OPTIONS.path).toBe('/');
    expect(SESSION_COOKIE_OPTIONS.secure).toBe(process.env.NODE_ENV === 'production');
  });
});
