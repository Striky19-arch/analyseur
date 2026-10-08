'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { register, type AuthFormState } from '@/lib/auth/actions';

const INITIAL_STATE: AuthFormState = { status: 'idle' };

export function RegisterForm() {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState(register, INITIAL_STATE);

  const fieldError = (field: 'email' | 'password' | 'name') =>
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
        <label htmlFor="register-name" className="text-sm font-medium">
          {t('nameLabel')}
        </label>{' '}
        <Input
          id="register-name"
          name="name"
          autoComplete="name"
          placeholder={t('namePlaceholder')}
        />
        {fieldError('name')}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-email" className="text-sm font-medium">
          {t('emailLabel')}
        </label>
        <Input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t('emailPlaceholder')}
        />
        {fieldError('email')}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-password" className="text-sm font-medium">
          {t('passwordLabel')}
        </label>
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          placeholder={t('passwordPlaceholder')}
        />
        {fieldError('password')}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? t('submitting') : t('submitRegister')}
      </Button>
    </form>
  );
}
