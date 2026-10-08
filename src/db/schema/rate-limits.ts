import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Rate limiting (J1-05, CDC §14.1) : historique des tentatives par clé de
 * périmètre (`login:ip:<ip>`, `login:account:<email>`, `register:…`). Table
 * **éphémère** : les lignes plus vieilles que la fenêtre sont purgées à chaque
 * enregistrement. Choisie plutôt que la mémoire (l'alternative du CDC) pour
 * survivre aux redémarrages et rester inspectable/testable depuis les tests.
 */
export const rateLimitHits = sqliteTable(
  'rate_limit_hits',
  {
    /** Périmètre du compteur, ex. `login:ip:203.0.113.7`. */
    key: text('key').notNull(),
    /** Instant de la tentative (epoch ms). */
    hitAt: integer('hit_at').notNull(),
  },
  (table) => [index('rate_limit_hits_key_hit_at_idx').on(table.key, table.hitAt)],
);
