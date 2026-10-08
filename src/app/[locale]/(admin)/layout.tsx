import { AppShell } from '@/components/app-shell';
import { requireAdmin } from '@/lib/auth/guards';

// Garde d'accès (session + statut + rôle en base) à la requête : segment
// autorisé à bloquer (Next 16 Cache Components, `instant = false`).
export const instant = false;

/**
 * Groupe `(admin)` : administration (utilisateurs, providers LLM, audit).
 * Couvert par `requireAdmin()` (J1-04, CDC §6.3) : rôle admin **et** statut
 * actif, relus en base à chaque requête.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <AppShell>{children}</AppShell>;
}
