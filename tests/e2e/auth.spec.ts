import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';
import { expect, test } from '@playwright/test';

import { clearRateLimits } from './helpers/session';

/**
 * E2E (DoD J1-03) : parcours complet inscription → connexion → déconnexion,
 * et refus d'un compte `pending`. La base E2E est celle du serveur de test
 * (`DATABASE_PATH` posé dans `playwright.config.ts`).
 *
 * J1-05 : flags du cookie de session (DoD « aucun cookie non sécurisé émis »)
 * et rate limiting (DoD « 10 tentatives de connexion en 1 min → blocage »).
 */
const DB_PATH = path.join(process.cwd(), 'data', 'e2e.db');

function setRegistrationMode(mode: 'open' | 'approval' | 'closed'): void {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Base E2E introuvable : ${DB_PATH}`);
  }
  const db = new Database(DB_PATH);
  try {
    db.prepare(
      `INSERT INTO app_settings (key, value) VALUES ('registration_mode', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(JSON.stringify(mode));
  } finally {
    db.close();
  }
}

async function register(page: import('@playwright/test').Page, email: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Nom (optionnel)').fill('E2E');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill('mot-de-passe-e2e-2026');
  await page.getByRole('button', { name: "S'inscrire" }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function login(page: import('@playwright/test').Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill('mot-de-passe-e2e-2026');
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

/** Soumet le formulaire de connexion et attend la réponse de l'action. */
async function submitLogin(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<void> {
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && new URL(response.url()).pathname === '/login',
    ),
    page.getByRole('button', { name: 'Se connecter' }).click(),
  ]);
}

// Les specs partagent la base et la même IP : compteurs remis à zéro avant
// chaque scénario (le scénario de rate limiting martèle `login:ip:127.0.0.1`).
test.beforeEach(() => {
  clearRateLimits();
});

test('parcours complet : inscription → connexion → déconnexion', async ({ page, context }) => {
  setRegistrationMode('open');
  const email = `e2e-${Date.now()}@example.com`;

  await register(page, email);
  await login(page, email);
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

  // DoD J1-05 : aucun cookie non sécurisé émis (flags §14.1 sur cookie réel).
  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === 'app_session');
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.secure).toBe(true);
  expect(sessionCookie?.sameSite).toBe('Lax');

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/login/);
  // La session est détruite : la garde refuse à nouveau l'accès.
  await page.goto('/');
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('un compte en attente (approval) ne peut pas se connecter', async ({ page }) => {
  setRegistrationMode('approval');
  const email = `e2e-pending-${Date.now()}@example.com`;

  await register(page, email);
  await login(page, email);
  await expect(page.getByText('Identifiants invalides.').first()).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('login ?reason=revoked : message neutre affiché', async ({ page }) => {
  await page.goto('/login?reason=revoked');
  await expect(page.getByText('Votre accès a été révoqué.')).toBeVisible();
});

test('mode closed : inscription refusée (formulaire absent)', async ({ page }) => {
  setRegistrationMode('closed');
  await page.goto('/register');
  await expect(page.getByText('Inscriptions fermées')).toBeVisible();
  await expect(page.getByRole('button', { name: "S'inscrire" })).toHaveCount(0);
});

test('rate limiting : 10 tentatives de connexion en 1 min → blocage', async ({ page }) => {
  const email = `e2e-rate-${Date.now()}@example.com`;
  await page.goto('/login');

  // 9 tentatives : refus neutre d'identifiants invalides.
  for (let attempt = 1; attempt <= 9; attempt += 1) {
    await submitLogin(page, email, 'mot-de-passe-faux-2026');
    await expect(page.getByText('Identifiants invalides.').first()).toBeVisible();
  }

  // 10ᵉ tentative de la minute : blocage (contrat 429 RATE_LIMITED du §12).
  await submitLogin(page, email, 'mot-de-passe-faux-2026');
  await expect(
    page.getByText('Trop de tentatives. Réessayez dans un instant.').first(),
  ).toBeVisible();
});
