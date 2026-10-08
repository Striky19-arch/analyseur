import { z } from 'zod';

/**
 * Email normalisé : minuscules et espaces rognés (CDC §5.2 : « normalisé en
 * minuscules »). À appliquer à **chaque écriture** — la contrainte DB
 * `users_email_lower` refuse les valeurs non normalisées.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Validation d'email (formulaires et scripts — Zod, comme au CDC §12). */
export const emailSchema = z.email();

export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}
