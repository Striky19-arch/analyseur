'use client';

import { LanguagesIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * Bascule de langue fr ⇄ en (DoD J0-04) : affiche la langue cible et
 * navigue vers le même écran dans cette locale (routes `as-needed` : `/` = fr).
 */
export function LanguageSwitcher() {
  const t = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const next = locale === 'fr' ? 'en' : 'fr';
  const description = t('switch', { current: t(locale), next: t(next) });

  return (
    <Button
      variant="ghost"
      size="sm"
      title={description}
      aria-label={description}
      onClick={() => router.replace(pathname, { locale: next })}
    >
      <LanguagesIcon aria-hidden="true" />
      {t(next)}
    </Button>
  );
}
