/**
 * Seed du premier administrateur (CDC §6.1) — `npm run seed:admin` (J1-02).
 * Rejouable sans erreur (DoD) : un admin déjà créé est ignoré proprement.
 * Configuration : `ADMIN_EMAIL` et `ADMIN_PASSWORD` (environnement ou `.env`).
 */
import { getDatabasePath, getDb } from '../src/db/client';
import { migrateOnce } from '../src/db/migrate';
import { ensureAdminUser } from '../src/lib/auth/seed-admin';

function loadEnvFile(): void {
  try {
    process.loadEnvFile();
  } catch {
    // Pas de `.env` : on s'appuie sur l'environnement du processus.
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('ADMIN_EMAIL et ADMIN_PASSWORD sont requis (environnement ou fichier .env).');
    process.exit(1);
  }

  migrateOnce();
  const result = await ensureAdminUser(getDb(), { email, password });

  if (result.status === 'created') {
    console.log(`Admin créé : ${result.email} (${result.userId}) — base ${getDatabasePath()}`);
  } else if (result.status === 'already_admin') {
    console.log(`Admin déjà présent : ${result.email} (${result.userId}) — inchangé.`);
  } else {
    console.error(
      `Un compte existe déjà pour ${result.email} avec un rôle non-admin (${result.userId}) : seed refusé.`,
    );
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
