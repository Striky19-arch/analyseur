import { describe, expect, it } from 'vitest';

import { ApiError, toErrorResponse } from '@/lib/api/errors';

describe('réponses d’erreur normalisées (CDC §12)', () => {
  it('met en forme une ApiError avec son code et son statut', () => {
    const { status, body } = toErrorResponse(new ApiError('NOT_FOUND'));
    expect(status).toBe(404);
    expect(body).toEqual({ error: { code: 'NOT_FOUND', message: 'Ressource introuvable.' } });
  });

  it('applique les codes stables du CDC §12 avec leurs statuts HTTP', () => {
    expect(toErrorResponse(new ApiError('VALIDATION_ERROR')).status).toBe(400);
    expect(toErrorResponse(new ApiError('UNAUTHORIZED')).status).toBe(401);
    expect(toErrorResponse(new ApiError('ACCOUNT_REVOKED')).status).toBe(403);
    expect(toErrorResponse(new ApiError('FORBIDDEN')).status).toBe(403);
    expect(toErrorResponse(new ApiError('RATE_LIMITED')).status).toBe(429);
    expect(toErrorResponse(new ApiError('LLM_UNAVAILABLE')).status).toBe(502);
  });

  it('accepte un message personnalisé', () => {
    const { body } = toErrorResponse(new ApiError('VALIDATION_ERROR', 'Titre manquant.'));
    expect(body.error.message).toBe('Titre manquant.');
  });

  it('transforme une erreur inattendue en INTERNAL_ERROR sans fuite de détail', () => {
    const { status, body } = toErrorResponse(new Error('secret de la base en clair'));
    expect(status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Erreur interne.');
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('respecte exactement le format { error: { code, message } }', () => {
    const { body } = toErrorResponse(new ApiError('FORBIDDEN'));
    expect(Object.keys(body)).toEqual(['error']);
    expect(Object.keys(body.error).sort()).toEqual(['code', 'message']);
  });
});
