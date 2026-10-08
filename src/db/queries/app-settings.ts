import type { Database } from 'better-sqlite3';

import { getDb } from '../client';

/**
 * DAL — paramètres globaux (J1-04). **Tout accès SQL passe par
 * `src/db/queries/`** : ces fonctions sont les seules à préparer des requêtes
 * sur `app_settings`. La valeur est stockée en JSON TEXT (CDC §5.2).
 */
export function getSettingValue(key: string, db: Database = getDb()): string | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
    { value: string } | undefined;
  return row?.value ?? null;
}
