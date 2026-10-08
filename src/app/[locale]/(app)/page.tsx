import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

/**
 * Tableau de bord (page `/`), protégé par la garde légère du layout `(app)`.
 * Minimaliste jusqu'à J1/J4 ; la vitrine du design system (J0-02) est retirée.
 */
export default async function DashboardPage() {
  const t = await getTranslations('home');

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 md:px-8">
      <PageHeader title={t('title')} description={t('description')} />
      <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
    </div>
  );
}
