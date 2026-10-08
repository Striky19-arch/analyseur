import { sql } from 'drizzle-orm';
import { integer } from 'drizzle-orm/sqlite-core';

// Date courante en epoch millisecondes, calculée par SQLite : le défaut s'applique
// aussi aux inserts en SQL brut (tests, scripts d'exploitation), pas seulement à
// ceux passant par Drizzle.
const epochMsNow = sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`;

/** Colonne `created_at` INTEGER (epoch ms), défaut SQL (conventions CDC §5). */
export function createdAtCol() {
  return integer('created_at').notNull().default(epochMsNow);
}

/** Colonne `updated_at` INTEGER (epoch ms), défaut SQL + rafraîchi par Drizzle. */
export function updatedAtCol() {
  return integer('updated_at')
    .notNull()
    .default(epochMsNow)
    .$onUpdate(() => Date.now());
}
