import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { z, type ZodType } from 'zod';

import { updatedAtCol } from './_shared';

/**
 * Paramètres globaux clé/valeur (CDC §5.2). `value` stocké en JSON TEXT et
 * validé par Zod à la lecture via `parseSettingValue`.
 */
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: updatedAtCol(),
});

/** Paramètres connus à ce jour (complétés aux étapes J1, J5 et J8). */
export const registrationModeSchema = z.enum(['open', 'approval', 'closed']);
export const maxUploadMbSchema = z.number().int().min(1).max(500);

export type RegistrationMode = z.infer<typeof registrationModeSchema>;

export function parseSettingValue<T>(raw: string, schema: ZodType<T>): T {
  return schema.parse(JSON.parse(raw));
}
