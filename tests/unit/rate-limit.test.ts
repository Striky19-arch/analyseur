import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { insertUser } from '@/db/queries/users';
import { countRateLimitHits } from '@/db/queries/rate-limits';
import { loginUser, registerUser } from '@/lib/auth/accounts';
import { ApiError, toErrorResponse } from '@/lib/api/errors';
import { hashPassword } from '@/lib/auth/hash';
import {
  AUTH_RATE_LIMIT,
  authScopes,
  checkAuthRateLimits,
  consumeRateLimit,
} from '@/lib/security/rate-limit';

/**
 * Rate limiting (DoD J1-05) : « 10 tentatives de connexion en 1 min →
 * 429 RATE_LIMITED ». La 10ᵉ tentative d'une fenêtre de 60 s est refusée,
 * par IP **et** par compte (CDC §14.1).
 */
const PASSWORD = 'mot-de-passe-rate-2026';

describe('fenêtre glissante consumeRateLimit (J1-05)', () => {
  let dir: string;
  let db: ReturnType<typeof createDatabase>;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-rate-test-'));
    db = createDatabase(path.join(dir, 'rate.db'));
    runMigrations(db);
  });

  afterAll(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('la 10ᵉ tentative de la fenêtre est refusée, avec Retry-After', () => {
    const now = 1_800_000_000_000;
    for (let i = 1; i <= 9; i += 1) {
      expect(consumeRateLimit('t1:ip:1', AUTH_RATE_LIMIT, { now, db })).toEqual({ allowed: true });
    }
    const tenth = consumeRateLimit('t1:ip:1', AUTH_RATE_LIMIT, { now, db });
    expect(tenth).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('fenêtre glissante : après 60 s de calme, le compteur est retombé', () => {
    const now = 1_800_000_000_000;
    for (let i = 1; i <= 10; i += 1) {
      consumeRateLimit('t2:ip:1', AUTH_RATE_LIMIT, { now, db });
    }
    expect(consumeRateLimit('t2:ip:1', AUTH_RATE_LIMIT, { now, db })).toMatchObject({
      allowed: false,
    });
    // 61 s plus tard : les anciennes tentatives sont hors fenêtre (et purgées).
    expect(consumeRateLimit('t2:ip:1', AUTH_RATE_LIMIT, { now: now + 61_000, db })).toEqual({
      allowed: true,
    });
  });

  it('les périmètres sont indépendants', () => {
    const now = 1_800_000_000_000;
    expect(consumeRateLimit('t3:ip:1', AUTH_RATE_LIMIT, { now, db })).toEqual({ allowed: true });
    expect(consumeRateLimit('t3:ip:2', AUTH_RATE_LIMIT, { now, db })).toEqual({ allowed: true });
    expect(consumeRateLimit('t3:account:a@example.com', AUTH_RATE_LIMIT, { now, db })).toEqual({
      allowed: true,
    });
  });

  it("périmètres d'auth : IP (si connue) et compte", () => {
    expect(authScopes('login', 'a@example.com', '203.0.113.7')).toEqual({
      ipKey: 'login:ip:203.0.113.7',
      accountKey: 'login:account:a@example.com',
    });
    expect(authScopes('register', 'a@example.com', null).ipKey).toBeNull();
  });
});

describe('DoD J1-05 : 10 tentatives de connexion en 1 min → rate limited', () => {
  let dir: string;
  let db: ReturnType<typeof createDatabase>;

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-rate-login-'));
    db = createDatabase(path.join(dir, 'rate-login.db'));
    runMigrations(db);
    insertUser(
      {
        id: 'u-ok',
        email: 'ok@example.com',
        passwordHash: await hashPassword(PASSWORD),
        role: 'user',
        status: 'active',
      },
      db,
    );
  });

  afterAll(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('la 10ᵉ connexion de la minute est refusée (par IP et par compte)', async () => {
    for (let i = 1; i <= 9; i += 1) {
      const result = await loginUser(
        { email: 'cible@example.com', password: 'faux-mot-de-passe-aaaa' },
        { ip: '198.51.100.9' },
        db,
      );
      expect(result).toEqual({ status: 'invalid_credentials' });
    }
    const tenth = await loginUser(
      { email: 'cible@example.com', password: 'faux-mot-de-passe-aaaa' },
      { ip: '198.51.100.9' },
      db,
    );
    expect(tenth).toMatchObject({ status: 'rate_limited' });
    if (tenth.status === 'rate_limited') {
      expect(tenth.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(tenth.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it('le blocage par IP est partagé entre comptes', async () => {
    for (let i = 1; i <= 9; i += 1) {
      const result = await loginUser(
        { email: `autre${i}@example.com`, password: 'faux-mot-de-passe-aaaa' },
        { ip: '198.51.100.10' },
        db,
      );
      expect(result).toEqual({ status: 'invalid_credentials' });
    }
    const tenth = await loginUser(
      { email: 'encore@example.com', password: 'faux-mot-de-passe-aaaa' },
      { ip: '198.51.100.10' },
      db,
    );
    expect(tenth).toMatchObject({ status: 'rate_limited' });
  });

  it('le blocage par compte suit le compte, quel que soit le client', async () => {
    for (let i = 1; i <= 9; i += 1) {
      const result = await loginUser(
        { email: 'suivi@example.com', password: 'faux-mot-de-passe-aaaa' },
        { ip: `192.0.2.${i}` },
        db,
      );
      expect(result).toEqual({ status: 'invalid_credentials' });
    }
    const tenth = await loginUser(
      { email: 'suivi@example.com', password: 'faux-mot-de-passe-aaaa' },
      { ip: '192.0.2.200' },
      db,
    );
    expect(tenth).toMatchObject({ status: 'rate_limited' });
  });

  it('une connexion réussie efface le compteur du compte (pas celui de l’IP)', async () => {
    const target = 'ok@example.com';
    for (let i = 1; i <= 4; i += 1) {
      await loginUser(
        { email: target, password: 'faux-mot-de-passe-aaaa' },
        { ip: '203.0.113.50' },
        db,
      );
    }
    expect(countRateLimitHits(`login:account:${target}`, 0, db)).toBe(4);

    const ok = await loginUser({ email: target, password: PASSWORD }, { ip: '203.0.113.50' }, db);
    expect(ok.status).toBe('ok');
    expect(countRateLimitHits(`login:account:${target}`, 0, db)).toBe(0);
    expect(countRateLimitHits('login:ip:203.0.113.50', 0, db)).toBe(5);

    // Le compteur du compte repart de zéro : 9 nouvelles erreurs passent.
    for (let i = 1; i <= 9; i += 1) {
      const result = await loginUser(
        { email: target, password: 'faux-mot-de-passe-aaaa' },
        { ip: `203.0.113.6${i}` },
        db,
      );
      expect(result).toEqual({ status: 'invalid_credentials' });
    }
    const tenth = await loginUser(
      { email: target, password: 'faux-mot-de-passe-aaaa' },
      { ip: '203.0.113.200' },
      db,
    );
    expect(tenth).toMatchObject({ status: 'rate_limited' });
  });

  it("l'inscription est limitée elle aussi (par IP et par compte)", async () => {
    for (let i = 1; i <= 9; i += 1) {
      const result = await registerUser(
        { email: 'nouveau@example.com', password: 'court' },
        { ip: '203.0.113.99' },
        db,
      );
      expect(result).toEqual({ status: 'invalid', code: 'password_too_short', field: 'password' });
    }
    const tenth = await registerUser(
      { email: 'nouveau@example.com', password: 'court' },
      { ip: '203.0.113.99' },
      db,
    );
    expect(tenth).toMatchObject({ status: 'rate_limited' });
  });

  it('contrat §12 : le code RATE_LIMITED sort en 429 normalisé', () => {
    const { status, body } = toErrorResponse(new ApiError('RATE_LIMITED'));
    expect(status).toBe(429);
    expect(body).toEqual({ error: { code: 'RATE_LIMITED', message: 'Trop de requêtes.' } });
  });

  it('checkAuthRateLimits refuse dès qu’un des deux périmètres déclenche', () => {
    const now = 1_800_000_000_000;
    const scopes = authScopes('login', 'borne@example.com', '203.0.113.77');
    for (let i = 1; i <= 9; i += 1) {
      expect(checkAuthRateLimits(scopes, AUTH_RATE_LIMIT, { now, db })).toEqual({ allowed: true });
    }
    expect(checkAuthRateLimits(scopes, AUTH_RATE_LIMIT, { now, db })).toMatchObject({
      allowed: false,
    });
  });
});
