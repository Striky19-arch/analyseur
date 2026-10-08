# src/lib/logging

Logger structuré (pino) et identifiant de corrélation de requête (J0-07, J9-03).

- `request-id.ts` : constantes et génération (`x-request-id`), module sans
  dépendance, importable depuis `src/proxy.ts`.
- `logger.ts` : logger JSON (niveau `LOG_LEVEL`), `getRequestId()`,
  `requestLogger()` (logger porteur du `reqId`).
