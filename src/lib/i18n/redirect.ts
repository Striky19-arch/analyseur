import { hasLocale } from 'next-intl';
import { getLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/** Locale courante de la requête, locale par défaut si inconnue. */
export async function currentLocale(): Promise<string> {
  const locale = await getLocale();
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}

/**
 * Redirection localisée typée `never` : le `redirect` de next-intl ne l'est pas,
 * sans quoi les fonctions-actions tombent en fin de corps (TS2366).
 */
export function redirectTo(href: string, locale: string): never {
  redirect({ href, locale });
  throw new Error('redirection next-intl inattendue');
}
