import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { createdAtCol } from './_shared';
import { users } from './users';

/**
 * Sessions en base (CDC §5.2) — obligatoire pour la révocation immédiate (§6.2) :
 * la révocation d'un utilisateur supprime toutes ses lignes `sessions`
 * (transaction implémentée à l'étape J2-04).
 * `id` : identifiant de session **haché** en base.
 */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: createdAtCol(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);
