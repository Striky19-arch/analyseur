import { getDatabasePath } from '../src/db/client';
import { migrateOnce } from '../src/db/migrate';

migrateOnce();
console.log(`Migrations appliquées : ${getDatabasePath()}`);
