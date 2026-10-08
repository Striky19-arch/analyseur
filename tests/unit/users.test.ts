import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { normalizeEmail } from '@/lib/auth/email';
import { verifyPassword } from '@/lib/auth/hash';
import { ensureAdminUser } from '@/lib/auth/seed-admin';

describe('email normalisé (CDC §5.2)', () => {
  it('passe en minuscules et rogne les espaces', () => {
    expect(normalizeEmail('  Admin@Example.COM ')).toBe('admin@example.com');
  });

  it('la contrainte DB refuse un email non normalisé', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-users-test-'));
    const db = createDatabase(path.join(dir, 'check.db'));
    try {
      runMigrations(db);
      expect(() =>
        db
          .prepare(
            "INSERT INTO users (id, email, password_hash) VALUES ('u1', 'Admin@example.com', 'hash')",
          )
          .run(),
      ).toThrow(/users_email_lower/i);
    } finally {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('seed du premier admin (J1-02, CDC §6.1)', () => {
  let dir: string;
  let db: ReturnType<typeof createDatabase>;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-seed-test-'));
    db = createDatabase(path.join(dir, 'seed.db'));
    runMigrations(db);
  });

  afterAll(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('crée un admin actif avec email normalisé et mot de passe argon2id', async () => {
    const result = await ensureAdminUser(db, {
      email: 'Admin@Example.com',
      password: 'mot-de-passe-admin-2026',
    });
    expect(result.status).toBe('created');
    const row = db
      .prepare('SELECT email, role, status, password_hash FROM users WHERE id = ?')
      .get(result.userId) as { email: string; role: string; status: string; password_hash: string };
    expect(row.email).toBe('admin@example.com');
    expect(row.role).toBe('admin');
    expect(row.status).toBe('active');
    await expect(verifyPassword(row.password_hash, 'mot-de-passe-admin-2026')).resolves.toBe(true);
  });

  it('est rejouable : ignore proprement l’admin existant sans toucher au mot de passe', async () => {
    const first = await ensureAdminUser(db, {
      email: 'admin@example.com',
      password: 'autre-mot-de passe-2026',
    });
    expect(first.status).toBe('already_admin');
    const row = db
      .prepare('SELECT password_hash FROM users WHERE email = ?')
      .get('admin@example.com') as { password_hash: string };
    await expect(verifyPassword(row.password_hash, 'mot-de-passe-admin-2026')).resolves.toBe(true);
    await expect(verifyPassword(row.password_hash, 'autre-mot-de passe-2026')).resolves.toBe(false);
  });

  it('refuse explicitement un compte existant non-admin', async () => {
    db.prepare(
      "INSERT INTO users (id, email, password_hash, role, status) VALUES ('u2', 'user@example.com', 'hash', 'user', 'active')",
    ).run();
    const result = await ensureAdminUser(db, {
      email: 'user@example.com',
      password: 'mot-de-passe-admin-2026',
    });
    expect(result.status).toBe('conflict');
    const row = db.prepare('SELECT role FROM users WHERE id = ?').get('u2') as { role: string };
    expect(row.role).toBe('user'); // non promu silencieusement
  });

  it('valide l’email et la politique de mot de passe', async () => {
    await expect(
      ensureAdminUser(db, { email: 'pas-un-email', password: 'mot-de-passe-2026' }),
    ).rejects.toThrow(/invalide/i);
    await expect(
      ensureAdminUser(db, { email: 'new@example.com', password: 'court' }),
    ).rejects.toThrow(/12 caractères/i);
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 2 });
  });
});
