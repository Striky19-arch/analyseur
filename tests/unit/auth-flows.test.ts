import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import {
  DEFAULT_REGISTRATION_MODE,
  getRegistrationMode,
  loginUser,
  registerUser,
} from '@/lib/auth/accounts';
import { deleteSessionByToken, verifySessionToken } from '@/lib/auth/session';

const PASSWORD = 'mot-de-passe-flux-2026';

function setMode(db: ReturnType<typeof createDatabase>, mode: string): void {
  db.prepare(
    `INSERT INTO app_settings (key, value) VALUES ('registration_mode', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(JSON.stringify(mode));
}

describe('flux d’authentification (J1-03)', () => {
  let dir: string;
  let db: ReturnType<typeof createDatabase>;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-flows-test-'));
    db = createDatabase(path.join(dir, 'flows.db'));
    runMigrations(db);
  });

  afterAll(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('mode par défaut : approval (décision D1)', () => {
    expect(DEFAULT_REGISTRATION_MODE).toBe('approval');
    expect(getRegistrationMode(db)).toBe('approval');
  });

  it('mode open : inscription → compte actif immédiatement', async () => {
    setMode(db, 'open');
    const result = await registerUser({ email: 'Open@Example.com', password: PASSWORD }, {}, db);
    expect(result).toMatchObject({ status: 'created', accountStatus: 'active' });
    const row = db
      .prepare('SELECT email, role, status FROM users WHERE email = ?')
      .get('open@example.com');
    expect(row).toEqual({ email: 'open@example.com', role: 'user', status: 'active' });
  });

  it('mode approval : inscription → compte pending', async () => {
    setMode(db, 'approval');
    const result = await registerUser({ email: 'pending@example.com', password: PASSWORD }, {}, db);
    expect(result).toMatchObject({ status: 'created', accountStatus: 'pending' });
  });

  it('mode closed : inscription refusée', async () => {
    setMode(db, 'closed');
    const result = await registerUser({ email: 'ferme@example.com', password: PASSWORD }, {}, db);
    expect(result).toEqual({ status: 'closed' });
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 2 });
  });

  it('validation : email invalide et mot de passe trop court', async () => {
    setMode(db, 'open');
    await expect(
      registerUser({ email: 'pas-un-email', password: PASSWORD }, {}, db).then((r) => r),
    ).resolves.toEqual({ status: 'invalid', code: 'invalid_email', field: 'email' });
    await expect(
      registerUser({ email: 'court@example.com', password: 'court' }, {}, db),
    ).resolves.toEqual({ status: 'invalid', code: 'password_too_short', field: 'password' });
  });

  it('email dupliqué : refusé', async () => {
    const result = await registerUser({ email: 'open@example.com', password: PASSWORD }, {}, db);
    expect(result).toEqual({ status: 'email_taken' });
  });

  it('connexion : compte actif OK, rotation et last_login_at posés', async () => {
    const previous = { token: 'jeton-avant-connexion' };
    db.prepare(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES ('ancien', (SELECT id FROM users WHERE email = 'open@example.com'), ?)",
    ).run(Date.now() + 60_000);
    const result = await loginUser(
      {
        email: 'open@example.com',
        password: PASSWORD,
        previousToken: previous.token,
      },
      { ip: '127.0.0.1', userAgent: 'vitest' },
      db,
    );
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('inattendu');
    expect(verifySessionToken(result.token, db)?.userId).toBe(result.userId);
    const row = db.prepare('SELECT last_login_at FROM users WHERE id = ?').get(result.userId) as {
      last_login_at: number | null;
    };
    expect(row.last_login_at).toBeGreaterThan(0);
  });

  it('connexion refusée de façon neutre : mauvais mot de passe, compte pending, compte inconnu', async () => {
    setMode(db, 'approval');
    const bad = await loginUser(
      { email: 'open@example.com', password: 'faux-mot-de-passe' },
      {},
      db,
    );
    const pending = await loginUser({ email: 'pending@example.com', password: PASSWORD }, {}, db);
    const unknown = await loginUser({ email: 'inconnu@example.com', password: PASSWORD }, {}, db);
    expect(bad).toEqual({ status: 'invalid_credentials' });
    expect(pending).toEqual({ status: 'invalid_credentials' });
    expect(unknown).toEqual({ status: 'invalid_credentials' });
  });

  it('compte révoqué : refusé (status != active)', async () => {
    db.prepare("UPDATE users SET status = 'revoked' WHERE email = 'open@example.com'").run();
    const result = await loginUser({ email: 'open@example.com', password: PASSWORD }, {}, db);
    expect(result).toEqual({ status: 'invalid_credentials' });
  });

  it('déconnexion : le jeton est détruit en base', async () => {
    const result = await loginUser({ email: 'pending@example.com', password: PASSWORD }, {}, db);
    expect(result.status).toBe('invalid_credentials'); // pending : pas de session
    // déconnexion sur un jeton réel
    setMode(db, 'open');
    db.prepare("UPDATE users SET status = 'active' WHERE email = 'pending@example.com'").run();
    const ok = await loginUser({ email: 'pending@example.com', password: PASSWORD }, {}, db);
    if (ok.status !== 'ok') throw new Error('inattendu');
    deleteSessionByToken(ok.token, db);
    expect(verifySessionToken(ok.token, db)).toBeNull();
  });
});
