import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';

/**
 * Racine de l'administration (`/admin`), temporaire jusqu'à J2 (utilisateurs,
 * révocation, providers LLM, audit).
 */
export default async function AdminPage() {
  const t = await getTranslations('admin');

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 md:px-8">
      <PageHeader title={t('title')} description={t('description')} />
      <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
    </div>
  );
}
