import { Geist, Geist_Mono } from 'next/font/google';
import { getLocale } from 'next-intl/server';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Lecture de données à la requête (locale, puis auth) : segment autorisé à bloquer
// (Next 16 Cache Components, `instant = false`).
export const instant = false;

/**
 * Layout racine : polices, thème et toasts — commun à toutes les locales.
 * La locale (`fr` par défaut) pilote l'attribut `lang` ; les messages et le
 * shell sont fournis par `src/app/[locale]/layout.tsx`.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
