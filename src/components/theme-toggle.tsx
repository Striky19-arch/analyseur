'use client';

import { MoonIcon, SunIcon, SunMoonIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

const themeOrder = ['system', 'light', 'dark'] as const;
type ThemeChoice = (typeof themeOrder)[number];

const themeIcons: Record<ThemeChoice, typeof SunIcon> = {
  system: SunMoonIcon,
  light: SunIcon,
  dark: MoonIcon,
};

/**
 * Bouton cyclique : système -> clair -> sombre.
 * Avant hydratation, `theme` est indéfini des deux côtés (serveur et client) :
 * on retombe sur « système » pour éviter tout mismatch d'hydratation.
 */
export function ThemeToggle() {
  const t = useTranslations('theme');
  const { theme, setTheme } = useTheme();

  const current: ThemeChoice = themeOrder.includes(theme as ThemeChoice)
    ? (theme as ThemeChoice)
    : 'system';
  const next = themeOrder[(themeOrder.indexOf(current) + 1) % themeOrder.length];
  const Icon = themeIcons[current];

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title={t('title', { current: t(current) })}
      aria-label={t('toggle', { current: t(current), next: t(next) })}
      onClick={() => setTheme(next)}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
