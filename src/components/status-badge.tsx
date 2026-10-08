import type { VariantProps } from 'class-variance-authority';
import { useTranslations } from 'next-intl';

import { Badge, badgeVariants } from '@/components/ui/badge';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

/**
 * Statuts métier du CDC §5.2 (utilisateurs, leçons, quiz, jobs).
 * Libellés localisés dans le namespace `status` (une clé par statut).
 */
const statusConfig = {
  active: { variant: 'default' },
  pending: { variant: 'outline' },
  revoked: { variant: 'destructive' },
  empty: { variant: 'outline' },
  converting: { variant: 'secondary' },
  ready: { variant: 'default' },
  failed: { variant: 'destructive' },
  generating: { variant: 'secondary' },
  queued: { variant: 'outline' },
  running: { variant: 'secondary' },
  succeeded: { variant: 'default' },
  cancelled: { variant: 'ghost' },
} as const satisfies Record<string, { variant: NonNullable<BadgeVariant> }>;

export type StatusValue = keyof typeof statusConfig;

export function StatusBadge({ status, label }: { status: StatusValue; label?: string }) {
  const t = useTranslations('status');
  return <Badge variant={statusConfig[status].variant}>{label ?? t(status)}</Badge>;
}
