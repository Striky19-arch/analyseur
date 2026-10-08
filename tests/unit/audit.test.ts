import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Audit minimal (J1-05) : `user.login` et `user.login_failed` journalisés avec
 * le tag `audit: true` ; la table `audit_logs` (§5.2) arrivera en J2-01.
 */
const hoisted = vi.hoisted(() => ({ info: vi.fn() }));

vi.mock('@/lib/logging/logger', () => ({
  logger: { info: hoisted.info },
  requestLogger: async () => ({ info: hoisted.info, error: vi.fn() }),
  getRequestId: async () => 'test-request',
}));

import { auditEvent } from '@/lib/logging/audit';

describe('audit minimal (J1-05)', () => {
  beforeEach(() => {
    hoisted.info.mockClear();
  });

  it('user.login : acteur et IP, sans fuite de détail', () => {
    auditEvent('user.login', { actorId: 'u1', ip: '203.0.113.7' });
    expect(hoisted.info).toHaveBeenCalledWith(
      { audit: true, action: 'user.login', actorId: 'u1', ip: '203.0.113.7' },
      'audit:user.login',
    );
  });

  it('user.login_failed : e-mail journalisé pour l’investigation (minimisation)', () => {
    auditEvent('user.login_failed', {
      ip: '203.0.113.7',
      metadata: { email: 'cible@example.com' },
    });
    expect(hoisted.info).toHaveBeenCalledWith(
      {
        audit: true,
        action: 'user.login_failed',
        ip: '203.0.113.7',
        metadata: { email: 'cible@example.com' },
      },
      'audit:user.login_failed',
    );
  });
});
