import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/page-header';
import { LoginForm } from '@/components/auth/login-form';
import { Link } from '@/i18n/navigation';

/**
 * Page de connexion (J1-03) : formulaire réel, gestion de `?reason=revoked`
 * (message neutre) et du paramètre `?next=` de la garde d'accès.
 */
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; next?: string }>;
}) {
  const { reason, next } = await searchParams;
  const t = await getTranslations('auth');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('loginTitle')} description={t('loginDescription')} />

      {reason === 'revoked' ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm"
        >
          {t('noticeRevoked')}
        </p>
      ) : null}

      <LoginForm next={next} />

      <p className="text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          {t('registerLink')}
        </Link>
      </p>
    </div>
  );
}
