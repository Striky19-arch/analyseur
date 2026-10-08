import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/auth/guards';

// Garde d'accès (session + statut en base) à la requête : segment autorisé à
// bloquer (Next 16 Cache Components, `instant = false`).
export const instant = false;

/**
 * Groupe `(app)` : espace utilisateur protégé (dashboard, cours, leçons, quiz,
 * flashcards, paramètres). Garde `requireUser()` (J1-04, CDC §6.2) : session et
 * statut relus en base à chaque requête — révocation immédiate.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <AppShell>{children}</AppShell>;
}
