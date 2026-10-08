import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { getDatabasePath, getDb } from './client';

const MIGRATIONS_FOLDER = path.join(process.cwd(), 'drizzle');
const LOCK_STALE_MS = 60_000;
const LOCK_TIMEOUT_MS = 10_000;

/** Applique les migrations versionnées de `drizzle/` sur la connexion fournie. */
export function runMigrations(db: Database.Database): void {
  migrate(drizzle(db), { migrationsFolder: MIGRATIONS_FOLDER });
}

/**
 * Migration unique au démarrage (CDC §17), protégée par un verrou fichier :
 * évite qu'un `npm run db:migrate` concurrent ne migre en même temps que le
 * démarrage du serveur. Un verrou périmé (plus de 60 s) est cassé automatiquement.
 */
export function migrateOnce(): void {
  const lockPath = `${getDatabasePath()}.migrate.lock`;
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const fd = acquireLock(lockPath);
  try {
    runMigrations(getDb());
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lockPath);
  }
}

function acquireLock(lockPath: string): number {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      return fs.openSync(lockPath, 'wx');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          fs.unlinkSync(lockPath);
          continue;
        }
      } catch {
        continue; // verrou déjà libéré : nouvelle tentative immédiate
      }
      if (Date.now() > deadline) {
        throw new Error(`Verrou de migration détenu par un autre processus (${lockPath}).`);
      }
      sleepSync(100);
    }
  }
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
