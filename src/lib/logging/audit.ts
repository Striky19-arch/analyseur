import { logger } from './logger';

/**
 * Audit minimal (J1-05) : événements `user.login` et `user.login_failed`,
 * journalisés en JSON structuré avec le tag `audit: true` (cdc.md §14.6 :
 * minimisation — l'e-mail n'est journalisé que sur échec de connexion, pour
 * investiguer les attaques par dictionnaire ciblées). La table `audit_logs`,
 * le helper `audit(...)` complet (§5.2) et la rétention (D10) arrivent en
 * J2-01 ; les appels existants basculeront sans changer de signature.
 */
export type AuditAction = 'user.login' | 'user.login_failed';

export type AuditFields = {
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

export function auditEvent(action: AuditAction, fields: AuditFields = {}): void {
  logger.info({ audit: true, action, ...fields }, `audit:${action}`);
}
