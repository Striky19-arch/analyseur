# Canevas d'implémentation — Application cours, flashcards et quiz

> **Document vivant**, mis à jour au fur et à mesure de l'avancement.
> Il découpe le cahier des charges (`cdc.md`) en **étapes petites, ordonnées et vérifiables**.
> Chaque étape est un incrément livrable : on passe à la suivante uniquement quand les critères d'acceptation (DoD) sont cochés.
>
> **Référence normative** : `cdc.md`. En cas de contradiction, `cdc.md` fait foi ; toute évolution de périmètre est consignée ici et dans un ADR (`docs/adr/`).

---

## Mode d'emploi

| Élément | Signification |
|---|---|
| `- [ ]` | tâche à faire |
| `- [x]` | tâche terminée et vérifiée |
| `- [~]` | tâche en cours |
| `- [!]` | bloquée (motif indiqué) |
| **DoD** | *Definition of Done* : critères d'acceptation de l'étape |
| **ID** (`J5-03`) | identifiant stable d'une étape, à citer dans les commits et le journal |

**Règles de travail**
1. Une étape = un (ou deux) commits max. Message de commit préfixé par l'ID : `J5-03 : extraction commentaires DOCX`.
2. Avant de cocher une étape : typecheck vert, tests concernés verts, DoD vérifiée un à un.
3. Toute décision technique non prévue au CDC est notée dans « Journal des décisions » en bas de ce fichier.
4. Ce fichier est mis à jour **à chaque fin d'étape** (cases cochées + entrée au journal).

---

## Table des matières

