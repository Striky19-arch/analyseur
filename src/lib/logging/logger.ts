import { headers } from 'next/headers';
import pino from 'pino';
import type { Logger } from 'pino';
import { cache } from 'react';

import { REQUEST_ID_HEADER, newRequestId } from './request-id';

/**
 * Logger structuré (J0-07) : JSON sur stdout, niveau piloté par `LOG_LEVEL`
 * (cdc.md §17). Les logs d'une même requête partagent un identifiant de
 * corrélation (`reqId`).
 */
export const logger: Logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

/**
 * Identifiant de corrélation de la requête courante : celui propagé par le
 * proxy (`x-request-id`), sinon un nouvel identifiant, stable pour toute la
 * requête grâce à la mémorisation par périmètre requête de React `cache`.
 */
export const getRequestId = cache(async (): Promise<string> => {
  const requestHeaders = await headers();
  return requestHeaders.get(REQUEST_ID_HEADER) ?? newRequestId();
});

/** Logger lié à la requête courante (porteur du `reqId`). */
export async function requestLogger(bindings: Record<string, unknown> = {}): Promise<Logger> {
  return logger.child({ reqId: await getRequestId(), ...bindings });
}
