'use client';

import {
  BookOpenIcon,
  GraduationCapIcon,
  HomeIcon,
  LogOutIcon,
  SettingsIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { logout } from '@/lib/auth/actions';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  labelKey: 'home' | 'courses' | 'settings' | 'admin';
  icon: LucideIcon;
};

// Routes prévues au CDC §10 ; les pages arrivent aux étapes J0-05 et suivantes.
const navItems: NavItem[] = [
  { href: '/', labelKey: 'home', icon: HomeIcon },
  { href: '/courses', labelKey: 'courses', icon: BookOpenIcon },
  { href: '/settings', labelKey: 'settings', icon: SettingsIcon },
  { href: '/admin', labelKey: 'admin', icon: ShieldCheckIcon },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/**
 * Shell applicatif : navigation latérale sur desktop, barre supérieure et
 * navigation inférieure sur mobile (CDC §11.6 — responsive mobile d'abord).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Barre supérieure (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-heading text-base font-semibold">
          <GraduationCapIcon className="size-5" aria-hidden="true" />
          {t('brand')}
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <form action={logout}>
            <Button variant="ghost" size="icon" type="submit" aria-label={tAuth('logout')}>
              <LogOutIcon className="size-5" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </header>

      {/* Navigation latérale (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card md:flex">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-5 font-heading text-base font-semibold"
        >
          <GraduationCapIcon className="size-5" aria-hidden="true" />
          {t('brand')}
        </Link>
        <nav aria-label={t('main')} className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map(({ href, labelKey, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                isActive(pathname, href) && 'bg-muted text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {t(labelKey)}
            </Link>
          ))}
        </nav>
        <div className="border-t px-3 py-3">
          <form action={logout}>
            <Button variant="ghost" type="submit" className="w-full justify-start gap-2">
              <LogOutIcon className="size-4" aria-hidden="true" />
              {tAuth('logout')}
            </Button>
          </form>
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <span className="text-xs text-muted-foreground">{tCommon('version')}</span>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Contenu */}
      <main className="flex-1 pb-20 md:pb-0 md:pl-60">{children}</main>

      {/* Navigation inférieure (mobile) */}
      <nav
        aria-label={t('main')}
        className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {navItems.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
                active && 'text-foreground',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
