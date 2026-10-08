import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { routing } from './i18n/routing';
import { REQUEST_ID_HEADER, newRequestId } from './lib/logging/request-id';
import { SESSION_COOKIE_NAME } from './lib/security/session-cookie';

const handleI18nRouting = createMiddleware(routing);

/** Routes publiques (groupe `(auth)`), hors garde d'accès légère. */
const PUBLIC_PATHS = ['/login', '/register'];

/** Retire le préfixe de locale d'un pathname (`/en/courses` → `/courses`). */
function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split('/');
  return (routing.locales as readonly string[]).includes(first) ? `/${rest.join('/')}` : pathname;
}

/** Locale d'un pathname (`/en/courses` → `en`, `/courses` → `fr` par défaut). */
function localeOf(pathname: string): string {
  const [, first] = pathname.split('/');
  return (routing.locales as readonly string[]).includes(first) ? first : routing.defaultLocale;
}

/**
 * Proxy (ex-« middleware », convention renommée par Next 16) :
 * 1. identifiant de corrélation de requête (J0-07) : `x-request-id` propagé en
 *    amont et en aval — chaque réponse porte l'identifiant de ses logs ;
 * 2. négociation de la locale (next-intl) ;
 * 3. **pré-contrôle léger** de présence du cookie de session sur les routes
 *    protégées (redirection vers la connexion). Aucune logique d'autorisation
 *    ici (CDC §6.2) : elle est exercée côté serveur, à chaque requête, par la
 *    DAL (`requireUser()` en J1-04).
 *
 * Les routes `/api/*` ne sont ni traduites ni gardées (garde par route, J1+) :
 * le proxy n'y fait que la corrélation.
 */
export default function proxy(request: NextRequest) {
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? newRequestId();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const { pathname } = request.nextUrl;

  // API : uniquement la propagation de l'identifiant de corrélation.
  if (stripLocale(pathname) === '/api' || stripLocale(pathname).startsWith('/api/')) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const path = stripLocale(pathname);
  const isPublic = PUBLIC_PATHS.some(
    (publicPath) => path === publicPath || path === `${publicPath}/`,
  );

  if (!isPublic && !request.cookies.has(SESSION_COOKIE_NAME)) {
    const locale = localeOf(pathname);
    const loginUrl = new URL(
      locale === routing.defaultLocale ? '/login' : `/${locale}/login`,
      request.url,
    );
    loginUrl.searchParams.set('next', pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set(REQUEST_ID_HEADER, requestId);
    return redirectResponse;
  }

  const response = handleI18nRouting(new NextRequest(request.url, { headers: requestHeaders }));
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  // Hors périmètre : assets Next et fichiers statiques (l'API est couverte par
  // la corrélation de requête, sans garde).
  matcher: ['/', '/(fr|en)/:path*', '/((?!_next|_vercel|monitoring|.*\\..*).*)'],
};
