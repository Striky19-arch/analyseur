'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login, type AuthFormState } from '@/lib/auth/actions';

const INITIAL_STATE: AuthFormState = { status: 'idle' };

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState(login, INITIAL_STATE);

  const fieldError = (field: 'email' | 'password') =>
    state.status === 'error' && state.field === field ? (
      <p role="alert" className="text-sm text-destructive">
        {t(`errors.${state.code}`)}
      </p>
    ) : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === 'error' && !state.field ? (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.code}`)}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm font-medium">
          {t('emailLabel')}
        </label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t('emailPlaceholder')}
        />
        {fieldError('email')}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-sm font-medium">
          {t('passwordLabel')}
        </label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={12}
          placeholder={t('passwordPlaceholder')}
        />
        {fieldError('password')}
      </div>

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Button type="submit" disabled={pending}>
        {pending ? t('submitting') : t('submitLogin')}
      </Button>
    </form>
  );
}
