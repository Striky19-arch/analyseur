import type { Database } from 'better-sqlite3';

import { newId } from '@/db/ids';
import { findUserByEmail, insertUser } from '@/db/queries/users';

import { isValidEmail, normalizeEmail } from './email';
import { checkPasswordPolicy, hashPassword } from './hash';

export type SeedAdminInput = { email: string; password: string };

export type SeedAdminResult =
  | { status: 'created'; userId: string; email: string }
  | { status: 'already_admin'; userId: string; email: string }
  | { status: 'conflict'; userId: string; email: string };

/**
 * Crée le premier administrateur (CDC §6.1, `npm run seed:admin`) — J1-02.
 *
 * **Idempotent** (DoD) : rejouable sans erreur. Un compte existant avec ce
 * courriel n'est jamais modifié (le mot de passe n'est pas réinitialisé) :
 * s'il est déjà admin, on l'ignore proprement ; s'il a un autre rôle, le seed
 * est refusé explicitement (promotion à faire depuis `/admin/users`, J2-03).
 */
export async function ensureAdminUser(
  db: Database,
  { email, password }: SeedAdminInput,
): Promise<SeedAdminResult> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error(`Adresse e-mail invalide : ${email}`);
  }
  const policy = checkPasswordPolicy(password);
  if (!policy.ok) {
    throw new Error(
      policy.reason === 'too_short'
        ? 'Mot de passe trop court (12 caractères minimum, CDC §14.1).'
        : 'Mot de passe trop long (128 caractères maximum).',
    );
  }

  const existing = findUserByEmail(normalized, db);
  if (existing) {
    return {
      status: existing.role === 'admin' ? 'already_admin' : 'conflict',
      userId: existing.id,
      email: normalized,
    };
  }

  const userId = newId();
  insertUser(
    {
      id: userId,
      email: normalized,
      passwordHash: await hashPassword(password),
      role: 'admin',
      status: 'active',
    },
    db,
  );
  return { status: 'created', userId, email: normalized };
}
