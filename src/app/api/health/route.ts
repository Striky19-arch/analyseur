import { NextResponse } from 'next/server';

import { pingDatabase } from '@/db/queries/health';
import { withApi } from '@/lib/api/errors';
import { requestLogger } from '@/lib/logging/logger';

/**
 * `GET /api/health` (J0-07) : vérifie l'accès à la base de données et répond en
 * JSON. L'état du worker de jobs viendra compléter la réponse en J5-01
 * (cdc.md §15).
 */
export const GET = withApi(async () => {
  const log = await requestLogger({ route: '/api/health' });

  try {
    if (!pingDatabase()) {
      throw new Error('réponse de la base inattendue');
    }
    return NextResponse.json({ status: 'ok', db: 'up' });
  } catch (error) {
    log.error({ err: error }, 'vérification de la base en échec');
    return NextResponse.json({ status: 'error', db: 'down' }, { status: 503 });
  }
});
