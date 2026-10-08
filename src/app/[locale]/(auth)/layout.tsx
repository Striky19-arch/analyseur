/**
 * Groupe `(auth)` : pages publiques (login, register), hors shell applicatif,
 * centrées dans une colonne étroite.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
