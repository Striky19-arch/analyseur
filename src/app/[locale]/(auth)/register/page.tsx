import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { RegisterForm } from '@/components/auth/register-form';
import { Link } from '@/i18n/navigation';
import { getRegistrationMode } from '@/lib/auth/accounts';
import { getDb } from '@/db/client';

/**
 * Page d'inscription (J1-03) : formulaire réel, pilotée par `registration_mode`
 * (D1 — `open` | `approval` | `closed`, table `app_settings`).
 */
export const instant = false;

export default async function RegisterPage() {
  const t = await getTranslations('auth');
  const mode = getRegistrationMode(getDb());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('registerTitle')} description={t('registerDescription')} />

      {mode === 'closed' ? (
        <EmptyState title={t('closedTitle')} description={t('closedDescription')} />
      ) : (
        <RegisterForm />
      )}

      <p className="text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          {t('loginLink')}
        </Link>
      </p>
    </div>
  );
}