1. [Décisions préalables à trancher](#1-décisions-préalables-à-trancher)
2. [Vue d'ensemble des jalons](#2-vue-densemble-des-jalons)
3. [J0 — Fondations](#3-j0--fondations)
4. [J1 — Authentification et rôles](#4-j1--authentification-et-rôles)
5. [J2 — Administration utilisateurs et révocation](#5-j2--administration-utilisateurs-et-révocation)
6. [J3 — Providers LLM](#6-j3--providers-llm)
7. [J4 — Cours et leçons](#7-j4--cours-et-leçons)
8. [J5 — Import et conversion en Markdown](#8-j5--import-et-conversion-en-markdown)
9. [J6 — Flashcards](#9-j6--flashcards)
10. [J7 — Quiz multi-leçons](#10-j7--quiz-multi-leçons)
11. [J8 — Paramètres et finitions](#11-j8--paramètres-et-finitions)
12. [J9 — Durcissement et recette](#12-j9--durcissement-et-recette)
13. [Ordre de démarrage recommandé](#13-ordre-de-démarrage-recommandé)
14. [Journal des décisions](#14-journal-des-décisions)
15. [Journal des mises à jour](#15-journal-des-mises-à-jour)

---

## 1. Décisions préalables à trancher

À clarifier **avant** les étapes concernées. Une valeur par défaut est proposée pour ne jamais bloquer.

| # | Question (CDC §19) | Bloque | Proposition par défaut | Statut |
|---|---|---|---|---|
| D1 | Mode d'inscription | J1-03 | `approval` (compte `pending` validé par l'admin) — actée le 2026-10-08, modifiable à l'exécution via `app_settings.registration_mode` | [x] |
| D2 | Bibliothèque d'auth | J1-01 | **Sessions maison** actée le 2026-10-08 (argon2id + table `sessions` §5.2) — Better Auth / Auth.js v5 écartés (voir §14) | [x] |
| D3 | Clés API « bring your own key » | J3-04 | Non en v1 (admin seul) | [ ] |
| D4 | Modifications suivies Word | J5-03 | Conserver le texte final accepté, signaler les suppressions en note | [ ] |
| D5 | Images | J5-03 / J5-05 | Marqueur `![image](…)` conservé, pas de description (phase 3) | [ ] |
| D6 | Quotas par utilisateur | J3-08 | Aucun quota en v1, simple traçage `llm_usage` | [ ] |
| D7 | Partage de cours | hors v1 | Non | [ ] |
| D8 | Langues d'interface | J0-04 | `fr` + `en` dès le départ — actée en J0-04 | [x] |
| D9 | Formats `.doc`/`.ppt` | J5-02 | Refusés avec message explicite | [ ] |
| D10 | Rétention audit/usage | J9-04 | 12 mois, configurable dans `/admin/settings` | [ ] |

---

## 2. Vue d'ensemble des jalons

| Jalon | Étapes | Dépend de | Durée estimée | Avancement |
|---|---|---|---|---|
| **J0** Fondations | J0-01 → J0-07 | — | 1 sem. | 🟨 6/7 |
| **J1** Auth et rôles | J1-01 → J1-06 | J0 | 1–1,5 sem. | 🟨 5/6 |
| **J2** Admin utilisateurs | J2-01 → J2-07 | J1 | 1 sem. | ⬜ 0/7 |
| **J3** Providers LLM | J3-01 → J3-09 | J1 (J2-01 pour audit) | 1–1,5 sem. | ⬜ 0/9 |
| **J4** Cours et leçons | J4-01 → J4-06 | J1 | 1 sem. | ⬜ 0/6 |
| **J5** Import et conversion | J5-01 → J5-12 | J3, J4 | 3–4 sem. | ⬜ 0/12 |
| **J6** Flashcards | J6-01 → J6-06 | J5 | 1–1,5 sem. | ⬜ 0/6 |
| **J7** Quiz | J7-01 → J7-07 | J5 | 2 sem. | ⬜ 0/7 |
| **J8** Paramètres et finitions | J8-01 → J8-05 | J1–J7 | 1 sem. | ⬜ 0/5 |
| **J9** Durcissement et recette | J9-01 → J9-06 | J8 | 1–1,5 sem. | ⬜ 0/6 |

> **Point d'attention du CDC** : J5 concentre le risque technique. Dès que J3 est fonctionnel, démarrer un **prototype de conversion sur documents réels** (voir J5-00) même si J4 n'est pas terminé.

---

## 3. J0 — Fondations

> Objectif : un squelette de projet qui **build**, se **teste** et se **déploie**, avec la base de données en place.

### J0-01 · Initialisation du projet ✅ _(terminée le 2026-10-07)_
- [x] `create-next-app` (App Router, TypeScript strict, Tailwind, ESLint, dossier `src/`)
- [x] Prettier + Husky + lint-staged (`pre-commit`)
- [x] Scripts npm : `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`, `db:studio`, `seed:admin`, `backup`
- [x] Arborescence du CDC §13 créée (dossiers vides avec `README` si besoin)

- [x] **DoD** : `npm run lint && npm run typecheck && npm run build` verts ; `src/` conforme au plan §13.
  _(vérifié le 2026-10-07 : lint ✅, typecheck ✅, build ✅ — Next.js 16.4.0 ; stubs des commandes des étapes futures vérifiés en échec explicite)_

### J0-02 · Design system ✅ _(terminée le 2026-10-08)_
- [x] shadcn/ui installé (boutons, inputs, dialog, table, toast, tabs, card, badge, skeleton)
- [x] Tokens de couleur Tailwind, thème clair/sombre (`next-themes`)
- [x] Layouts racine : shell de navigation latérale (desktop) / bottom-nav (mobile)
- [x] Composants transverses : `EmptyState`, `PageHeader`, `ConfirmDialog`, `StatusBadge`, `WorkingDialog`

- [x] **DoD** : page « hello » utilisant les composants, correcte en clair/sombre et sur mobile.
  _(vérifié le 2026-10-08 : lint ✅, typecheck ✅, build ✅, smoke test HTTP 200 sur build à jour — sidebar + header + bottom-nav, 5 cartes, dialogue, confirmation, onglets, tableau, `WorkingDialog` avec barre de progression. Thème : stratégie classe `next-themes`, cycle système/clair/sombre. Contrôle visuel pixel dans navigateur à confirmer par l'utilisateur)_

### J0-03 · Base de données SQLite + Drizzle ✅ _(terminée le 2026-10-08)_
- [x] `better-sqlite3` + `drizzle-orm` + `drizzle-kit` ; fichier `data/app.db` hors repo (`.gitignore`)
- [x] `src/db/client.ts` : ouverture avec `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`, `synchronous=NORMAL` (CDC §5.3)
- [x] Schéma initial : tables `users`, `sessions`, `app_settings` (le reste arrivera par phase)
- [x] Conventions appliquées : IDs TEXT (UUIDv7), timestamps INTEGER (epoch ms), JSON TEXT validé par Zod
- [x] Migration initiale versionnée dans `drizzle/` + `migrate()` lancé au démarrage avec verrou

- [x] **DoD** : `npm run db:migrate` crée la base depuis zéro ; les PRAGMA sont vérifiables dans un test.
  _(vérifié le 2026-10-08 : `db:migrate` depuis `data/` vide → tables `users`, `sessions`, `app_settings` + PRAGMA réels (wal / FK 1 / 5000 / NORMAL) ; Vitest 5/5 verts (PRAGMA, migration depuis zéro, FK cascade + rejet, UUIDv7, JSON Zod) ; lint ✅, typecheck ✅, build ✅)_

### J0-04 · Internationalisation ✅ _(terminée le 2026-10-08)_
- [x] `next-intl` configuré (routes `fr`/`en`, défaut `fr`) — décision D8
- [x] `src/messages/fr.json` et `en.json` structurés par domaine (auth, courses, quiz, admin…)
- [x] Aucun littéral de texte dans les composants (règle de lint ou revue)

- [x] **DoD** : bascule de langue fonctionnelle sur la page d'accueil ; les deux fichiers de messages sont à jour.
  _(vérifié le 2026-10-08 : `/` sert le français (`lang="fr"`, « Accueil »…) et `/en` l'anglais (`lang="en"`, « Home »…) sans fuite de texte FR ; sélecteur de langue rendu et fonctionnel (navigation localisée) ; parité stricte des messages : 97 clés fr = 97 clés en ; règle `react/jsx-no-literals` active en erreur, lint ✅ ; typecheck ✅, tests 5/5 ✅, build ✅)_

### J0-05 · Structure applicative et garde d'accès légère ✅ _(terminée le 2026-10-08)_
- [x] Route groups : `(auth)`, `(app)`, `(admin)`, `api/`
- [x] `middleware.ts` : contrôle léger de présence du cookie uniquement (pas d'autorisation finale — CDC §6.2)
- [x] Page `/` protégée minimaliste (redirige vers `/login` si non connecté, temporaire jusqu'à J1)
- [x] `src/lib/security/headers.ts` : en-têtes de base (CSP en report-only pour l'instant)

- [x] **DoD** : navigation entre groupes de routes cohérente ; le middleware ne contient aucune logique d'autorisation.
  _(vérifié le 2026-10-08 : route groups sous `src/app/[locale]/` avec layouts dédiés (shell pour `(app)`/`(admin)`, page publique centrée pour `(auth)`) ; garde légère en double — `src/proxy.ts` (ex-`middleware.ts`, convention renommée par Next 16) + layouts — sur la seule présence du cookie `app_session`, sans aucun code d'autorisation ; `/` minimal protégé : redirections 307 vers `/login?next=…` et `/en/login?next=…` vérifiées, `/login` sans balisage shell, `/` et `/admin` avec shell ; en-têtes de sécurité présents (CSP report-only, nosniff, DENY, Referrer-Policy, Permissions-Policy) ; lint ✅, typecheck ✅, tests 5/5 ✅, build ✅ + smoke test sur build frais)_

### J0-06 · Qualité, CI et Docker _(implémentation terminée le 2026-10-08 — DoD `[!]` : validation CI/Docker en attente d'infrastructure)_
- [x] Vitest configuré (`tests/unit`, `tests/integration`), couverture collectée
- [x] Playwright configuré (`tests/e2e`), un test fumée « la page d'accueil charge »
- [x] CI : lint → typecheck → tests unitaires → build (parallélisé)
- [x] `Dockerfile` multi-étapes (`node:22-slim`, `output: 'standalone'`), `docker-compose.yml` avec volumes `/app/data` et `/app/uploads`
- [x] `.env.example` conforme au CDC §17 (aucune clé réelle)

- [!] **DoD** : CI verte ; `docker compose up` sert l'application avec des volumes persistants.
  _(bloquée sur ce poste : aucune CI exécutable (dépôt sans remote Git) et Docker non installé. Vérifications locales équivalentes vertes le 2026-10-08 : `format:check` ✅, `lint` ✅ (0 warning), `typecheck` ✅, `test:coverage` ✅ 5/5 avec rapport v8, `build` ✅, `test:e2e` ✅ (test fumée : `/` → `/login` sans cookie, tableau de bord + shell avec cookie), YAML de `ci.yml` et `docker-compose.yml` validés. À valider dès qu'un remote Git et Docker sont disponibles.)_

### J0-07 · Socle d'observabilité minimal ✅ _(terminée le 2026-10-08)_
- [x] Logger structuré `pino` avec identifiant de corrélation (requête)
- [x] `GET /api/health` : vérifie l'accès DB (worker ajouté en J5-01)
- [x] Gestionnaire d'erreur global : réponses `{ error: { code, message } }` avec codes stables du CDC §12

- [x] **DoD** : un appel en erreur renvoie le format normalisé ; `/api/health` répond en JSON.
  _(vérifié le 2026-10-08 : `GET /api/health` → 200 `{"status":"ok","db":"up"}` en JSON ; `/api/unknown` → 404 `{"error":{"code":"NOT_FOUND","message":"…"}}` au format §12 via le gestionnaire global ; corrélation prouvée de bout en bout — `x-request-id: corr-test-42` propagé du proxy à la route puis ré-émis, et `reqId` du log d'erreur identique à l'`x-request-id` de la réponse ; log de démarrage JSON pino sur stdout ; 5 tests unitaires du format d'erreur (dont absence de fuite de détail). lint ✅, typecheck ✅, tests 10/10 ✅, build ✅, test:e2e ✅ (non-régression de la garde))_

---

## 4. J1 — Authentification et rôles

> Objectif : comptes, sessions **en base**, DAL unique, rôles `user`/`admin`.

### J1-01 · Choix et intégration de la librairie d'auth (décision D2) ✅ _(terminée le 2026-10-08)_
- [x] Installer la solution retenue (**sessions maison** — D2 actée : argon2id `@node-rs/argon2`, sessions en base, cookies `HttpOnly`/`Secure`/`SameSite=Lax`)
- [x] `src/lib/auth/hash.ts` : argon2id (`@node-rs/argon2`), politique de mot de passe (≥ **12** caractères — le CDC §14.1 fait foi sur le « ≥ 8 »)
- [x] Table `sessions` conforme au CDC §5.2 (ID haché, `expires_at`, `ip`, `user_agent`) + rotation à la connexion

- [x] **DoD** : un mot de passe est haché/vérifié en test unitaire ; aucune session JWT autonome sans vérification en base.
  _(vérifié le 2026-10-08 : hash argon2id (`$argon2id$`) haché/vérifié en test, hash malformé → `false` sans exception ; politique ≥ 12 / ≤ 128 testée ; sessions vérifiées **en base uniquement** — jeton brut jamais stocké (seul son SHA-256), session expirée refusée et purgée, rotation à la connexion invalide l'ancien jeton (anti-fixation) en conservant les autres appareils, `deleteUserSessions` révoque tout ; cookies `HttpOnly`/`Secure` (prod)/`SameSite=Lax` (10 tests `tests/unit/auth.test.ts`). lint ✅, typecheck ✅, tests 20/20 ✅, build ✅, test:e2e ✅)_

### J1-02 · Modèle utilisateur complet et seed admin ✅ _(terminée le 2026-10-08)_
- [x] Compléter la table `users` du CDC §5.2 (`role`, `status`, `revoked_*`, `locale`, `theme`, `preferences`, `last_login_at`)
- [x] Script `scripts/seed-admin.ts` (`npm run seed:admin`) à partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- [x] Contraintes : email normalisé en minuscules et unique

- [x] **DoD** : `npm run seed:admin` crée (ou ignore proprement) le premier admin ; rejouable sans erreur.
  _(vérifié le 2026-10-08 : table `users` déjà conforme §5.2 depuis J0-03 (15 colonnes) — complétée par la contrainte `users_email_lower` (CHECK `email = lower(email)`, migration `0001_first_reptil` vérifiée) ; `npm run seed:admin` exécuté **deux fois** sur base temporaire : « Admin créé » (email normalisé `admin@example.com`, rôle `admin`, statut `active`, hash argon2id) puis « déjà présent — inchangé », exit 0 à chaque fois ; mot de passe non réinitialisé au rejou (vérifié par test) ; compte non-admin existant → refus explicite exit 1 ; variables manquantes → exit 1 avec message. 26 tests dont 6 nouveaux. lint ✅, typecheck ✅, tests 26/26 ✅, build ✅)_

### J1-03 · Inscription, connexion, déconnexion ✅ _(terminée le 2026-10-08)_
- [x] `/register` selon `registration_mode` (`open` | `approval` | `closed`, table `app_settings`)
- [x] `/login` : refus si `status != 'active'` avec message neutre ; paramètre `?reason=revoked` géré
- [x] `/logout` : suppression de la session côté serveur
- [x] Validation Zod de tous les formulaires ; messages traduits (fr/en)

- [x] **DoD** : parcours complet inscription → connexion → déconnexion testé en E2E ; un compte `pending` ne peut pas se connecter.
  _(vérifié le 2026-10-08 : E2E Playwright 5/5 — parcours complet **inscription → connexion → déconnexion** (puis la garde refuse à nouveau `/`, preuve que la session est détruite côté serveur), **compte `pending` refusé** avec message neutre identique aux mauvais identifiants, `?reason=revoked` affiché, mode `closed` sans formulaire. Refus neutre : même réponse pour mauvais mot de passe, compte `pending`, compte `revoked` et compte inconnu (tests unitaires), égalisation du temps de réponse par hash factice. Validation Zod : email, mot de passe (12–128), nom (≤ 100) ; messages fr/en par code d'erreur (parité). 36 tests unitaires (10 nouveaux), lint ✅, typecheck ✅, build ✅)_

### J1-04 · DAL : `requireUser()` / `requireAdmin()`
- [x] `src/db/queries/` : fonctions d'accès par domaine, **aucun accès DB hors DAL**
- [x] `requireUser()` : recharge la session **et** le statut utilisateur à chaque requête (condition de la révocation immédiate — CDC §6.2)
- [x] `requireAdmin()` : `role='admin'` ET `status='active'`
- [x] Route group `(admin)` entièrement couvert par `requireAdmin`

- [x] **DoD** : test d'intégration prouvant qu'un utilisateur révoqué (statut modifié en base) est refusé à sa requête suivante.
  _(vérifié le 2026-10-08 : test d'intégration (`tests/unit/guards.test.ts`, 8 tests) — utilisateur actif avec session → accès accordé ; **statut changé en base (`revoked`) → refus à l'appel suivant** (`/login?reason=revoked`) **et session purgée** ; compte `pending` refusé (session purgée) ; jeton absent/inconnu refusé ; `requireAdmin` refuse un `user` (redirect `/`) et admet un admin actif ; jeton brut jamais stocké (ID = SHA-256). DAL unique `src/db/queries/` (users/sessions/app-settings/health) : les 13 sites SQL restants migrés (accounts, seed-admin, health), vérifié par grep — seul le client/générateur de migrations prépare du SQL hors DAL. `light-guard.ts` supprimé, layouts `(app)`/`(admin)` branchés sur `requireUser`/`requireAdmin`. E2E 6/6 (smoke adapté aux sessions réelles + `/admin` refusé à un user et ouvert à un admin), 44 tests unitaires, lint/typecheck/build verts, parité i18n 75/75.)_

Correctif transverse acté pendant l'étape : `await connection()` au sommet de `requireUser()` — Next 16 (Cache Components + Instant Navigations) refusait de prerender le `Date.now()` de l'expiration de session (« unstable value » sur stderr à chaque requête protégée) ; corrigé par la voie documentée pour une valeur par requête (0 occurrence après correction, vérifié sur les logs E2E).

### J1-05 · Sécurité transverse de l'auth
- [x] Rate limiting sur `/login`, `/register` (par IP + par compte, table SQLite ou mémoire)
- [x] Protection CSRF (Server Actions natives + vérification d'origine sur Route Handlers mutants)
- [x] Cookies : `HttpOnly`, `Secure`, `SameSite=Lax`, durée 7 j glissants / 30 j max
- [x] Audit minimal : `user.login`, `user.login_failed` (complété en J2-01)

- [x] **DoD** : 10 tentatives de connexion en 1 min → `429 RATE_LIMITED` ; aucun cookie non sécurisé émis.
  _(vérifié le 2026-10-08 : **DoD 1** — E2E « rate limiting : 10 tentatives de connexion en 1 min → blocage » : 10 soumissions réelles du formulaire, les 9 premières en refus neutre d'identifiants, **la 10ᵉ affiche le message de blocage** (`auth.errors.rate_limited`, fr/en) ; couche API : `ApiError('RATE_LIMITED')` → **429** `{ "error": { "code": "RATE_LIMITED", … } }` (contrat §12, testé). Tests unitaires (11) : la 10ᵉ tentative d'une fenêtre de 60 s est refusée avec `Retry-After`, fenêtre glissante (retombe après 60 s de calme), indépendance des périmètres, **blocage IP partagé entre comptes**, **blocage par compte quel que soit le client**, compteur du compte effacé après connexion réussie (pas celui de l'IP), inscription limitée elle aussi. **DoD 2** — E2E sur **cookie réel** après connexion : `HttpOnly` + `Secure` + `SameSite=Lax` (build de production, `next start`), options émises vérifiées en unitaire. 68 tests unitaires (24 nouveaux), E2E 7/7, lint/typecheck/build verts, parité i18n 76/76.)_

### J1-06 · Tests de l'authentification
- [ ] Unitaires : hash, politique de mot de passe, validation des entrées
- [ ] Intégration : cycles de session, expiration, révocation de session
- [ ] E2E : redirection d'un non connecté, accès `/admin` refusé pour un `user`

**DoD** : couverture ≥ 80 % sur `lib/auth` (exigence CDC §16).

---

## 5. J2 — Administration utilisateurs et révocation

> Objectif : le dashboard admin exigible dès le MVP, avec **révocation effective à la requête suivante**.

### J2-01 · Journal d'audit et paramètres globaux
- [ ] Table `audit_logs` (CDC §5.2) + helper `audit(actorId, action, targetType, targetId, metadata, ip)`
- [ ] Table `app_settings` + lecture/caché-court, écran d'édition reporté à J8/J9
- [ ] Rétention configurable (décision D10)

**DoD** : chaque action admin posée jusqu'ici produit une ligne d'audit.

### J2-02 · Écran `/admin/users` (liste)
- [ ] Tableau paginé : nom, e-mail, rôle, badge de statut, dernière connexion, nb de cours, usage LLM
- [ ] Recherche (e-mail/nom), filtres (statut, rôle), tri
- [ ] Server Components + Server Actions (pas de route API CRUD inutile)

**DoD** : liste utilisable avec 1 000 comptes de test sans latence perçue (> 200 ms de rendu serveur).

### J2-03 · Création de compte par l'admin et rôles
- [ ] `adminCreateUser` (e-mail, rôle, mot de passe temporaire à changer à la première connexion)
- [ ] `adminSetRole` journalisé ; impossibilité de se retirer son propre rôle admin (garde-fou)
- [ ] Réinitialisation de mot de passe (mot de passe temporaire)

**DoD** : un compte créé par l'admin peut se connecter et doit changer son mot de passe.

### J2-04 · Révocation / réactivation (exigence clé)
- [ ] `adminRevokeUser` : **transaction unique** — `status='revoked'`, `revoked_at/by/reason`, `DELETE FROM sessions`, annulation des `jobs` `queued`/`running`, écriture audit
- [ ] `adminRestoreUser` : `status='active'`, journalisé
- [ ] Dialogue de confirmation avec motif optionnel ; actions groupées (révocation multiple)
- [ ] Comptes `pending` : activation / refus depuis la même écran

**DoD (critère CDC §18-J2)** : un utilisateur connecté et révoqué est éjecté **à sa prochaine requête** (test E2E « révoquer un utilisateur connecté et constater son éjection »).

### J2-05 · Garde-fous de l'administration
- [ ] Un admin ne peut pas se révoquer lui-même
- [ ] Impossible de révoquer ou de rétrograder le **dernier admin actif**
- [ ] Messages d'erreur explicites, aucune suppression définitive en v1 (RGPD reporté à J8-03)

**DoD** : tests unitaires des deux garde-fous.

### J2-06 · Écran `/admin/audit`
- [ ] Liste paginée, filtres (acteur, action, période, cible), export CSV basique
- [ ] Lien depuis la fiche utilisateur vers son historique

**DoD** : on retrouve visuellement la révocation effectuée en J2-04.

### J2-07 · Tests de révocation et d'isolation
- [ ] Intégration : sessions supprimées, jobs annulés, accès refusé à la requête suivante
- [ ] Tests IDOR : A ne lit jamais les données de B (matrice de tests réutilisable pour J4–J7)
- [ ] `/admin/*` refusé à un `user` et à un `revoked`

**DoD** : matrice d'IDOR exécutable en CI.

---

## 6. J3 — Providers LLM

> Objectif : couche d'abstraction multi-providers, clés chiffrées, routage par tâche.

### J3-01 · Chiffrement des secrets
- [ ] `src/lib/crypto/` : AES-256-GCM, format stocké `iv:tag:ciphertext`, clé maître `APP_ENCRYPTION_KEY` (32 octets)
- [ ] Fonctions `encryptSecret`/`decryptSecret` (déchiffrement **en mémoire seulement**, jamais de renvoi)
- [ ] Script de rechiffrement pour rotation de clé maître (documenté)

**DoD** : test aller-retour chiffrer/déchiffrer ; un test vérifie qu'aucune clé en clair n'apparaît dans les réponses API.

### J3-02 · Schéma LLM
- [ ] Tables `llm_providers`, `llm_task_routes`, `llm_usage` (CDC §5.2)
- [ ] `api_key_last4` pour affichage masqué ; `available_models` en JSON validé Zod
- [ ] Valeurs initiales des 4 tâches : `conversion`, `flashcards`, `quiz`, `vision_ocr`

**DoD** : migration appliquée ; CRUD possible en requêtes de test.

### J3-03 · Couche d'abstraction `lib/llm`
- [ ] Interface `LlmClient` exactement comme au CDC §8.1 (`generateText`, `generateObject`, `describeImage?`)
- [ ] Fabrique `getLlmClient(task)` : lit `llm_task_routes` + `llm_providers`, instancie le provider Vercel AI SDK correspondant (`@ai-sdk/openai`, `-anthropic`, `-google`, `-mistral`, `-openai-compatible`)
- [ ] Cache de configuration 30 s, invalidé à toute modification admin
- [ ] Repli automatique vers `fallback_*` sur 5xx/timeout/429 persistants
- [ ] Enregistrement systématique dans `llm_usage` (tokens, durée, statut) — jamais de clé ni de contenu de document dans les logs

**DoD** : test avec **mock provider** (réponses déterministes) prouvant la résolution de route et le repli.

### J3-04 · Écran `/admin/providers` (CRUD)
- [ ] Liste : nom, type, modèle par défaut, activé/désactivé, état du dernier test
- [ ] Formulaire : type, `base_url` (si `openai_compatible`), **clé API** (champ masqué, jamais réaffichée), modèle par défaut, modèles disponibles, options
- [ ] Modification de clé = remplacement (jamais de lecture de l'ancienne)
- [ ] Suppression impossible si le provider est référencé par une route (message explicite)
- [ ] Désactivation avec avertissement bloquant si une route pointe vers lui

**DoD** : aucun écran ni réponse API ne contient la clé ; toute mutation est journalisée en audit.

### J3-05 · Test de connexion
- [ ] Bouton « Tester » : appel minimal (« Réponds OK »), affichage latence ou erreur lisible
- [ ] Mémorisation de l'état du dernier test sur la ligne du provider

**DoD** : test OK/KO visibles sur l'écran avec un provider valide et un provider à clé invalide.

### J3-06 · Routage par tâche
- [ ] Écran `/admin/providers` (onglet) : pour chaque tâche, provider + modèle + repli + température/max tokens
- [ ] Validation : une route ne peut pas pointer vers un provider désactivé
- [ ] Estimation de coût indicative (tokens) affichée sur les opérations lourdes (utilisé en J5/J6/J7)

**DoD** : modifier la route de la tâche `quiz` change effectivement le modèle utilisé (prouvé par `llm_usage`).

### J3-07 · Protection SSRF des URL personnalisées
- [ ] Validation du schéma (`http/https`), blocage des plages métadonnées cloud (`169.254.169.254` et équivalents)
- [ ] Liste d'hôtes autorisés configurable ; journalisation des tentatives refusées

**DoD** : tests unitaires sur une liste d'URL malveillantes.

### J3-08 · Statistiques d'usage
- [ ] Écran `/admin` (tuile) : consommation par provider/modèle/utilisateur sur période (depuis `llm_usage`)
- [ ] Préparation des futurs quotas (décision D6 : traçage seul en v1)

**DoD** : les statistiques reflètent les appels des tests précédents.

### J3-09 · Tests J3
- [ ] Unitaires : crypto, résolution de route, fallback, garde SSRF
- [ ] Intégration : CRUD provider avec mock, refus d'exposition des clés
- [ ] LLM live : tests optionnels désactivés par défaut (`LIVE_LLM_TESTS=1`)

**DoD** : couverture ≥ 80 % sur `lib/llm` et `lib/crypto`.

---

## 7. J4 — Cours et leçons

> Objectif : le squelette organisationnel (cours → leçons) avec éditeur Markdown.

### J4-01 · Schéma cours et leçons
- [ ] Tables `courses`, `lessons`, `source_files`, `lesson_versions` (CDC §5.2 — `lesson_versions` prévue dès maintenant, alimentée en J8)
- [ ] Index : `lessons(course_id, position)`, `sessions(user_id)`, `users(email)`
- [ ] `content_hash` calculé à chaque écriture de `content_md`

**DoD** : migration appliquée ; les clés étrangères ont un `ON DELETE` explicite.

### J4-02 · CRUD des cours
- [ ] `/courses` : liste, création, édition (titre, description, langue, couleur, icône), suppression avec confirmation
- [ ] Server Actions `createCourse`, `updateCourse`, `deleteCourse`
- [ ] Isolation par `user_id` appliquée dans la DAL

**DoD** : test IDOR — un cours d'un autre utilisateur est introuvable (`NOT_FOUND`).

### J4-03 · CRUD des leçons et réordonnancement
- [ ] `/courses/[courseId]` : liste des leçons ordonnées, création, renommage, suppression
- [ ] Réordonnancement par glisser-déposer (ou flèches en fallback clavier/mobile) → `reorderLessons`
- [ ] États `empty | converting | ready | failed` visibles (badges)

**DoD** : l'ordre survit à un rechargement ; la suppression d'une leçon suit les règles de `ON DELETE`.

### J4-04 · Rendu Markdown assaini
- [ ] `react-markdown` + `remark-gfm` + **`rehype-sanitize`** (aucun HTML brut non filtré)
- [ ] Styles dédiés aux blocs « Notes du présentateur » et « 💬 Commentaire » (contrat CDC §7.3)
- [ ] Page de lecture `/courses/[courseId]/lessons/[lessonId]`

**DoD** : un Markdown contenant du `<script>` s'affiche sans exécution ; les blocs notes/commentaires sont stylés.

### J4-05 · Éditeur Markdown
- [ ] Deux panneaux : CodeMirror 6 (source) + aperçu synchronisé, barre d'outils (titres, gras, listes, tableaux, citations, code)
- [ ] Sauvegarde automatique (debounce 2 s) + indicateur « Enregistré / Enregistrement… »
- [ ] Contrôle de concurrence optimiste (`updated_at`) : refus propre de l'écrasement d'une modification d'un autre onglet
- [ ] Alerte sur fermeture avec modifications non sauvegardées
- [ ] `updateLessonContent` : recalcul de `content_hash`, marquage `stale` des éléments dérivés (mécanisme consommé en J6/J7)

**DoD** : deux onglets en conflit → le second reçoit un message explicite et ne détruit rien.

### J4-06 · Tests J4
- [ ] Unitaires : calcul de `content_hash`, règles de réordonnancement
- [ ] Intégration : CRUD complet, concurrence optimiste
- [ ] IDOR sur toutes les routes cours/leçons

**DoD** : couverture ≥ 80 % sur `db/queries` des cours/leçons.

---

## 8. J5 — Import et conversion en Markdown

> Objectif : le cœur technique. **Principe : fidélité avant reformulation** (CDC §7.1).
> Dépendances : J3 (LLM), J4 (leçons). Démarrez J5-00 dès que J3 est vert.

### J5-00 · Prototype de risque (documents réels) 🔥
- [ ] Collecter 5 documents réels variés (docx avec commentaires, pptx avec notes, pdf textuel, pdf 2 colonnes, pdf scanné)
- [ ] Implémenter un extracteur PPTX minimal « au fil de l'eau » et mesurer la fidélité obtenue
- [ ] Consigner les écueils rencontrés dans le journal des décisions

**DoD** : note de synthèse sur la faisabilité réelle ; ajuste le planning de J5.

### J5-01 · File de jobs et worker
- [ ] Table `jobs` (CDC §5.2) + `enqueue()`, `claim()` transactionnel (`UPDATE … WHERE status='queued' … RETURNING`)
- [ ] Worker in-process démarré dans `instrumentation.ts` (runtime `nodejs` uniquement), tick 1–2 s, concurrence `JOB_CONCURRENCY`
- [ ] Reprise après crash : jobs `running` à verrou périmé → `queued`
- [ ] Retries (2, avec backoff) sur erreurs réseau/429 ; annulation par `AbortSignal`
- [ ] Compléter `/api/health` : worker vivant

**DoD** : un job de test passe de `queued` à `succeeded` avec progression mise à jour ; reprise prouvée par test (kill du worker simulé).

### J5-02 · Upload sécurisé
- [ ] `POST /api/uploads` (multipart) → `source_files`, leçon en `converting`, création du job `convert_document`, renvoi du `jobId`
- [ ] Validation : extensions `.docx/.pptx/.pdf` uniquement (D9), **signatures binaires** (magic bytes), ZIP valide pour OOXML, taille max (`MAX_UPLOAD_MB`), limite de pages/diapositives
- [ ] Protection zip bomb (taille décompressée, nombre d'entrées), refus des PDF chiffrés, refus `.docm/.pptm`
- [ ] Nom de fichier assaini, stockage sous UUID dans `uploads/` (hors webroot)
- [ ] Rate limiting upload ; téléchargement du fichier d'origine via `GET /api/lessons/:id/source` (authentifié)

**DoD** : les fichiers malveillants du jeu de tests (zip bomb, MIME menteur, XXE) sont refusés avec un message clair.

### J5-03 · Extracteur DOCX
- [ ] `src/lib/convert/docx/` : parsing OOXML via `jszip` + `fast-xml-parser` (entités externes désactivées — XXE)
- [ ] Corps : paragraphes, styles de titre, listes (`numPr`), tableaux (`w:tbl`), liens, gras/italique/souligné
- [ ] **Commentaires** : `word/comments.xml` + `commentsExtended.xml`, ancres `commentRangeStart/End`, restitution du passage commenté
- [ ] Notes de bas de page / de fin ; en-têtes/pieds dans le rapport ; modifications suivies selon D4
- [ ] Sortie : `ExtractedDocument` (format intermédiaire, annexe A.3)

**DoD** : sur fixture DOCX : 100 % du texte, des notes et des commentaires présents dans le JSON intermédiaire.

### J5-04 · Extracteur PPTX
- [ ] `src/lib/convert/pptx/` : ordre des diapositives via `presentation.xml` + relations
- [ ] Texte des formes, titres, tableaux, SmartArt (`diagrams/data*.xml`), groupes ; tri des formes par position (heuristique documentée)
- [ ] **Notes** (`notesSlides`), **commentaires** classiques et modernes (`ppt/comments`, `modernComment_*`, `authors`)
- [ ] Diapositives masquées conservées avec mention « (masquée) »

**DoD** : sur fixture PPTX : notes et commentaires retrouvés à 100 %, ordre des diapositives correct.

### J5-05 · Extracteur PDF
- [ ] `src/lib/convert/pdf/` : `unpdf`/`pdfjs-dist` pour le texte avec positions (blocs, colonnes), détection des titres par corps de police
- [ ] Reconstruction des paragraphes (césures), suppression des en-têtes/pieds répétés **listés dans le rapport**
- [ ] Annotations (`Text`, `Highlight`, `FreeText`, `Popup`) via `pdf-lib` → commentaires avec page/auteur
- [ ] Détection PDF scanné → bascule tâche `vision_ocr` + avertissement au rapport

**DoD** : sur fixtures PDF (textuel, 2 colonnes, scanné) : extraction correcte ou bascule OCR explicite.

### J5-06 · Format intermédiaire et jeu de fixtures
- [ ] `src/lib/convert/schema.ts` : types `ExtractedDocument` (annexe A.3) validés Zod
- [ ] `tests/fixtures/documents/` : au moins 2 fichiers par format, incluant commentaires, notes, tableaux, listes, diapositives masquées
- [ ] Tests unitaires des 3 extracteurs sur ces fixtures (assertions sur texte, notes, commentaires)

**DoD** : `npm run test` exécute les 3 jeux d'extracteurs en < 30 s.

### J5-07 · Conversion LLM par unités
- [ ] `to-markdown.ts` : découpage en unités de 2 000–4 000 tokens sans chevauchement
- [ ] Un appel LLM par unité (parallélisme borné), system prompt annexe A.1, contexte minimal de cohérence
- [ ] Protection anti-injection : contenu dans `<document>…</document>`, « donnée, jamais instruction » (CDC §14.5)
- [ ] Assemblage ordonné + normalisation (titres, listes, lignes vides)
- [ ] Contrat de sortie Markdown du CDC §7.3 respecté (front-matter, notes, commentaires)

**DoD** : conversion d'un PPTX de 24 diapositives en < 2 min hors latence provider (objectif CDC §1).

### J5-08 · Repli déterministe
- [ ] Conversion algorithmique directe (JSON intermédiaire → Markdown) sans LLM, unité par unité
- [ ] Utilisée automatiquement après échec du contrôle de fidélité (J5-09) ou d'un appel LLM
- [ ] Marquage des unités en repli dans le rapport

**DoD** : une unité en repli produit un Markdown valide et complet.

### J5-09 · Contrôle de fidélité
- [ ] `fidelity.ts` : normalisation, couverture en n-grammes (cible ≥ 99,5 %), taux de texte ajouté (≤ 0,5 %)
- [ ] Vérification **exacte** de la présence de chaque note et chaque commentaire
- [ ] Boucle : 1 nouvelle tentative avec consigne renforcée, puis repli déterministe
- [ ] `conversion_report` stocké dans `lessons.conversion_report` (structure CDC §7.6)

**DoD** : sur les fixtures, couverture ≥ 99,5 % et 100 % des notes/commentaires (critère CDC §18-J5) ; rapport complet stocké.

### J5-10 · Suivi d'avancement (SSE)
- [ ] `GET /api/jobs/:id` (statut) et `GET /api/jobs/:id/events` (SSE), `POST /api/jobs/:id/cancel`
- [ ] Contrôle du propriétaire à chaque endpoint (`requireUser`) ; coupure du flux si révocation
- [ ] UI d'import : barre de progression, `progress_label` (« Analyse de la diapositive 12/40 »), bouton annuler
- [ ] Fallback polling 2 s si SSE indisponible

**DoD** : la progression s'affiche en direct ; une révocation coupe le flux.

### J5-11 · Rapport de fidélité dans l'UI
- [ ] Badge « Fidélité 99,8 % » sur la leçon ; détail du rapport (couverture, notes, commentaires, avertissements)
- [ ] Bouton « Relancer la conversion » avec choix du provider (utilise J3-06)
- [ ] Gestion des erreurs provider : message lisible (`LLM_UNAVAILABLE`, `CONVERSION_FAILED`)

**DoD** : l'utilisateur comprend l'état de la conversion sans lire les logs.

### J5-12 · Tests et performances de J5
- [ ] Tests de fidélité sur tous les fixtures en CI (mock LLM déterministe + tests live optionnels)
- [ ] Test de performance : document de 50 pages < 2 min (hors latence provider)
- [ ] Tests de sécurité upload (zip bomb, MIME, XXE, PDF chiffré)

**DoD** : couverture ≥ 80 % sur `lib/convert` (exigence CDC §16) ; rapport de perf archivé.

---

## 9. J6 — Flashcards

> Objectif : génération ancrée + mode d'étude deux faces.

### J6-01 · Schéma et génération
- [ ] Table `flashcards` (CDC §5.2) + `generation_id`, `origin`, `stale`, `source_excerpt`
- [ ] `lib/generate/flashcards.ts` : `generateObject` + schéma Zod `FlashcardBatch` (CDC §9.2)
- [ ] Paramètres : leçon, nombre (10–50), style, langue ; langue par défaut = langue du cours

**DoD** : un lot est généré et persisté avec ses `source_excerpt`.

### J6-02 · Validation d'ancrage et déduplication
- [ ] Vérification que chaque `source_excerpt` existe dans le Markdown (correspondance approchée) ; **écartement** des cartes non ancrées
- [ ] Déduplication intra-lot et vs cartes existantes (normalisation + Jaccard)
- [ ] Reprise automatique : 1 ré-essai avec le message de validation, puis échec explicite

**DoD** : un mock renvoyant une carte sans extrait → carte écartée et comptabilisée dans le résultat.

### J6-03 · Job de génération et UI
- [ ] Job `generate_flashcards` (même file que J5-01) + suivi de progression
- [ ] Écran de lancement avec estimation de coût ; choix « remplacer » / « ajouter » à la régénération (jamais d'écrasement de cartes modifiées sans confirmation)

**DoD** : parcours leçon → générer → cartes visibles, en conservant les cartes éditées manuellement.

### J6-04 · Mode étude deux faces
- [ ] `FlipCard` : retournement clic/tap + touche `Espace`, animation `rotateY` avec respect de `prefers-reduced-motion`
- [ ] Navigation `←`/`→`, compteur, mode mélange, filtres (par leçon, « à revoir »)
- [ ] Boutons « Je savais » / « À revoir » persistés (`markCardReview`) — socle du SM-2 phase 2
- [ ] Accessibilité : face cachée `aria-hidden`, bouton avec `aria-pressed`, focus visible

**DoD** : usage complet au clavier ; audit a11y sans erreur critique sur cet écran.

### J6-05 · Édition et suppression des cartes
- [ ] Édition en ligne recto/verso (Markdown), suppression avec confirmation
- [ ] Marquage `stale` si `content_hash` de la leçon a changé (mécanisme J4-05) + bouton « Régénérer »

**DoD** : après modification d'une leçon, les cartes sont marquées « potentiellement obsolètes » sans être supprimées.

### J6-06 · Vue agrégée du cours
- [ ] `/courses/[courseId]/flashcards` : agrégation multi-leçons, filtre par leçon, statistiques simples (cartes, à revoir)

**DoD** : l'agrégat reflète exactement les cartes des leçons sélectionnées.

---

## 10. J7 — Quiz multi-leçons

> Objectif : quiz combinant plusieurs leçons d'un même cours, correction côté serveur.

### J7-01 · Schéma quiz
- [ ] Tables `quizzes`, `quiz_sources`, `quiz_questions`, `quiz_attempts`, `quiz_attempt_answers` (CDC §5.2)
- [ ] Contrainte applicative : toutes les leçons d'un quiz appartiennent au même cours et au même utilisateur

**DoD** : migration appliquée ; index `quiz_questions(quiz_id, position)`.

### J7-02 · Création d'un quiz multi-leçons
- [ ] `/courses/[courseId]/quizzes` : liste des quiz + historique des tentatives (F8)
- [ ] Écran de création : sélection de leçons (cases, « toutes »), titre, nb de questions (5–50), difficulté, types, langue, mode chronométré, mélange
- [ ] Server Action `startQuizGeneration` → job `generate_quiz`

**DoD** : on peut lancer un quiz sur ≥ 3 leçons sélectionnées.

### J7-03 · Génération et validation
- [ ] `lib/generate/quiz.ts` : `generateObject` + schéma `QuizBatch` (CDC §9.3), prompt annexe A.2
- [ ] Répartition des questions proportionnelle à la longueur des leçons, avec minimum par leçon
- [ ] Si dépassement de fenêtre : génération par leçon puis fusion, déduplication, mélange ; sinon appel unique avec balises `<lesson>`
- [ ] Option « questions transversales » (second passage)
- [ ] Validation serveur : `correct ⊆ options`, unicité pour `single/true_false`, pas de doublons d'options, `lessonId` dans la sélection ; ancrage `sourceExcerpt` obligatoire

**DoD** : sur un mock, un quiz invalide est réparé ou rejeté explicitement ; chaque leçon sélectionnée est représentée (critère CDC §18-J7).

### J7-04 · Lecteur interactif (`QuizPlayer`)
- [ ] Écran d'accueil (titre, nb de questions, leçons couvertes, durée estimée) → « Commencer »
- [ ] Une question par écran, barre de progression, compteur, chronomètre optionnel
- [ ] Types : `single` (radio), `multiple` (cases + mention explicite), `true_false` (deux grands boutons)
- [ ] Mode « apprentissage » (défaut) : correction immédiate (icône + texte, pas la couleur seule), explication, extrait source repliable, lien vers la leçon
- [ ] Mode « examen » : pas de correction avant la fin, navigation libre, marquage « à revoir »
- [ ] Navigation clavier : `1–6`, `Entrée`, `←/→`

**DoD** : parcours complet en mobile et desktop ; conformité clavier vérifiée.

### J7-05 · Correction serveur, sauvegarde et reprise
- [ ] `startAttempt`, `submitAnswer` (sauvegarde à chaque réponse), `finishAttempt`
- [ ] **En mode examen, les bonnes réponses ne sont pas envoyées au client** avant la soumission (CDC §11.1) — correction calculée côté serveur
- [ ] Reprise après fermeture de l'onglet (état persisté)

**DoD** : test E2E « fermer l'onglet puis reprendre » ; inspection du trafic : aucune réponse correcte exposée en mode examen.

### J7-06 · Résultats
- [ ] `/quizzes/[quizId]/results/[attemptId]` : score global, **score par leçon**, liste question/réponse donnée/attendue/explication
- [ ] Actions : « Refaire uniquement les questions ratées », « Recommencer »
- [ ] Historique des tentatives (F8) avec scores et durées

**DoD** : score par leçon exact sur un quiz multi-leçons de test (critère CDC §18-J7).

### J7-07 · Obsolescence et cycle de vie
- [ ] Quiz marqués `stale` quand une leçon source change ; bouton « Régénérer », jamais de suppression automatique
- [ ] Suppression d'une leçon : questions conservées avec `lesson_id = NULL` et mention « leçon supprimée »
- [ ] `deleteQuiz` avec confirmation

**DoD** : scénario « éditer une leçon puis constater le marquage » couvert par un test.

---

## 11. J8 — Paramètres et finitions

### J8-01 · Page Paramètres — profil et sécurité
- [ ] `/settings` : nom, e-mail (changement avec revérification)
- [ ] Changement de mot de passe (avec l'ancien)
- [ ] Liste des sessions actives avec « déconnecter » (par session et toutes)

**DoD** : la déconnexion d'une session la supprime immédiatement côté serveur.

### J8-02 · Apparence, langue et préférences de génération
- [ ] Thème clair/sombre/système, taille de police
- [ ] Langue de l'interface (`fr`/`en`) et langue de génération par défaut
- [ ] Préférences : nb de questions, difficulté, types, nb de flashcards, mode quiz par défaut (consommées par J6/J7)

**DoD** : les préférences pré-remplissent les formulaires de génération.

### J8-03 · Données personnelles
- [ ] `GET /api/me/export` : export JSON/ZIP des données de l'utilisateur
- [ ] Suppression de compte (confirmation forte, respect des FK), information RGPD sur la transmission du contenu aux providers LLM
- [ ] Mention dans les paramètres du choix du provider (local possible via Ollama)

**DoD** : export complet et suppression effective vérifiés en base.

### J8-04 · Accessibilité, responsive et états vides
- [ ] Audit axe-core (Playwright) sur les écrans clés : login, cours, éditeur, quiz, flashcards, admin
- [ ] Cible WCAG 2.1 AA : contraste, focus visible, navigation clavier, `prefers-reduced-motion`
- [ ] Parcours mobile validé (quiz et flashcards mobile d'abord) ; états vides et skeletons sur tous les listés

**DoD** : aucun problème axe critique ; parcours mobile signé.

### J8-05 · Finitions i18n et textes
- [ ] Passe complète fr/en sur tous les écrans créés depuis J0 ; aucun littéral en dur
- [ ] Relecture des messages d'erreur (compréhensibles, actionnables)

**DoD** : navigation complète dans les deux langues sans texte manquant.

---

## 12. J9 — Durcissement et recette

### J9-01 · Tests de sécurité
- [ ] Matrice IDOR complète (toutes les routes protégées)
- [ ] Uploads malveillants (zip bomb, MIME menteur, XXE, PDF chiffré, macros)
- [ ] Accès `/admin` par un `user`, accès d'un `revoked`, injection de prompt sur document piégé
- [ ] Rate limiting effectif sur login, register, upload, génération

**DoD** : checklist sécurité CDC §14 intégralement validée.

### J9-02 · En-têtes HTTP et transport
- [ ] CSP stricte, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS
- [ ] HTTPS obligatoire en production (reverse proxy Caddy/Nginx/Traefik, `client_max_body_size` aligné)

**DoD** : analyse d'en-têtes (observatory ou équivalent) sans problème majeur.

### J9-03 · Observabilité
- [ ] Logs structurés pino (corrélation job/requête), niveau `LOG_LEVEL`
- [ ] `/api/health` complet (DB, worker) ; métriques optionnelles : durées de conversion, taux de repli, échecs par provider

**DoD** : un incident simulé est localisable via les logs en moins de 5 min.

### J9-04 · Sauvegardes et restauration
- [ ] `scripts/backup.ts` : `VACUUM INTO` (ou API `backup()`) de `app.db` + copie de `uploads/`, rétention 14 j (décision D10)
- [ ] Planification (cron conteneur ou tâche externe) ; **procédure de restauration testée et documentée**

**DoD** : restauration complète à partir d'une sauvegarde vérifiée de bout en bout.

### J9-05 · Performances et fiabilité
- [ ] Mesures : conversion 50 pages < 2 min, révocation effective immédiate, reprise des jobs après crash
- [ ] Plafonds configurables (taille upload, concurrence jobs) testés

**DoD** : rapport de mesures archivé avec les objectifs du CDC §1 « Objectifs non fonctionnels ».

### J9-06 · Documentation d'exploitation et recette
- [ ] README d'exploitation : installation, variables d'environnement, migration, seed, sauvegarde/restauration, mise à jour
- [ ] Recette finale scénarisée (parcours utilisateur + parcours admin) signée
- [ ] DoD global du CDC §18 appliqué : code revu, tests verts, traductions fr/en, a11y vérifiée, migrations documentées, aucun secret en clair, audit alimenté

**DoD** : recette acceptée → v1 livrable.

---

## 13. Ordre de démarrage recommandé

```text
Semaine 1      J0-01 → J0-07           (fondations, CI, Docker)
Semaines 2–3   J1 → J2                 (auth, révocation — exigence clé)
Semaine 4      J3 + J5-00              (providers LLM + prototype de risque)
Semaine 5      J4                      (cours/leçons, éditeur)
Semaines 6–9   J5-01 → J5-12           (import/conversion — cœur du risque)
Semaines 10–11 J6 + début J7           (flashcards, quiz)
Semaine 12     J7 (fin)                (lecteur, correction serveur, résultats)
Semaine 13     J8                      (paramètres, a11y, export)
Semaines 14–15 J9                      (durcissement, recette)
```

**Règles d'ordonnancement**
- J3 précède J5 (la conversion a besoin de `lib/llm`).
- J5-00 (prototype) se lance dès la fin de J3, en parallèle de J4.
- J6 et J7 peuvent avancer en parallèle si l'équipe le permet (2–3 développeurs).
- Aucune étape n'est « terminée » tant que son DoD n'est pas vérifié.

---

## 14. Journal des décisions

| Date | ID | Décision | Justification / alternative rejetée |
|---|---|---|---|
| 2026-10-07 | — | Création du canevas à partir de `cdc.md` | — |
| 2026-10-07 | J0-01 | Next.js **16.4.0** + React **19.3.0**, gestionnaire de paquets **npm** | Satisfait « Next.js 15+ » du CDC §3 ; versions courantes proposées par `create-next-app` |
| 2026-10-07 | J0-01 | Dépôt git initialisé à la racine | Requis par Husky (hooks pre-commit) et par le versionnement des migrations et ADR |
| 2026-10-07 | J0-01 | Commandes pas encore implémentées → stub `scripts/pending.mjs` en échec explicite (exit 1) | Évite tout faux positif. `test`/`test:e2e` → J0-06 ; `db:migrate`/`db:studio` → J0-03 ; `seed:admin` → J1-02 ; `backup` → J9-04 |
| 2026-10-07 | J0-01 | Prettier : guillemets simples, virgules finales, largeur 100 ; `cdc.md` et `canevas.md` exclus du formatage | Évite la réécriture des documents de spécification |
| 2026-10-08 | J0-02 | shadcn/ui : preset **Nova (Lucide/Geist)**, primitives **Radix** (`radix-ui`), paquet `cn` | Conforme au CDC §3 (shadcn/ui + Radix) ; interface CLI 2026 (`-b radix -p nova`) |
| 2026-10-08 | J0-02 | « toast » du design system = composant **sonner** de shadcn | Composant `toast` historique déprécié par shadcn ; sonner est la voie recommandée |
| 2026-10-08 | J0-02 | Correction des versions `package.json` (lint-staged `^17.6.0`, prettier `^3.9.9`) | Versions écrites à la main en J0-01 inexistantes chez npm (`lint-staged@^16.4.3` → ETARGET), remplacées par les versions réellement installées |
| 2026-10-08 | J0-02 | Textes de l'UI en français en clair provisoirement | L'i18n (`next-intl`, fr/en) est l'étape J0-04 ; passe de finalisation J8-05 |
| 2026-10-08 | J0-02 | Shell installé dans le layout racine pour l'instant | Réorganisation en route groups `(app)`/`(auth)`/`(admin)` prévue à J0-05 |
| 2026-10-08 | J0-02 | `WorkingDialog` : dialogue modal **non fermable** pendant le travail, avec `progress` 0–100 (ou indéterminé si omis), `label` annoncé en `aria-live`, `onCancel` optionnel | Calé sur le contrat du job du CDC §5.2 (`progress`, `progress_label`, bouton d'annulation) ; interface ajustable sur demande |
| 2026-10-08 | J0-02 | Règle lint `react-hooks/set-state-in-effect` respectée (aucune suppression de règle) | Motif corrigé : `setState` de la démo reporté dans le callback du minuteur |
| 2026-10-08 | J0-03 | IDs TEXT en **UUID v7** via le paquet `uuid` (`newId()` dans `src/db/ids.ts`, fichier ajouté par rapport à §13) | Conforme aux conventions §5.2 ; UUIDv7 triable chronologiquement |
| 2026-10-08 | J0-03 | `@types/node` élevé de `^20` à `^24` | Conflit peer : `vitest@5` exige `^22 || >=24` ; aligné sur le runtime Node 24 (plutôt que `--legacy-peer-deps`) |
| 2026-10-08 | J0-03 | Timestamps avec défaut **SQL** `CAST(unixepoch('subsec') * 1000 AS INTEGER)` (helpers `src/db/schema/_shared.ts`) | Un `$defaultFn` Drizzle seul ne s'applique qu'aux inserts ORM : le SQL brut (tests, scripts) échouait en NOT NULL. Le défaut SQL couvre les deux chemins |
| 2026-10-08 | J0-03 | Vitest installé dès J0-03 et `npm test` réel | Exigé par le DoD de J0-03 (« les PRAGMA sont vérifiables dans un test ») ; J0-06 ajoutera couverture et intégration |
| 2026-10-08 | J0-03 | Scripts TS exécutés via `tsx` (`scripts/migrate.ts`) | Déterministe quelle que soit la résolution ESM/CJS ; réutilisé pour `seed:admin` (J1-02) et `backup` (J9-04) |
| 2026-10-08 | J0-03 | Scripts d'installation npm (npm 11 `allowScripts`) laissés **bloqués** | Les binaires préinstallés fonctionnent (better-sqlite3 v13, esbuild) ; mesure de sûreté supply-chain |
| 2026-10-08 | J0-03 | `sql` importé de `drizzle-orm` (et non `drizzle-orm/sqlite-core`) et artefacts de migration vérifiés explicitement | `drizzle-kit` crashait avec **exit 0** (`sql is not a function`) : un échec silencieux ne doit jamais passer pour un succès |
| 2026-10-08 | J0-04 | Routage i18n `localePrefix: 'as-needed'` : `/` = `fr` (défaut), `/en` = anglais ; **D8 actée : fr + en** | URLs propres pour la locale par défaut, conforme à « routes fr/en, défaut fr » |
| 2026-10-08 | J0-04 | Structure : segment `src/app/[locale]/` + layout racine conservé (html, polices, thème) | S'écarte d'un niveau de §13 (les groupes `(auth)`/`(app)`/`(admin)` de J0-05 se poseront sous `[locale]`, `api/` reste hors locale) |
| 2026-10-08 | J0-04 | `export const instant = false` sur les deux layouts | Next 16 Cache Components : toute la lira de données à la requête (locale, puis auth) ; les segments sont explicitement « allowed to block » au lieu de masquer l'erreur par du Suspense artificiel |
| 2026-10-08 | J0-04 | Règle `react/jsx-no-literals` en erreur sur `src/**` hors `src/components/ui/**` | Interdit les littéraux de texte dans nos composants ; `ui/` = code vendor shadcn régénérable |
| 2026-10-08 | J0-04 | Typage explicite des `params` des layouts (au lieu de `LayoutProps<'/[locale]'>`) | Le typegen de routes rejetait le segment dynamique ; typage explicite stable |
| 2026-10-08 | J0-04 | Dette : `sr-only` « Close » dans `src/components/ui/dialog.tsx` (vendor) non traduit | Évite d'éditer le code régénérable ; à traiter en J8-05 (passe a11y/i18n) |
| 2026-10-08 | J0-05 | Garde d'accès implémentée dans **`src/proxy.ts`** (ex-`middleware.ts`) | Next 16.4 signale `middleware.ts` comme déprécié (« use proxy ») : même contrat, simple renommage de convention |
| 2026-10-08 | J0-05 | Garde **par défaut refus** : routes publiques limitées à `/login` et `/register` ; double garde serveur dans les layouts `(app)`/`(admin)` | Application privée (CDC §6.2) ; le proxy ne fait qu'un pré-contrôle de cookie, l'autorisation réelle reste dans la DAL (`requireUser`/`requireAdmin`, J1-04) |
| 2026-10-08 | J0-05 | Cookie de session provisoire **`app_session`** (`src/lib/security/session-cookie.ts`, module sans dépendance) | Constante partagée proxy/pages, importable depuis le proxy ; nom réel fixé par la librairie d'auth en J1-01 |
| 2026-10-08 | J0-05 | Shell applicatif porté par les layouts `(app)` et `(admin)` ; `(auth)` sans shell (colonne centrée) | Réorganisation annoncée en J0-02 ; `api/` reste hors `[locale]` ; `/(admin)/admin/page.tsx` pour `/admin` (les route groups n'ajoutent pas de segment d'URL) |
| 2026-10-08 | J0-05 | Vitrine du design system (J0-02) remplacée par le tableau de bord minimal de `/` ; clés `home.*` de démo retirées des messages (52 clés fr/en) | Annoncé dès J0-02 (« remplacée à J0-05 ») ; la vitrine a servi au DoD de J0-02 |
| 2026-10-08 | J0-05 | En-têtes de sécurité dans `headers()` de `next.config.ts`, CSP en **report-only** | Appliqués à toutes les routes ; durcissement CSP/HSTS/HTTPS en J9-02 |
| 2026-10-08 | J0-06 | `@playwright/test` 1.64 + Chromium installés explicitement (`npx playwright install chromium`) ; install-scripts npm toujours bloqués | Posture supply-chain de J0-03 ; le CLI installe le navigateur à la demande |
| 2026-10-08 | J0-06 | Locale explicite `fr-FR` dans `playwright.config.ts` ; test fumée autonome (`webServer` = `npm run build && npm run start`, serveur existant réutilisé hors CI) | Playwright parle `en-US` : next-intl négocie sinon `/en/*` et les assertions FR échouent (1er run en échec sur ce motif) |
| 2026-10-08 | J0-06 | `output: 'standalone'` activé ; `npm start` = `next start` en local (avertissement Next = simple `warn`, fonctionnel vérifié : pages + assets 200), Docker = `node server.js` sur `.next/standalone` | Source Next consultée : seul `output: 'export'` lève une erreur ; conformité §17 pour l'image |
| 2026-10-08 | J0-06 | `drizzle/` copié explicitement dans le stage runner du Dockerfile | `migrateOnce()` lit `drizzle/` en chemin runtime (`process.cwd()`), hors file-tracing Next : absent sans cette copie |
| 2026-10-08 | J0-06 | `docker-compose.yml` : volumes **nommés** `app-data`/`app-uploads` | Propriété uid correcte pour l'utilisateur non-root de l'image, persistants sur recréation (bind mounts `./data` rejetés : problèmes de permissions) |
| 2026-10-08 | J0-06 | CI GitHub Actions en 4 jobs **parallèles** (lint, typecheck, tests+couverture, build), Node 24 | Lecture de « (parallélisé) » du canevas ; sans remote Git, les mêmes commandes ont été vérifiées vertes en local |
| 2026-10-08 | J0-06 | Couverture v8 (`text`/`lcov`/`html`) sur `src/**` hors `src/components/ui/**`, sans seuil global | Les seuils 80 % sont par module (CDC §16 : `lib/convert`, `lib/generate`, `lib/auth`) et arriveront aux jalons concernés |
| 2026-10-08 | J0-07 | Dossier `src/lib/logging/` ajouté par rapport à §13 (`request-id.ts` pur + `logger.ts` pino) | Même écart assumé que `src/db/ids.ts` : le logger est transverse ; `request-id.ts` sans dépendance reste importable depuis `src/proxy.ts` |
| 2026-10-08 | J0-07 | Corrélation par `x-request-id` : généré ou repris par le proxy, propagé via `NextResponse.next({ request: { headers } })`, ré-émis sur chaque réponse ; `getRequestId()` stable par requête (React `cache`) | Mécanisme documenté par Next ; matcher du proxy élargi à `/api` **pour la seule corrélation** (l'API reste sans garde ni i18n — décision J0-05 maintenue) |
| 2026-10-08 | J0-07 | Code `INTERNAL_ERROR` ajouté aux 8 codes stables du CDC §12 | Aucun code du §12 ne couvre l'erreur inattendue ; réponse générique sans fuite de détail (testée), le détail part dans les logs |
| 2026-10-08 | J0-07 | `/api/*` inconnu → `NOT_FOUND` normalisé via route attrape-tout `src/app/api/[...missing]/route.ts` | « Gestionnaire d'erreur global » : toutes les réponses API suivent le format §12, y compris les 404 |
| 2026-10-08 | J0-07 | `GET /api/health` : `{ status, db }` minimal ; 503 `{"status":"error","db":"down"}` sur échec DB | Pas de schéma imposé au CDC (§15 : « DB accessible ») ; `worker` ajouté en J5-01 |
| 2026-10-08 | J0-07 | pino en JSON sur stdout, niveau `LOG_LEVEL` | Conforme §15/§17, sortie collectable en conteneur ; logs de requête complets en J9-03 |
| 2026-10-08 | J1-01 | **D2 actée : sessions maison** (argon2id `@node-rs/argon2` + table `sessions` §5.2) — Better Auth et Auth.js v5 écartés | Le schéma `users`/`sessions` du CDC §5.2 est déjà en place (ID haché, `status`, `revoked_*`, `preferences`) : un framework imposerait son propre schéma ou un double modèle ; la révocation immédiate §6.2 est un code métier maison dans tous les cas |
| 2026-10-08 | J1-01 | Politique de mot de passe : **≥ 12 caractères** (borne haute 128) | Le CDC §14.1 fait foi sur le « ≥ 8 » du canevas ; la borne haute borne le coût argon2 sur entrée hostile |
| 2026-10-08 | J1-01 | ID de session = **SHA-256 du jeton** (jeton brut 32 octets `base64url` dans le cookie) | « ID haché » du CDC §5.2 : une fuite de la table `sessions` n'offre pas d'usurpation ; lookup déterministe par hash du jeton présenté |
| 2026-10-08 | J1-01 | Cookie `app_session` confirmé en nom définitif ; options `HttpOnly`, `Secure` (production), `SameSite=Lax`, TTL 7 j | Nom provisoire de J0-05 conservé (zéro churn) ; `Secure` neutralisé en dev http://localhost ; glissement 7 j / 30 j max en J1-05 |
| 2026-10-08 | J1-01 | Rotation à la connexion = révocation du jeton précédent + émission d'un jeton neuf ; **les sessions des autres appareils sont conservées** | Anti-fixation de session (OWASP) ; la liste des sessions actives (J8-01) implique un modèle multi-sessions |
| 2026-10-08 | J1-01 | `@node-rs/argon2` (argon2id par défaut, vérifié par le préfixe `$argon2id$`) | Binaires napi précompilés, compatibles avec les install-scripts npm bloqués (posture J0-03) |
| 2026-10-08 | J1-02 | Table `users` déjà conforme §5.2 depuis J0-03 : aucune colonne ajoutée ; contrainte **`users_email_lower`** (CHECK `email = lower(email)`, migration `0001_first_reptil`) + `normalizeEmail()` chez les écrivains | Bullet « email normalisé en minuscules et unique » : le CHECK fait respecter la normalisation par la base elle-même (l'UNIQUE existait déjà) |
| 2026-10-08 | J1-02 | Seed admin **idempotent sans modification** : un compte existant n'est jamais touché (mot de passe non réinitialisé) ; email existant avec rôle non-admin → refus explicite (exit 1), pas de promotion silencieuse | DoD « rejouable sans erreur » ; une promotion relève de `/admin/users` (J2-03), avec audit |
| 2026-10-08 | J1-02 | `.env` lu par `process.loadEnvFile()` (API native Node ≥ 21.7) | Zéro dépendance dotenv ; le runtime Node 24 du projet le couvre |
| 2026-10-08 | J1-02 | Logique de seed dans `src/lib/auth/seed-admin.ts` (testable), `scripts/seed-admin.ts` = CLI fine | La DoD se vérifie par les deux chemins : tests unitaires + exécution réelle du script |
| 2026-10-08 | J1-03 | **D1 actée : `approval`** (compte `pending` à activer), lu dans `app_settings.registration_mode` (`open`\|`approval`\|`closed`) | Valeur par défaut proposée au canevas, modifiable à l'exécution ; `open` et `closed` testés en E2E |
| 2026-10-08 | J1-03 | Connexion : refus **neutre** unique (« Identifiants invalides. ») pour mauvais mot de passe, compte `pending`/`revoked` et compte inconnu, avec **hash factice** égalisant le temps de réponse | CDC §6.1 « message neutre » : aucune énumération de comptes ni par la réponse ni par le timing |
| 2026-10-08 | J1-03 | Inscription : `email_taken` explicite (l'existence du compte est révélée) | UX standard des formulaires d'inscription ; le canal sensible (connexion) reste neutre |
| 2026-10-08 | J1-03 | E2E sur base dédiée `data/e2e.db` (`env.DATABASE_PATH` du webServer Playwright) + `fullyParallel: false` | Les specs partagent des paramètres globaux (`registration_mode`) : courses entre tests constatées à la 1re exécution, corrigées par la sérialisation intra-fichier |
| 2026-10-08 | J1-03 | Server Actions `register`/`login`/`logout` (`src/lib/auth/actions.ts`, table §12) + formulaires React 19 (`useActionState`) ; codes d'erreur traduits côté client (`auth.errors.*`) | Aucun littéral serveur dans l'UI (règle `react/jsx-no-literals`) ; les messages sont par code, pas par phrase |
| 2026-10-08 | J1-03 | `?next=` anti open-redirect (chemins locaux uniquement) ; `redirectLocalized` typé `never` | Le `redirect` de next-intl n'est pas typé `never` (TS2366) : wrapper explicite |
| 2026-10-08 | J1-03 | Validation Zod des formulaires : `emailSchema`, `passwordSchema` (12–128), `nameSchema` (≤ 100) | Bullet « Validation Zod de tous les formulaires » ; messages traduits par code en fr/en |
| 2026-10-08 | J1-04 | DAL unique **`src/db/queries/`** (users, sessions, app-settings, health) : tout le SQL métier passe par ces fonctions ; `accounts.ts`, `seed-admin.ts`, `/api/health` migrés | Règle « aucun accès DB hors DAL » de la tâche ; requêtes préparées centralisées, testables et auditables (J2-01 y branchera l'audit) |
| 2026-10-08 | J1-04 | Cœur de garde **`loadSessionUser(token, db?)`** pur/testable dans `session.ts` ; `requireUser`/`requireAdmin` isolés dans `src/lib/auth/guards.ts` (couche redirection séparée) ; `light-guard.ts` supprimé | Hérite de la séparation de couches J1-01 (le service sessions ne dépend pas de la redirection UI) ; le cœur est testable sans Next (`next/headers` mocké dans les tests de garde) |
| 2026-10-08 | J1-04 | Vérification **sans cache** : session **et** statut relus en base à chaque requête ; statut non-actif → **purge de la session** + refus (`?reason=revoked` si `revoked`) | Condition de la révocation immédiate (CDC §6.2) ; défense en profondeur : la transaction de révocation J2-04 supprimera aussi les lignes, mais aucune session ne survit de fait à la perte du statut `active` |
| 2026-10-08 | J1-04 | **`await connection()`** au sommet de `requireUser()` | Next 16 (Cache Components + Instant Navigations) signalait le `Date.now()` de l'expiration de session comme « unstable value » à chaque rendu protégé (erreur sur stderr, tests pourtant verts) : `connection()` marque le rendu comme lié à la requête — correction documentée pour une valeur par requête ; alternative « now côté SQL » écartée (masque la logique métier dans la requête) |
| 2026-10-08 | J1-04 | E2E : sessions **réelles** créées en base (`tests/e2e/helpers/session.ts`, ID = SHA-256 du jeton) ; le cookie factice `app_session=e2e` est abandonné | La garde valide désormais le jeton en base : un cookie factice serait refusé ; le helper épouse exactement le contrat de `session.ts` (y compris pour tester `/admin` avec un rôle) |
| 2026-10-08 | J1-05 | Rate limiting sur **table SQLite** `rate_limit_hits` (migration `0002_reflective_lady_mastermind`) + `src/lib/security/rate-limit.ts` (§13) : fenêtre glissante 60 s, **seuil 10 tentatives (la 10ᵉ est refusée)**, périmètres **IP et compte cumulatifs**, enforcé dans `loginUser`/`registerUser` avant argon2 | Choix « table SQLite ou mémoire » du CDC : la table survit aux redémarrages et reste testable depuis les specs ; seuil calé sur la DoD (« 10 tentatives en 1 min → 429 ») ; mêmes primitives pour l'upload et la génération (J3/J5) |
| 2026-10-08 | J1-05 | Compteur du **compte** effacé après une connexion réussie (celui de l'IP conserve) | Un utilisateur légitime qui corrige son mot de passe ne s'accumule pas de blocage ; l'IP reste la digue contre le spray de mots de passe |
| 2026-10-08 | J1-05 | « 429 RATE_LIMITED » : contrat §12 via `ApiError('RATE_LIMITED')` → 429 (Route Handlers mutants) ; côté **Server Action**, le code est porté par l'état du formulaire (`auth.errors.rate_limited`) | Les Server Actions ne peuvent pas fixer le code HTTP de la réponse (200 + résultat sérialisé) ; la sémantique reste identique et le contrat API est testé |
| 2026-10-08 | J1-05 | CSRF : `assertSameOrigin()` (`src/lib/security/csrf.ts`) **strict** (`Origin` cohérent avec `Host`/`X-Forwarded-Host`, sinon `Sec-Fetch-Site: same-origin`/`none`) pour les futurs Route Handlers mutants ; Server Actions couvertes par la vérification d'origine **native** de Next.js | CDC §14.1 ; aucun handler mutant n'existe aujourd'hui (J5 upload, J3 jobs) : le helper + ses tests posent la règle, un client sans en-tête d'origine (curl) est refusé — défense contre un POST cross-site sans jeton |
| 2026-10-08 | J1-05 | Glissement « 7 j / 30 j max » porté par la **session en base** : chaque vérification repousse `expires_at` à `min(now + 7 j, created_at + 30 j)` (au plus une écriture/jour) ; cookie plafonné au **plafond absolu (30 j)** | Le cookie ne peut pas être rallongé depuis un Server Component (cookies().set interdit hors Action/Route Handler) : le cookie porte le plafond, la base porte le glissement — seul juge de la validité (révocation §6.2). La session meurt au plus tard 30 j après sa création (testé) |
| 2026-10-08 | J1-05 | Audit minimal via **pino** (tag `audit: true`) : `user.login` (acteur, IP) et `user.login_failed` (IP + e-mail) ; table `audit_logs` et helper `audit(...)` restent à J2-01 | Le canevas prévoit la table en J2-01 (case conservée) ; minimisation §14.6 — l'e-mail n'est journalisé que sur échec (investigation du spray), jamais le mot de passe ; la bascule vers la table ne changera pas la signature `auditEvent` |
| 2026-10-08 | J1-05 | `LOG_LEVEL=silent` dans l'environnement Vitest (`vitest.config.ts`) | Les appels d'auth émettent des événements d'audit : sortis en silencieux pour garder la sortie des tests lisible (le logger reste testé avec mock) |

---

## 15. Journal des mises à jour

| Date | Étape(s) | Changement dans ce document | Fait par |
|---|---|---|---|
| 2026-10-07 | — | Création initiale du canevas (J0 → J9, 72 étapes dont J5-00) | Buffy |
| 2026-10-07 | J0-01 | Étape terminée et cochée : scaffolding Next.js 16.4.0 (App Router, TS strict, Tailwind, ESLint, `src/`), Prettier + Husky + lint-staged, scripts npm, arborescence §13 (30 dossiers documentés). DoD vert (lint, typecheck, build). 4 décisions ajoutées. | Buffy |
| 2026-10-08 | J0-02 | Étape terminée et cochée : shadcn/ui (preset Nova, Radix) avec `progress` en plus des 9 composants, thème clair/sombre (`next-themes` + `ThemeToggle`), shell responsive (`AppShell` : sidebar desktop, header + bottom-nav mobile), transverses `EmptyState`/`PageHeader`/`ConfirmDialog`/`StatusBadge`/`WorkingDialog` (ce dernier ajouté au canevas en cours d'étape), page « hello » vitrine avec démo de progression. DoD vert (lint, typecheck, build, smoke test HTTP sur build à jour). 7 décisions ajoutées (dont correction de versions J0-01 et correctif lint). | Buffy |
| 2026-10-08 | J0-03 | Étape terminée et cochée : client SQLite (`src/db/client.ts`, PRAGMA §5.3), schéma `users`/`sessions`/`app_settings` + `_shared.ts` (timestamps epoch ms à défaut SQL), `newId()` UUID v7, migration `drizzle/0000_crazy_proteus.sql` versionnée, `migrateOnce()` avec verrou fichier branché sur `instrumentation.ts`, scripts `db:migrate`/`db:studio`/`db:generate`/`test` réels. DoD vert : base créée depuis zéro + Vitest 5/5 + lint/typecheck/build. 7 décisions ajoutées. | Buffy |
| 2026-10-08 | J0-04 | Étape terminée et cochée : `next-intl` (routing `as-needed` fr/en, `src/i18n/*`, middleware), messages `fr.json`/`en.json` structurés par domaine (97 clés, parité vérifiée), textes des composants et de la page vitrine externalisés, `LanguageSwitcher`, règle `react/jsx-no-literals` active. DoD vert : bascule fr/en vérifiée sur `/` et `/en` (sans fuite), lint/typecheck/tests/build. 6 décisions ajoutées (dont `instant = false` Cache Components). | Buffy |
| 2026-10-08 | J0-05 | Étape terminée et cochée : route groups `(auth)`/`(app)`/`(admin)` déplacés sous `[locale]/` avec layouts dédiés (shell pour `(app)`/`(admin)`, page publique centrée pour `(auth)`), garde d'accès légère en double (`src/proxy.ts` sur la présence du cookie + layouts), page `/` protégée minimaliste remplaçant la vitrine, `src/lib/security/headers.ts` branché dans `next.config.ts`. DoD vert : redirections `/login?next=…` fr/en, navigation entre groupes cohérente (shell absent de `/login`), aucun code d'autorisation dans le proxy, en-têtes présents, lint/typecheck/tests 5/5/build + smoke test sur build frais. 6 décisions ajoutées (dont migration `middleware.ts` → `proxy.ts`). | Buffy |
| 2026-10-08 | J0-06 | Étape **implémentée** ; DoD marquée `[!]` (motif : pas de remote Git pour exécuter la CI, Docker absent du poste) : Vitest + couverture v8 (`test:coverage`, `tests/unit` + `tests/integration`), Playwright (`tests/e2e/smoke.spec.ts`, `test:e2e` réel), CI `.github/workflows/ci.yml` (4 jobs parallèles), `Dockerfile` multi-étapes `node:22-slim` + `output: 'standalone'`, `docker-compose.yml` (volumes `/app/data` et `/app/uploads`), `.env.example` §17, `.dockerignore`, artefacts Playwright ignorés par ESLint/git. Vérifié localement : format:check/lint/typecheck/tests 5/5/couverture/build verts, test:e2e vert, YAML validés. 7 décisions ajoutées. | Buffy |
| 2026-10-08 | J0-07 | Étape terminée et cochée : logger pino structuré (`src/lib/logging/`) avec corrélation `x-request-id` de bout en bout (proxy → route → réponse → log), `GET /api/health` (JSON + vérification DB), gestionnaire d'erreur global (`withApi`, route attrape-tout `/api/*`, format `{ error: { code, message } }` du §12). DoD vert : appel en erreur normalisé (`/api/unknown` → 404 `NOT_FOUND`) et `/api/health` en JSON, corrélation prouvée (echo `x-request-id`, `reqId` identique à l'en-tête de réponse). 10 tests unitaires (5 nouveaux), lint/typecheck/build/test:e2e verts. 6 décisions ajoutées. | Buffy |
| 2026-10-08 | J1-01 | Étape terminée et cochée : **D2 actée (sessions maison)**, `src/lib/auth/hash.ts` (argon2id + politique ≥ 12), `src/lib/auth/session.ts` (sessions §5.2 : ID haché SHA-256, `expires_at`, `ip`, `user_agent`, rotation à la connexion, révocation), options de cookie §14.1 ; garde légère J0-05 déplacée dans `src/lib/auth/light-guard.ts` (séparation des couches : le service sessions ne doit pas dépendre de la redirection UI, bloquante pour les tests Vitest). DoD verte : hash/vérif en test, aucune session sans base. 20 tests (10 nouveaux), lint/typecheck/build/test:e2e verts. D2 cochée en §1 (D8 aussi, restée en souffrance), 6 décisions ajoutées. | Buffy |
| 2026-10-08 | J1-02 | Étape terminée et cochée : contrainte email minuscules (`CHECK users_email_lower`, migration `0001_first_reptil` inspectée), `normalizeEmail`, seed admin idempotent (`src/lib/auth/seed-admin.ts` + `scripts/seed-admin.ts`, script `npm run seed:admin` réel). DoD verte : seed exécuté 2× sans erreur (« créé » puis « inchangé »), exit 1 explicites sur conflit de rôle et variables manquantes. 26 tests (6 nouveaux), lint/typecheck/build verts. 4 décisions ajoutées. | Buffy |
| 2026-10-08 | J1-03 | Étape terminée et cochée : inscription/connexion/déconnexion (Server Actions `register`/`login`/`logout`, formulaires `useActionState`, `?reason=revoked`, `?next=` anti open-redirect, bouton « Se déconnecter » dans le shell), modes `registration_mode` (D1 actée : `approval` par défaut), refus neutre des comptes non-actifs avec égalisation de timing, validation Zod (email/mot de passe/nom) et messages fr/en par code. **DoD verte en E2E (5/5)** : parcours complet inscription → connexion → déconnexion + compte `pending` refusé. 36 tests unitaires (10 nouveaux), lint/typecheck/build verts. 7 décisions ajoutées. | Buffy |
| 2026-10-08 | J1-04 | Étape terminée et cochée : DAL unique `src/db/queries/` (users/sessions/app-settings/health) avec migration des 13 sites SQL restants, `loadSessionUser` (session + statut relus à chaque requête, purge si non-actif), gardes `requireUser()`/`requireAdmin()` branchées sur les layouts `(app)`/`(admin)` (`light-guard.ts` supprimé), helpers `src/lib/i18n/redirect.ts` partagés. **DoD verte** : test d'intégration révocation immédiate (statut `revoked` en base → refus à la requête suivante + session purgée ; `/admin` refusé à un user). 44 tests unitaires (8 nouveaux), E2E 6/6 (smoke adapté aux sessions réelles, jeton inconnu refusé), lint/typecheck/build verts. Correctif `await connection()` (« unstable value » Next 16) acté. 5 décisions ajoutées. | Buffy |
| 2026-10-08 | J1-05 | Étape terminée et cochée : rate limiting par fenêtre glissante (`src/lib/security/rate-limit.ts` + table `rate_limit_hits`, migration `0002`), périmètres IP et compte sur `/login` et `/register` (seuil 10/60 s, la 10ᵉ refusée), CSRF (`assertSameOrigin` strict pour les Route Handlers mutants, Server Actions couvertes par Next), cookies §14.1 (flags vérifiés sur cookie réel, glissement 7 j / 30 j max porté par la session en base), audit minimal pino (`user.login`, `user.login_failed`). **DoD verte** : E2E « 10 tentatives de connexion en 1 min → blocage » + contrat `429 RATE_LIMITED` (§12) testé ; aucun cookie non sécurisé émis (E2E sur cookie réel). 68 tests unitaires (24 nouveaux), E2E 7/7, lint/typecheck/build verts, parité i18n 76/76. 8 décisions ajoutées. | Buffy |

> **Rituel de mise à jour** : à chaque fin d'étape, cocher les tâches et le DoD, mettre à jour le compteur d'avancement du jalon (§2), et ajouter une ligne au journal ci-dessus.
