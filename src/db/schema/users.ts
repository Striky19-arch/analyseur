import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { z } from 'zod';

import { createdAtCol, updatedAtCol } from './_shared';

/**
 * Utilisateurs (CDC §5.2).
 * L'email est normalisé en minuscules par le DAL à l'écriture (étape J1-04).
 * Conventions : ID TEXT (UUID v7), timestamps INTEGER (epoch ms), JSON TEXT validé par Zod.
 */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name'),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['user', 'admin'] })
      .notNull()
      .default('user'),
    status: text('status', { enum: ['active', 'revoked', 'pending'] })
      .notNull()
      .default('pending'),
    revokedAt: integer('revoked_at'),
    revokedBy: text('revoked_by').references((): AnySQLiteColumn => users.id, {
      onDelete: 'set null',
    }),
    revokedReason: text('revoked_reason'),
    locale: text('locale').notNull().default('fr'),
    theme: text('theme', { enum: ['light', 'dark', 'system'] })
      .notNull()
      .default('system'),
    /** JSON, validé par `userPreferencesSchema` à la lecture. */
    preferences: text('preferences'),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
    lastLoginAt: integer('last_login_at'),
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.email),
    index('users_status_idx').on(table.status),
    // Contrainte J1-02 (CDC §5.2 : email « normalisé en minuscules ») — la
    // normalisation est aussi appliquée par les écrivains (`normalizeEmail`).
    check('users_email_lower', sql`email = lower(email)`),
  ],
);

/** Préférences de génération et d'affichage de l'utilisateur (CDC §11.4). */
export const userPreferencesSchema = z.object({
  generationLanguage: z.string().min(2).max(5).optional(),
  defaultDifficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
  defaultQuestionCount: z.number().int().min(5).max(50).optional(),
  defaultFlashcardCount: z.number().int().min(5).max(50).optional(),
  defaultQuizMode: z.enum(['learning', 'exam']).optional(),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export function parseUserPreferences(raw: string | null): UserPreferences {
  if (raw === null || raw === '') return {};
  return userPreferencesSchema.parse(JSON.parse(raw));
}
