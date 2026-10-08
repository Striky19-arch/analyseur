/**
 * Hook Next.js `register()` (CDC §13) : exécuté au démarrage du serveur.
 * Applique les migrations avec verrou avant de servir la première requête.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { migrateOnce } = await import('./db/migrate');
    migrateOnce();

    // Log de démarrage structuré (J0-07) : premier témoin du logger pino.
    const { logger } = await import('./lib/logging/logger');
    logger.info(
      { event: 'app.start', nodeEnv: process.env.NODE_ENV ?? 'development' },
      'démarrage',
    );
  }
}
