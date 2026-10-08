import { expect, test } from '@playwright/test';

import { createE2ESession } from './helpers/session';

/**
 * Test fumée (J0-06) : « la page d'accueil charge ». Couvre la garde d'accès
 * (J1-04) : sans cookie **ou avec un jeton inconnu en base**, redirection vers
 * la connexion ; avec une session réelle, le tableau de bord s'affiche dans le
 * shell ; `/admin` exige le rôle admin (CDC §6.3).
 */
test("la page d'accueil charge", async ({ page, context }) => {
  // Sans cookie de session : la garde redirige vers la connexion.
  await page.goto('/');
  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

  // Jeton inconnu en base : refusé comme une absence de cookie (J1-04).
  await context.addCookies([{ name: 'app_session', value: 'e2e', url: 'http://localhost:3000' }]);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login(\?|$)/);

  // Session réelle : le tableau de bord se charge dans le shell.
  const session = createE2ESession('user');
  await context.clearCookies();
  await context.addCookies([
    { name: 'app_session', value: session.token, url: 'http://localhost:3000' },
  ]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Navigation principale' }).first(),
  ).toBeVisible();
});

test('administration : /admin refusé à un utilisateur, ouvert à un admin', async ({
  page,
  context,
}) => {
  const user = createE2ESession('user');
  await context.addCookies([
    { name: 'app_session', value: user.token, url: 'http://localhost:3000' },
  ]);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/(\?|$)/);

  const admin = createE2ESession('admin');
  await context.clearCookies();
  await context.addCookies([
    { name: 'app_session', value: admin.token, url: 'http://localhost:3000' },
  ]);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin/);
});
