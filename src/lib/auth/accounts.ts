import type { Database } from 'better-sqlite3';
import { z } from 'zod';

import { getDb } from '@/db/client';
import { newId } from '@/db/ids';
import { parseSettingValue, registrationModeSchema, type RegistrationMode } from '@/db/schema';
import { getSettingValue } from '@/db/queries/app-settings';
import { setLastLoginAt, findUserByEmail, insertUser } from '@/db/queries/users';
import { auditEvent } from '@/lib/logging/audit';
import { authScopes, checkAuthRateLimits, resetAccountRateLimit } from '@/lib/security/rate-limit';

import { isValidEmail, normalizeEmail } from './email';
import { checkPasswordPolicy, hashPassword, verifyPassword } from './hash';
import { rotateSessionAtLogin, type SessionMeta } from './session';

/** Mode d'inscription par défaut — décision D1 : `approval` (compte `pending`). */
export const DEFAULT_REGISTRATION_MODE: RegistrationMode = 'approval';

/** Nom affiché : facultatif, borné (validation Zod du formulaire d'inscription). */
const nameSchema = z.string().trim().max(100);

/**
 * Hash factice : vérifié quand l'utilisateur est introuvable, pour égaliser le
 * temps de réponse et empêcher l'énumération de comptes par timing.
 */
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$GCPtCQzgXhvOEcB7vsEXhg$ZUnPW0lPJ2AX16sKxox3PWTaNw5bGnok9TAA2NFMVvs';

/** Lit `registration_mode` dans `app_settings` (défaut : `approval`, D1). */
export function getRegistrationMode(db: Database = getDb()): RegistrationMode {
  const value = getSettingValue('registration_mode', db);
  if (value === null) {
    return DEFAULT_REGISTRATION_MODE;
  }
  return parseSettingValue(value, registrationModeSchema);
}

export type RegisterInput = { name?: string; email: string; password: string };

export type RegisterResult =
  | {
      status: 'invalid';
      code: 'invalid_email' | 'password_too_short' | 'password_too_long' | 'name_too_long';
      field: 'email' | 'password' | 'name';
    }
  | { status: 'closed' }
  | { status: 'email_taken' }
  | { status: 'rate_limited'; retryAfterSeconds: number }
  | { status: 'created'; userId: string; accountStatus: 'active' | 'pending' };

/**
 * Inscription (CDC §6.1, J1-03) selon `registration_mode` :
 * - `open` → compte `active` immédiatement ;
 * - `approval` → compte `pending` (activation par l'admin, J2-03) ;
 * - `closed` → refus.
 */
export async function registerUser(
  input: RegisterInput,
  meta: SessionMeta = {},
  db: Database = getDb(),
): Promise<RegisterResult> {
  // Rate limiting (J1-05, §14.1) : par IP et par compte, avant tout travail
  // coûteux (argon2) — la 10ᵉ tentative d'une fenêtre de 60 s est refusée.
  const scopes = authScopes('register', normalizeEmail(input.email), meta.ip);
  const decision = checkAuthRateLimits(scopes, undefined, { db });
  if (!decision.allowed) {
    return { status: 'rate_limited', retryAfterSeconds: decision.retryAfterSeconds };
  }

  const mode = getRegistrationMode(db);
  if (mode === 'closed') {
    return { status: 'closed' };
  }

  const name = input.name?.trim() || undefined;
  if (name !== undefined && !nameSchema.safeParse(name).success) {
    return { status: 'invalid', code: 'name_too_long', field: 'name' };
  }
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { status: 'invalid', code: 'invalid_email', field: 'email' };
  }
  const policy = checkPasswordPolicy(input.password);
  if (!policy.ok) {
    return {
      status: 'invalid',
      code: policy.reason === 'too_short' ? 'password_too_short' : 'password_too_long',
      field: 'password',
    };
  }

  if (findUserByEmail(email, db)) {
    return { status: 'email_taken' };
  }

  const accountStatus = mode === 'open' ? 'active' : 'pending';
  const userId = newId();
  insertUser(
    {
      id: userId,
      email,
      name: name ?? null,
      passwordHash: await hashPassword(input.password),
      role: 'user',
      status: accountStatus,
    },
    db,
  );
  return { status: 'created', userId, accountStatus };
}

export type LoginInput = { email: string; password: string; previousToken?: string | null };

export type LoginResult =
  | { status: 'invalid_credentials' }
  | { status: 'rate_limited'; retryAfterSeconds: number }
  | { status: 'ok'; userId: string; token: string };

/**
 * Connexion (CDC §6.1) : vérifie le mot de passe **et** l'état du compte.
 * Refus **neutre** (même message et même temps de réponse) pour mauvais
 * identifiants **et** pour un compte dont `status != 'active'` (`pending`,
 * `revoked`) — un compte `pending` ne peut pas se connecter (DoD J1-03).
 */
export async function loginUser(
  input: LoginInput,
  meta: SessionMeta = {},
  db: Database = getDb(),
): Promise<LoginResult> {
  const email = normalizeEmail(input.email);

  // Rate limiting (J1-05, §14.1) : par IP et par compte, avant la vérification
  // argon2 — la 10ᵉ tentative d'une fenêtre de 60 s est refusée.
  const scopes = authScopes('login', email, meta.ip);
  const decision = checkAuthRateLimits(scopes, undefined, { db });
  if (!decision.allowed) {
    return { status: 'rate_limited', retryAfterSeconds: decision.retryAfterSeconds };
  }

  const user = findUserByEmail(email, db);

  const passwordOk = await verifyPassword(
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    input.password,
  );
  if (!user || !passwordOk || user.status !== 'active') {
    // Audit minimal (J1-05) : minimisation — l'e-mail n'est journalisé que sur
    // échec (investigation du spray/dictionnaire), jamais le mot de passe.
    auditEvent('user.login_failed', { ip: meta.ip ?? null, metadata: { email } });
    return { status: 'invalid_credentials' };
  }

  // Rotation à la connexion (J1-01) : l'ancien jeton meurt, un nouveau est émis.
  const { token } = rotateSessionAtLogin(user.id, meta, input.previousToken, db);
  setLastLoginAt(user.id, Date.now(), db);
  // Réussite : les erreurs du compte ne s'accumulent pas ; l'audit suit (J1-05).
  resetAccountRateLimit(scopes, db);
  auditEvent('user.login', { actorId: user.id, ip: meta.ip ?? null });
  return { status: 'ok', userId: user.id, token };
}
