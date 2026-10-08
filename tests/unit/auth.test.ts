import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { checkPasswordPolicy, hashPassword, verifyPassword } from '@/lib/auth/hash';
import {
  SESSION_COOKIE_OPTIONS,
  SESSION_TTL_MS,
  createSession,
  deleteSessionByToken,
  deleteUserSessions,
  rotateSessionAtLogin,
  verifySessionToken,
} from '@/lib/auth/session';

describe('hachage de mots de passe (CDC §14.1)', () => {
  it('hache en argon2id et vérifie le mot de passe', async () => {
    const hashed = await hashPassword('correct horse battery staple');
    expect(hashed.startsWith('$argon2id$')).toBe(true);
    await expect(verifyPassword(hashed, 'correct horse battery staple')).resolves.toBe(true);
    await expect(verifyPassword(hashed, 'mauvais mot de passe')).resolves.toBe(false);
  });

  it('renvoie false sur un hash malformé, sans lever d’exception', async () => {
    await expect(verifyPassword('pas-un-hash', 'x')).resolves.toBe(false);
  });

  it('applique la politique : ≥ 12 caractères, borne haute 128', () => {
    expect(checkPasswordPolicy('a'.repeat(11))).toEqual({ ok: false, reason: 'too_short' });
    expect(checkPasswordPolicy('a'.repeat(12))).toEqual({ ok: true });
    expect(checkPasswordPolicy('a'.repeat(129))).toEqual({ ok: false, reason: 'too_long' });
  });
});

describe('cookie de session (CDC §14.1)', () => {
  it('est HttpOnly, SameSite=Lax, Secure en production seulement', () => {
    expect(SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(SESSION_COOKIE_OPTIONS.sameSite).toBe('lax');
    expect(SESSION_COOKIE_OPTIONS.path).toBe('/');
    expect(SESSION_COOKIE_OPTIONS.secure).toBe(process.env.NODE_ENV === 'production');
  });
});

describe('sessions en base (CDC §5.2 / §6.2)', () => {
  let dir: string;
  let db: ReturnType<typeof createDatabase>;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-auth-test-'));
    db = createDatabase(path.join(dir, 'auth.db'));
    runMigrations(db);
    db.prepare(
      "INSERT INTO users (id, email, password_hash) VALUES ('u1', 'a@example.com', 'hash')",
    ).run();
  });

  afterAll(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('stocke uniquement l’ID haché du jeton (jamais le jeton brut)', () => {
    const { token, session } = createSession('u1', { ip: '127.0.0.1', userAgent: 'vitest' }, db);
    expect(session.expiresAt - session.createdAt).toBe(SESSION_TTL_MS);
    expect(token).not.toBe(session.id);
    expect(session.id).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
    const rows = db.prepare('SELECT * FROM sessions').all();
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it('vérifie les jetons en base uniquement (aucune session autonome)', () => {
    const { token } = createSession('u1', {}, db);
    expect(verifySessionToken(token, db)?.userId).toBe('u1');
    expect(verifySessionToken('jeton-inconnu', db)).toBeNull();
  });

  it('refuse une session expirée et la supprime', () => {
    const { token, session } = createSession('u1', {}, db);
    db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(
      Date.now() - 1000,
      session.id,
    );
    expect(verifySessionToken(token, db)).toBeNull();
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?').get(session.id)).toEqual({
      n: 0,
    });
  });

  it('rotation à la connexion : l’ancien jeton meurt, le nouveau vit, les autres appareils sont conservés', () => {
    const otherDevice = createSession('u1', {}, db);
    const previous = createSession('u1', {}, db);
    const rotated = rotateSessionAtLogin('u1', {}, previous.token, db);
    expect(verifySessionToken(previous.token, db)).toBeNull();
    expect(verifySessionToken(rotated.token, db)?.userId).toBe('u1');
    expect(verifySessionToken(otherDevice.token, db)?.userId).toBe('u1');
  });

  it('révoque toutes les sessions d’un utilisateur', () => {
    const a = createSession('u1', {}, db);
    const b = createSession('u1', {}, db);
    deleteUserSessions('u1', db);
    expect(verifySessionToken(a.token, db)).toBeNull();
    expect(verifySessionToken(b.token, db)).toBeNull();
  });

  it('supprime une session par son jeton (déconnexion)', () => {
    const { token } = createSession('u1', {}, db);
    deleteSessionByToken(token, db);
    expect(verifySessionToken(token, db)).toBeNull();
  });
});
