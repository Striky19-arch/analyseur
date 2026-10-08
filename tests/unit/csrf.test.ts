import { describe, expect, it } from 'vitest';

import { ApiError, toErrorResponse } from '@/lib/api/errors';
import { assertSameOrigin } from '@/lib/security/csrf';

/**
 * CSRF (J1-05, CDC §14.1) : la vérification d'origine protège les Route
 * Handlers mutants. Les Server Actions sont couvertes par la vérification
 * native de Next.js (documentée en §14 du canevas).
 */

function post(headers: Record<string, string>): Request {
  return new Request('http://app.example/api/uploads', { method: 'POST', headers });
}

describe('assertSameOrigin (J1-05)', () => {
  it('Origin cohérent avec l’hôte de la requête : accepté', () => {
    expect(() =>
      assertSameOrigin(post({ host: 'app.example', origin: 'https://app.example' })),
    ).not.toThrow();
    // Port et casse non significatifs.
    expect(() =>
      assertSameOrigin(post({ host: 'App.Example:3000', origin: 'http://app.example:3000' })),
    ).not.toThrow();
  });

  it('X-Forwarded-Host fait foi derrière un proxy', () => {
    expect(() =>
      assertSameOrigin(
        post({
          host: 'localhost:3000',
          'x-forwarded-host': 'app.example',
          origin: 'https://app.example',
        }),
      ),
    ).not.toThrow();
  });

  it('Origin cross-site : refusé (ApiError FORBIDDEN, 403)', () => {
    let caught: unknown;
    try {
      assertSameOrigin(post({ host: 'app.example', origin: 'https://evil.example' }));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ApiError);
    const { status, body } = toErrorResponse(caught);
    expect(status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('Origin malformé ou hôte absent : refusé', () => {
    expect(() => assertSameOrigin(post({ host: 'app.example', origin: 'pas-une-url' }))).toThrow(
      ApiError,
    );
    expect(() => assertSameOrigin(post({ origin: 'https://app.example' }))).toThrow(ApiError);
  });

  it('sans Origin : seul un navigateur est accepté (Sec-Fetch-Site)', () => {
    expect(() =>
      assertSameOrigin(post({ host: 'app.example', 'sec-fetch-site': 'same-origin' })),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(post({ host: 'app.example', 'sec-fetch-site': 'none' })),
    ).not.toThrow();
    // Client non navigateur sans en-tête d'origine : refusé.
    expect(() => assertSameOrigin(post({ host: 'app.example' }))).toThrow(ApiError);
    expect(() =>
      assertSameOrigin(post({ host: 'app.example', 'sec-fetch-site': 'cross-site' })),
    ).toThrow(ApiError);
    // Un site « same-site » (sous-domaine) n'est pas same-origin : refusé.
    expect(() =>
      assertSameOrigin(post({ host: 'app.example', 'sec-fetch-site': 'same-site' })),
    ).toThrow(ApiError);
  });
});
