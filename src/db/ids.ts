import { v7 as uuidv7 } from 'uuid';

/**
 * Identifiant TEXT au format UUID v7 (conventions du CDC §5.2).
 * Le v7 intègre un timestamp : triable chronologiquement, indexation par date aisée.
 */
export function newId(): string {
  return uuidv7();
}
