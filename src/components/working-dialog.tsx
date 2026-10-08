'use client';

import { Loader2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Dialogue modal de suivi d'un travail en cours (conversion, génération — CDC §7.2).
 *
 * - Non fermable pendant le travail : ni croix, ni Échap, ni clic extérieur.
 *   Seul `onCancel` (s'il est fourni) met fin à l'attente, conformément au
 *   bouton d'annulation des jobs (`POST /api/jobs/:id/cancel`).
 * - `progress` omis = progression indéterminée (début de job, `progress` NULL
 *   dans la table `jobs` du CDC §5.2).
 * - `label` est annoncé aux lecteurs d'écran à chaque mise à jour
 *   (ex. « Analyse de la diapositive 12/40 » = `jobs.progress_label`).
 * - Libellés par défaut dans le namespace `working` (sauf surcharge par props).
 */
export function WorkingDialog({
  open,
  title,
  label,
  progress,
  cancelLabel,
  onCancel,
}: {
  open: boolean;
  title?: string;
  label?: string;
  /** Progression 0–100 ; omise = indéterminée. */
  progress?: number;
  cancelLabel?: string;
  onCancel?: () => void;
}) {
  const t = useTranslations('working');
  const tCommon = useTranslations('common');

  const clamped = progress === undefined ? undefined : Math.min(100, Math.max(0, progress));

  return (
    <Dialog
      open={open}
      modal
      onOpenChange={() => {
        /* non fermable : travail en cours */
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            {title ?? t('title')}
          </DialogTitle>
          <DialogDescription role="status" aria-live="polite">
            {label ?? t('waiting')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {clamped === undefined ? (
            <Skeleton className="h-2 w-full" aria-hidden="true" />
          ) : (
            <>
              <Progress value={clamped} aria-label={t('progress', { value: clamped })} />
              <p className="text-right text-xs text-muted-foreground">
                {tCommon('percent', { value: clamped })}
              </p>
            </>
          )}
        </div>
        {onCancel ? (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onCancel}>
              {cancelLabel ?? t('cancel')}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
