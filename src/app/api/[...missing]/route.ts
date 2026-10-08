import { ApiError, withApi } from '@/lib/api/errors';

/**
 * Toutes les routes `/api/*` non couvertes par une route réelle lèvent
 * `NOT_FOUND` : le gestionnaire d'erreur global renvoie le format normalisé
 * du CDC §12 (`{ error: { code, message } }`) — J0-07.
 */
const notFoundHandler = withApi(async () => {
  throw new ApiError('NOT_FOUND');
});

export const GET = notFoundHandler;
export const POST = notFoundHandler;
export const PUT = notFoundHandler;
export const PATCH = notFoundHandler;
export const DELETE = notFoundHandler;
