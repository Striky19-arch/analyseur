'use server';

import { cookies, headers } from 'next/headers';
import { redirect as redirectNext } from 'next/navigation';

import { getDb } from '@/db/client';
import { currentLocale, redirectTo } from '@/lib/i18n/redirect';
import {
  SESSION_COOKIE_OPTIONS,
  SESSION_MAX_TTL_MS,
  deleteSessionByToken,
} from '@/lib/auth/session';
import type { SessionMeta } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/security/session-cookie';

import { loginUser, registerUser } from './accounts';

/** Code d'erreur de formulaire, traduit côté client (`auth.errors.*`). */
export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'closed'
  | 'invalid_email'
  | 'password_too_short'
  | 'password_too_long'
  | 'name_too_long'
  | 'rate_limited';

export type AuthFormState =
  | { status: 'idle' }
  | { status: 'error'; code: AuthErrorCode; field?: 'email' | 'password' | 'name' };

async function requestMeta(): Promise<SessionMeta> {
  const requestHeaders = await headers();
  return {
    ip: requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: requestHeaders.get('user-agent'),
  };
}

/** Chemin local uniquement (anti open-redirect) — issu de `?next=`. */
function safeNextPath(next: string): string | null {
  return next.startsWith('/') && !next.startsWith('//') ? next : null;
}

/** Inscription (J1-03) — selon `registration_mode` (D1). */
export async function register(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = await registerUser(
    {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    },
    await requestMeta(),
    getDb(),
  );

  if (result.status === 'invalid') {
    return { status: 'error', code: result.code, field: result.field };
  }
  if (result.status === 'rate_limited') {
    return { status: 'error', code: 'rate_limited' };
  }
  if (result.status === 'closed') {
    return { status: 'error', code: 'closed' };
  }
  if (result.status === 'email_taken') {
    return { status: 'error', code: 'email_taken', field: 'email' };
  }

  redirectTo('/login', await currentLocale());
}

/**
 * Connexion (J1-03) : en cas de succès, pose le cookie de session (rotation du
 * jeton éventuel d'avant connexion) et redirige vers `?next=` ou l'accueil.
 */
export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const store = await cookies();
  const result = await loginUser(
    {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      previousToken: store.get(SESSION_COOKIE_NAME)?.value ?? null,
    },
    await requestMeta(),
    getDb(),
  );

  if (result.status === 'invalid_credentials') {
    return { status: 'error', code: 'invalid_credentials' };
  }
  if (result.status === 'rate_limited') {
    return { status: 'error', code: 'rate_limited' };
  }

  // Cookie plafonné au plafond absolu de session (30 j) ; l'expiration
  // glissante (7 j d'inactivité) est portée par la session en base (§14.1).
  store.set(SESSION_COOKIE_NAME, result.token, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: SESSION_MAX_TTL_MS / 1000,
  });

  const next = safeNextPath(String(formData.get('next') ?? ''));
  if (next) {
    // `next` est un pathname complet (locale comprise) — redirection directe.
    redirectNext(next);
  }
  redirectTo('/', await currentLocale());
}

/** Déconnexion (J1-03) : suppression de la session côté serveur, puis cookie. */
export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    deleteSessionByToken(token, getDb());
    store.delete(SESSION_COOKIE_NAME);
  }
  redirectTo('/login', await currentLocale());
}
