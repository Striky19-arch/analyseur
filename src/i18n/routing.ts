import { defineRouting } from 'next-intl/routing';

/**
 * Routage i18n (J0-04, décision D8) : `fr` par défaut (sans préfixe d'URL),
 * `en` sous `/en`. Les chemins des écrans du CDC §10 s'ajoutent sous ce segment.
 */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
