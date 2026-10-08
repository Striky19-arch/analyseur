import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';

/**
 * Hachage de mots de passe (CDC §14.1) : **argon2id** via `@node-rs/argon2`
 * (binaires napi précompilés, aucun script d'installation npm).
 *
 * Politique : ≥ **12** caractères (CDC §14.1 — le « ≥ 8 » du canevas J1-01 est
 * contredit par le CDC, qui fait foi), avec une borne haute pour limiter le
 * coût argon2 sur entrée hostile.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordPolicyResult = { ok: true } | { ok: false; reason: 'too_short' | 'too_long' };

/** Politique de mot de passe, validée par Zod (J1-03 : « validation Zod »). */
export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  const result = passwordSchema.safeParse(password);
  if (result.success) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: result.error.issues[0]?.code === 'too_big' ? 'too_long' : 'too_short',
  };
}

/** Hash argon2id (sel aléatoire embarqué dans la chaîne retournée). */
export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

/**
 * Vérifie un mot de passe contre son hash. Un hash malformé renvoie `false`
 * (jamais d'exception ni de détail exposé).
 */
export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
  try {
    return await verify(hashed, password);
  } catch {
    return false;
  }
}
