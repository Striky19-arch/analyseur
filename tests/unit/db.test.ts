import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '@/db/client';
import { newId } from '@/db/ids';
import { runMigrations } from '@/db/migrate';
import { parseUserPreferences } from '@/db/schema';

describe('client SQLite (CDC §5.3)', () => {
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-db-test-'));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('applique les PRAGMA du CDC §5.3 à chaque connexion', () => {
    const db = createDatabase(path.join(dir, 'pragma.db'));
    try {
      expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
      expect(Number(db.pragma('foreign_keys', { simple: true }))).toBe(1);
      expect(Number(db.pragma('busy_timeout', { simple: true }))).toBe(5000);
      expect(Number(db.pragma('synchronous', { simple: true }))).toBe(1); // NORMAL
    } finally {
      db.close();
    }
  });

  it('crée le schéma initial depuis zéro par les migrations', () => {
    const db = createDatabase(path.join(dir, 'fresh.db'));
    try {
      runMigrations(db);
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all()
        .map((row) => (row as { name: string }).name);
      expect(tables).toContain('users');
      expect(tables).toContain('sessions');
      expect(tables).toContain('app_settings');
    } finally {
      db.close();
    }
  });

  it('impose les contraintes référentielles sur sessions (FK ON DELETE CASCADE)', () => {
    const db = createDatabase(path.join(dir, 'fk.db'));
    try {
      runMigrations(db);
      const insertUser = db.prepare(
        "INSERT INTO users (id, email, password_hash) VALUES (?, ?, 'hash')",
      );
      const insertSession = db.prepare(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      );
      insertUser.run('u1', 'a@example.com');
      insertSession.run('s1', 'u1', Date.now() + 1000);
      expect(() => insertSession.run('s2', 'inconnu', Date.now())).toThrow(/FOREIGN KEY/i);
      db.prepare('DELETE FROM users WHERE id = ?').run('u1');
      expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 0 });
    } finally {
      db.close();
    }
  });

  it('génère des identifiants TEXT en UUID v7 triables', () => {
    const a = newId();
    const b = newId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a < b).toBe(true);
  });

  it('valide le JSON des préférences par Zod à la lecture', () => {
    expect(parseUserPreferences(null)).toEqual({});
    expect(parseUserPreferences('{"defaultQuestionCount":20}')).toEqual({
      defaultQuestionCount: 20,
    });
    expect(() => parseUserPreferences('{"defaultQuestionCount":3}')).toThrow(); // hors bornes
  });
});
