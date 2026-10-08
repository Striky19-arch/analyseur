import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getRequestId, requestLogger } from '@/lib/logging/logger';
import { REQUEST_ID_HEADER } from '@/lib/logging/request-id';

/**
 * Réponses d'erreur normalisées (cdc.md §12) : `{ error: { code, message } }`
 * avec les codes stables du CDC. `INTERNAL_ERROR`, en complément des 8 codes
 * du §12, couvre les erreurs inattendues — sans jamais exposer leur détail.
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'ACCOUNT_REVOKED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'LLM_UNAVAILABLE'
  | 'CONVERSION_FAILED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export type ApiErrorBody = { error: { code: ApiErrorCode; message: string } };

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  ACCOUNT_REVOKED: 403,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  LLM_UNAVAILABLE: 502,
  CONVERSION_FAILED: 500,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

const DEFAULT_MESSAGE_BY_CODE: Record<ApiErrorCode, string> = {
  UNAUTHORIZED: 'Authentification requise.',
  FORBIDDEN: 'Accès refusé.',
  ACCOUNT_REVOKED: 'Compte révoqué.',
  VALIDATION_ERROR: 'Données invalides.',
  NOT_FOUND: 'Ressource introuvable.',
  LLM_UNAVAILABLE: 'Service LLM indisponible.',
  CONVERSION_FAILED: 'Échec de la conversion.',
  RATE_LIMITED: 'Trop de requêtes.',
  INTERNAL_ERROR: 'Erreur interne.',
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? DEFAULT_MESSAGE_BY_CODE[code]);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

/**
 * Normalise toute erreur en `{ status, body }` : les `ApiError` conservent leur
 * code, les erreurs inattendues deviennent `INTERNAL_ERROR` **sans fuite** de
 * leur message (détails réservés aux logs).
 */
export function toErrorResponse(error: unknown): { status: number; body: ApiErrorBody } {
  if (error instanceof ApiError) {
    return { status: error.status, body: { error: { code: error.code, message: error.message } } };
  }
  return {
    status: STATUS_BY_CODE.INTERNAL_ERROR,
    body: { error: { code: 'INTERNAL_ERROR', message: DEFAULT_MESSAGE_BY_CODE.INTERNAL_ERROR } },
  };
}

export function errorResponse(error: unknown): NextResponse {
  const { status, body } = toErrorResponse(error);
  return NextResponse.json(body, { status });
}

type RouteHandler<Ctx> = (request: NextRequest, context: Ctx) => Response | Promise<Response>;

/**
 * Gestionnaire d'erreur global des Route Handlers (J0-07) : journalise l'échec
 * avec l'identifiant de corrélation, renvoie le format normalisé du CDC §12,
 * et pose `x-request-id` sur chaque réponse.
 */
export function withApi<Ctx = unknown>(handler: RouteHandler<Ctx>) {
  return async (request: NextRequest, context: Ctx): Promise<Response> => {
    const requestId = await getRequestId();
    try {
      const response = await handler(request, context);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      return response;
    } catch (error) {
      const log = await requestLogger();
      log.error(
        { err: error, method: request.method, path: request.nextUrl.pathname },
        'erreur API',
      );
      const response = errorResponse(error);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      return response;
    }
  };
}
