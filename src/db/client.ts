import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const DEFAULT_DATABASE_PATH = path.join(process.cwd(), 'data', 'app.db');

export function getDatabasePath(): string {
  return process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH;
}

/**
 * Ouvre une base SQLite avec la configuration du CDC §5.3 :
 * `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`, `synchronous=NORMAL`.
 */
export function createDatabase(filePath: string): Database.Database {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  return db;
}

// Singleton mis en cache global : évite d'ouvrir une connexion supplémentaire à
// chaque rechargement à chaud du serveur de développement.
const globalForDb = globalThis as unknown as { __appDatabase?: Database.Database };

export function getDb(): Database.Database {
  globalForDb.__appDatabase ??= createDatabase(getDatabasePath());
  return globalForDb.__appDatabase;
}
