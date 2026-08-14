# Tasks: Gestion des prestations

**Input**: Design documents from `/specs/003-services-management/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: La spécification exige pgTAP, `node:test`, Playwright, des contrôles responsive/accessibilité et les gates du dépôt. Dans chaque histoire, écrire les tests et constater leur échec attendu avant l'implémentation.

**Organization**: Les tâches sont regroupées par histoire utilisateur afin que chaque incrément puisse être implémenté, vérifié et livré dans l'ordre de priorité.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: exécutable en parallèle avec les autres tâches marquées, car les fichiers sont distincts et aucune dépendance inachevée ne les bloque ;
- **[Story]**: histoire utilisateur couverte (`US1` à `US5`) ;
- chaque tâche mentionne le ou les chemins exacts qu'elle crée ou modifie.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Préparer le runtime, les fixtures et la découverte des nouvelles suites sans altérer les tests Auth existants.

- [x] T001 Activer Node.js 22 et vérifier que le runtime satisfait les déclarations de `.nvmrc` et `package.json` avant d'interpréter tout échec de build ou de test
- [x] T002 [P] Capturer les huit prestations, les trois sections, leurs métadonnées visuelles et les CTA actuels dans `tests/services-management/fixtures.ts` à partir de `app/(public)/services/page.tsx`
- [x] T003 [P] Créer les helpers Supabase locaux et écrire les tests rouges du garde de scénarios immuables, loopback-only et refusés sur Netlify dans `tests/services-management/local-supabase.ts` et `tests/unit/services/e2e-scenario.test.ts`
- [x] T004 Implémenter l'adaptateur `server-only` à scénario fixe par processus, documenter sa variable vide réservée au runner, créer le runner séquentiel de serveurs construits, puis élargir la découverte Playwright Auth/Services et les scripts ciblés dans `lib/services/e2e-scenario.ts`, `.env.example`, `scripts/run-services-scenario-tests.mjs`, `playwright.config.ts` et `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Livrer le schéma exact, la matrice RLS, les types partagés, les erreurs sûres et le modèle Cache Components requis par toutes les histoires.

**⚠️ CRITICAL**: Aucune histoire utilisateur ne commence avant la réussite de cette phase.

- [x] T005 Écrire d'abord les tests pgTAP rouges de la migration, des bornes/échelle de prix, des huit UUID et contenus, des ordres dupliqués et de la matrice anon/non-admin/admin/session retirée dans `supabase/tests/database/08_services_management.sql`
- [x] T006 Exécuter `npx supabase migration new services_management`, puis implémenter sans upsert la conversion vers `numeric`, les contraintes nommées, les politiques SELECT consolidées et les huit lignes déterministes dans `supabase/migrations/<cli-timestamp>_services_management.sql`
- [x] T007 Ajouter `supabase/tests/database/08_services_management.sql` à `supabase:test:db`, exécuter le reset local, puis régénérer et contrôler les types dans `package.json` et `lib/supabase/database.types.ts`
- [x] T008 Synchroniser la représentation `numeric` bornée et limitée à deux décimales avec la migration dans `doc/spec.md`, `doc/architecture.md` et `specs/001-supabase-foundation/data-model.md`
- [x] T009 [P] Centraliser pour chaque catégorie le code, le rang, `adminLabel` et `publicLabel` exact, puis les types de prix, le tag `prestations` et les modèles `PublicService`, `AdminService` et états d'action dans `lib/services/constants.ts` et `lib/services/types.ts`
- [x] T010 [P] Écrire les tests rouges imposant des diagnostics expurgés et des catégories d'erreur stables dans `tests/unit/services/diagnostics.test.ts`
- [x] T011 Implémenter la classification validation/session/indisponibilité/not_found/interne et les identifiants de corrélation sans donnée fournisseur dans `lib/services/errors.ts` et `lib/services/diagnostics.ts`
- [x] T012 Activer `cacheComponents`, remplacer les deux exports `dynamic = "force-dynamic"` par `instant = false` et préserver les réponses admin privées dans `next.config.ts`, `app/(admin)/admin/connexion/page.tsx` et `app/(admin)/admin/(protected)/layout.tsx`
- [x] T013 Exécuter le reset, pgTAP, lint et advisors locaux puis corriger toute régression liée aux prestations dans `supabase/migrations/<cli-timestamp>_services_management.sql` et `supabase/tests/database/08_services_management.sql`

**Checkpoint**: Le schéma local contient exactement les huit prestations, les prix trop précis sont refusés sans arrondi, la matrice RLS réussit et le socle Next.js accepte Cache Components.

---

## Phase 3: User Story 1 - Consulter et organiser le catalogue administratif (Priority: P1)

**Goal**: Donner à l'administrateur un premier incrément de consultation avec une entrée « Prestations » réelle et une liste privée, déterministe et responsive de toutes les lignes actives ou masquées, sans commande de mutation non fonctionnelle.

**Independent Test**: Avec des prestations actives et masquées dans les trois catégories, un administrateur voit chaque ligne une seule fois avec nom, catégorie, ordre et statut textuel ; un visiteur est redirigé, un catalogue vide est expliqué sans CTA cassé et une panne n'est jamais présentée comme un état vide.

### Tests for User Story 1

- [x] T014 [P] [US1] Écrire les tests unitaires rouges du rang de catégorie et du tri déterministe `ordre_affichage`, `created_at`, `id` dans `tests/unit/services/mappers.test.ts`
- [x] T015 [P] [US1] Écrire les tests Playwright rouges d'accès admin, liste active/masquée, ordre stable, état vide sans commande indisponible et navigation Prestations dans `tests/services-management/access.spec.ts`
- [x] T016 [P] [US1] Écrire les tests Playwright rouges distinguant chargement, panne récupérable déterministe via le runner local, session expirée et liste vide dans `tests/services-management/error-states.spec.ts`

### Implementation for User Story 1

- [x] T017 [US1] Implémenter les mappers de lignes Supabase et les lectures admin explicites non cachées `getAdminServices()` après garde serveur, en appliquant `admin-empty`/`admin-unavailable` uniquement depuis l'adaptateur local validé dans `lib/services/mappers.ts`, `lib/services/e2e-scenario.ts` et `lib/data/services.ts`
- [x] T018 [P] [US1] Implémenter comme Server Component la liste sémantique unique, ses `adminLabel`, ordre, badge et statuts textuels dans `app/(admin)/admin/(protected)/prestations/_components/service-list.tsx`
- [x] T019 [US1] Créer la page serveur autorisée `/admin/prestations`, son loading et son Client Error Boundary `error.tsx` avec `"use client"`, retry et distinction panne/vide sans CTA cassé dans `app/(admin)/admin/(protected)/prestations/page.tsx`, `app/(admin)/admin/(protected)/prestations/loading.tsx` et `app/(admin)/admin/(protected)/prestations/error.tsx`
- [x] T020 [US1] Ajouter les liens fonctionnels Dashboard/Prestations au shell et remplacer le faux texte d'attente par la carte Prestations sans ajouter Galerie dans `app/(admin)/admin/(protected)/layout.tsx` et `app/(admin)/admin/(protected)/page.tsx`
- [x] T021 [US1] Appliquer les tokens, la grille desktop, les cartes sous 760 px, les retours à la ligne, cibles 44 px et focus `--gold` de `doc/design.md` dans `app/globals.css`
- [x] T022 [US1] Mettre à jour uniquement l'assertion devenue obsolète sur l'absence de Prestations tout en conservant l'interdiction du faux lien Galerie dans `tests/admin-auth/login.spec.ts`

**Checkpoint**: US1 fonctionne seule comme incrément administratif en lecture, sans exposer de contenu masqué, mettre l'autorisation en cache ou prétendre constituer le MVP fonctionnel complet.

---

## Phase 4: User Story 2 - Créer une prestation publiable (Priority: P2)

**Goal**: Permettre la création unique d'une prestation valide pour chacun des trois types de prix, avec conservation des valeurs, erreurs liées aux champs et état pending accessible.

**Independent Test**: Créer une prestation fixe, « À partir de » et « Sur devis » ; vérifier les valeurs persistées, les valeurs par défaut actif/ordre zéro, une seule ligne après double activation UI et aucune mutation après saisie invalide ou refus d'autorisation, sans dépendre du rendu public.

### Tests for User Story 2

- [x] T023 [P] [US2] Écrire sans substitution les 28 cas canoniques numérotés de `contracts/verification.md`, puis les cas supplémentaires trim, séparateurs ambigus, durée non entière, montant tarifé absent et valeurs par défaut dans `tests/unit/services/validation.test.ts` et `tests/unit/services/price.test.ts`
- [x] T024 [P] [US2] Écrire les tests unitaires rouges du pipeline create, de l'arrêt avant mutation, du payload autorisé, de l'ID retourné et de `updateTag` après succès seulement dans `tests/unit/services/actions.test.ts`
- [x] T025 [P] [US2] Écrire les parcours Playwright rouges de création fixed/starting_at/quote, CTA fonctionnel depuis l'état vide, valeurs conservées, erreurs ARIA, POST retardé avec `page.route()`, pending sous une seconde et double activation sans doublon dans `tests/services-management/crud.spec.ts`

### Implementation for User Story 2

- [x] T026 [P] [US2] Implémenter normalisation décimale française, conversion exacte en cents, formatage canonique `45 €`/`45,50 €`/« À partir de 45,50 € »/« Sur devis » et schéma Zod discriminé de création dans `lib/services/price.ts` et `lib/validations/service.ts`
- [x] T027 [US2] Implémenter avec dépendances injectées le cœur testable autorisation → validation → mutation → ligne affectée → invalidation et la construction des états récupérables dans `lib/services/action-core.ts`
- [x] T028 [US2] Implémenter `createServiceAction` avec `requireAdminAction()`, colonnes autorisées, RLS, ID retourné et `updateTag("prestations")` après succès dans `app/(admin)/admin/(protected)/prestations/_actions/service-actions.ts`
- [x] T029 [US2] Créer le Client Component de formulaire avec groupes, labels visibles, type de prix conditionnel, valeurs conservées, erreurs reliées, pending et soumission unique dans `app/(admin)/admin/(protected)/prestations/_components/service-form.tsx`
- [x] T030 [US2] Créer la page serveur autorisée `/admin/prestations/nouvelle`, brancher le CTA fonctionnel de l'état vide, le retour annuler et l'annonce de succès après création confirmée dans `app/(admin)/admin/(protected)/prestations/nouvelle/page.tsx` et `app/(admin)/admin/(protected)/prestations/page.tsx`
- [x] T031 [US2] Styliser les groupes, champs, aides, erreurs et états pending/succès du formulaire selon `doc/design.md` aux breakpoints 320/768/1024 dans `app/globals.css`

**Checkpoint**: US2 crée exactement une ligne valide sans faire confiance au client, et tous ses échecs restent corrigibles sans faux succès.

---

## Phase 5: User Story 3 - Modifier, classer et masquer une prestation (Priority: P3)

**Goal**: Modifier les neuf champs administrables d'une même prestation, accepter les ordres dupliqués et masquer/réactiver explicitement sans créer de doublon.

**Independent Test**: Modifier chaque champ d'une ligne, lui attribuer un ordre déjà utilisé, la masquer puis la réactiver ; vérifier le même UUID, les valeurs persistées, les statuts admin, l'éligibilité RLS active/masquée, l'invalidation du tag et le refus de sauvegarde après retrait de session ou rôle, sans dépendre du rendu public.

### Tests for User Story 3

- [x] T032 [P] [US3] Étendre les tests rouges des actions avec update, zéro ligne `not_found`, visibilité explicite, session/rôle retiré et invalidation post-succès dans `tests/unit/services/actions.test.ts`
- [x] T033 [P] [US3] Étendre les parcours Playwright rouges avec édition de tous les champs, ordre dupliqué, masque/réactivation et absence de doublon dans `tests/services-management/crud.spec.ts`
- [x] T034 [P] [US3] Étendre les tests Playwright rouges d'accès avec deep-link modification, session expirée, rôle retiré et historique après logout dans `tests/services-management/access.spec.ts`

### Implementation for User Story 3

- [x] T035 [US3] Ajouter `getAdminService(id)` avec UUID validé, sélection explicite, prix exact et résultat sûr ligne/not_found/erreur dans `lib/data/services.ts`
- [x] T036 [US3] Implémenter `updateServiceAction` et `setServiceVisibilityAction` avec payloads minimaux, cible affectée obligatoire et invalidation après succès dans `app/(admin)/admin/(protected)/prestations/_actions/service-actions.ts`
- [x] T037 [US3] Étendre le formulaire partagé pour l'édition, le préremplissage exact, le changement quote/tarifé et la conservation de l'UUID côté serveur dans `app/(admin)/admin/(protected)/prestations/_components/service-form.tsx`
- [x] T038 [US3] Créer la page `/admin/prestations/[id]/modifier` avec `params` awaited, garde sur le chemin courant et états introuvable/indisponible dans `app/(admin)/admin/(protected)/prestations/[id]/modifier/page.tsx`
- [x] T039 [US3] Créer le Client Component imbriqué de visibilité avec pending local/statut annoncé, puis l'intégrer avec les actions textuelles Modifier et Masquer/Réactiver sans convertir la liste en Client Component dans `app/(admin)/admin/(protected)/prestations/_components/service-visibility-form.tsx` et `app/(admin)/admin/(protected)/prestations/_components/service-list.tsx`

**Checkpoint**: US3 met à jour une seule identité, garde les lignes masquées administrables et révoque l'accès dès le prochain contrôle serveur.

---

## Phase 6: User Story 4 - Supprimer définitivement une prestation (Priority: P4)

**Goal**: Supprimer exactement une prestation après confirmation accessible, tout en garantissant que l'annulation, une cible disparue ou une erreur ne produisent aucun faux succès.

**Independent Test**: Ouvrir la confirmation nommée, annuler et vérifier l'absence de mutation, puis confirmer ; vérifier la suppression de la seule cible dans l'administration et la source persistante, le retour de focus, l'invalidation du tag et l'état `not_found` si la cible a disparu entre-temps, sans dépendre du rendu public.

### Tests for User Story 4

- [x] T040 [P] [US4] Étendre les tests rouges de l'action delete avec autorisation, UUID, zéro ligne, erreur sûre et invalidation uniquement après ID retourné dans `tests/unit/services/actions.test.ts`
- [x] T041 [P] [US4] Écrire les parcours Playwright rouges du dialogue, annulation/Escape, restauration du focus, confirmation, cible supprimée hors bande et absence de faux succès dans `tests/services-management/crud.spec.ts`

### Implementation for User Story 4

- [x] T042 [US4] Implémenter `deleteServiceAction` ciblée par UUID avec réautorisation, ligne affectée obligatoire et invalidation post-succès dans `app/(admin)/admin/(protected)/prestations/_actions/service-actions.ts`
- [x] T043 [P] [US4] Créer le dialogue client titré avec nom, conséquence définitive, focus initial sur Annuler, Escape et restauration du focus dans `app/(admin)/admin/(protected)/prestations/_components/delete-service-dialog.tsx`
- [x] T044 [US4] Intégrer Supprimer au bon élément, gérer pending/succès/échec et repositionner le focus logique après succès dans `app/(admin)/admin/(protected)/prestations/_components/service-list.tsx` et `app/globals.css`

**Checkpoint**: US4 ne détruit une ligne qu'après consentement explicite et n'annonce jamais une suppression non confirmée par la base.

---

## Phase 7: User Story 5 - Consulter le catalogue public actualisé (Priority: P5)

**Goal**: Remplacer les tableaux statiques par la lecture Supabase anonyme cachée, sans changer les trois univers, le design, les CTA ni exposer une prestation masquée.

**Independent Test**: Vérifier les huit cartes migrées, les trois types de prix, les champs facultatifs, une catégorie vide, l'ordre stable, l'absence des lignes masquées, le CTA `/contact` et un vrai état d'erreur sans fallback statique. L'actualisation après mutation constitue ensuite l'intégration croisée avec US2 à US4.

### Tests for User Story 5

- [x] T045 [P] [US5] Étendre les tests unitaires rouges avec mapping public, distinction `adminLabel`/`publicLabel`, snapshots exacts `45 €`/`45,50 €`/« À partir de 45,50 € »/« Sur devis », groupes toujours présents et absence de placeholders durée/badge dans `tests/unit/services/mappers.test.ts` et `tests/unit/services/price.test.ts`
- [x] T046 [P] [US5] Écrire les tests Playwright rouges de la baseline des huit cartes, trois sections/visuels/CTA, filtrage actif, prix, champs optionnels, catégorie vide et 40 lignes stables sur 20 actualisations dans `tests/services-management/public-catalog.spec.ts`
- [x] T047 [US5] Étendre les tests Playwright rouges avec `public-unavailable` via le runner local après mutation réelle invalidant le tag, absence de fallback statique et intégration croisée des cinq mutations confirmées visible publiquement en moins de cinq secondes après T028, T036, T042 et T046 dans `tests/services-management/error-states.spec.ts` et `tests/services-management/public-catalog.spec.ts`

### Implementation for User Story 5

- [x] T048 [P] [US5] Créer le client Supabase serveur anonyme, sans cookies ni persistance de session et limité aux variables publiques dans `lib/supabase/public.ts`
- [x] T049 [US5] Implémenter `getPublicServices()` avec colonnes explicites, filtre actif, tri stable, `use cache`, `cacheLife("days")`, `cacheTag("prestations")`, mapping/groupement produit et `public-unavailable` uniquement depuis l'adaptateur local validé dans `lib/data/services.ts`, `lib/services/e2e-scenario.ts` et `lib/services/mappers.ts`
- [x] T050 [P] [US5] Adapter les types et le rendu de carte aux libellés prix prêts à afficher, durée/badge facultatifs et message neutre de liste vide dans `components/service-section.tsx`
- [x] T051 [US5] Rendre `/services` asynchrone, injecter les trois groupes dynamiques tout en préservant les `publicLabel`, supprimer les huit constantes métier statiques, puis ajouter loading et le Client Error Boundary `error.tsx` avec `"use client"` sans fallback dans `app/(public)/services/page.tsx`, `app/(public)/services/loading.tsx` et `app/(public)/services/error.tsx`
- [x] T052 [US5] Ajouter seulement les styles d'état public nécessaires sans modifier images, typographies, ordre, reverse layout ni breakpoints existants dans `app/globals.css`

**Checkpoint**: US5 reproduit le catalogue visible actuel depuis Supabase, partage uniquement les données anon actives et reflète chaque mutation confirmée sans déploiement.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Fermer les matrices accessibilité, responsive, régression, documentation, sécurité, exécution agrégée et preview autorisée.

- [x] T053 [P] Écrire et faire réussir Axe, clavier, focus, dialogue, annonces, cibles 44 px et absence d'overflow à 320/768/1024 sous Chromium et WebKit dans `tests/services-management/accessibility.spec.ts`
- [x] T054 [P] Étendre la régression publique `/`, `/services`, `/galerie`, `/contact`, Header/Footer et CTA Réserver → contact sans changer les tests Auth valides dans `tests/admin-auth/public-regression.spec.ts`
- [x] T055 Créer l'agrégat expurgé à code de sortie non nul, finaliser `test:unit`, `test:e2e:auth`, `test:e2e:services`, `test:e2e:services:scenarios` et `services:check`, puis conserver les suites existantes dans `scripts/check-services-management.mjs` et `package.json`
- [x] T056 [P] Documenter les DAL publique/admin, routes Prestations, Server Actions, cache tagué, états d'erreur et limites de déploiement dans `doc/architecture.md` et `doc/spec.md`, sans modifier `doc/design.md` ou `doc/infra.md` sauf décision réellement nouvelle
- [x] T057 Exécuter les tests unitaires, lint, typecheck, build de production et scan de secrets définis dans `package.json`, puis corriger uniquement les fichiers concernés jusqu'à réussite
- [x] T058 Exécuter reset, pgTAP, lint, advisors et drift de types Supabase via `package.json`, puis corriger toute alerte pertinente dans `supabase/migrations/<cli-timestamp>_services_management.sql`, `supabase/tests/database/08_services_management.sql` et `lib/supabase/database.types.ts`
- [x] T059 Exécuter les suites Auth et Services complètes aux projets et viewports définis dans `playwright.config.ts`, puis corriger les régressions dans `tests/admin-auth/` et `tests/services-management/`
- [ ] T060 Consigner Safari mobile 320/375 px, Firefox, technologie d'assistance, comparaison visuelle, parcours création → public sous deux minutes et protocole SC-010 standardisé avec cinq résultats premier essai, seuil 4/5 et preuve de confirmation destructive dans `specs/003-services-management/quickstart.md`
- [x] T061 Sur une preview Netlify et un projet Supabase de test explicitement autorisés seulement, consigner backup/préflight, migration unique, cache public, en-têtes admin privés, ancien onglet/action et logs expurgés dans `specs/003-services-management/quickstart.md`; sinon noter précisément le gate non exécuté sans toucher un environnement hébergé
- [x] T062 Refaire la revue de cohérence entre exigences, contraintes, contrats, migration, types, tests et documents, puis corriger tout écart dans `specs/003-services-management/spec.md`, `specs/003-services-management/plan.md`, `specs/003-services-management/data-model.md`, `specs/003-services-management/contracts/` et `specs/003-services-management/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sans dépendance ; T002 et T003 peuvent avancer en parallèle, puis T004 assemble la découverte.
- **Foundational (Phase 2)**: dépend de Setup et bloque toutes les histoires ; T005 précède T006, puis T007/T008/T013. T009 et T010 peuvent avancer en parallèle ; T011 dépend de T010.
- **US1 (Phase 3)**: dépend de Foundational et fournit un incrément de lecture sans commande de mutation indisponible ; ce n'est pas encore le MVP fonctionnel complet.
- **US2 (Phase 4)**: dépend de US1 pour brancher la création et son CTA sur une liste réelle ; son test indépendant porte sur l'administration et la persistance.
- **US3 (Phase 5)**: dépend de la liste US1 et réutilise validation/formulaire/action-core de US2.
- **US4 (Phase 6)**: dépend de la liste US1 et du pipeline d'action US2 ; elle peut être développée en parallèle d'US3 après ces prérequis.
- **US5 (Phase 7)**: son catalogue de base dépend seulement de Foundational et peut être préparé en parallèle ; T047 attend explicitement les mutations US2 à US4 pour l'intégration publique croisée.
- **Polish (Phase 8)**: dépend de toutes les histoires incluses dans la livraison.

### User Story Dependency Graph

```text
Setup → Foundational ─┬─→ US1 → US2 ─┬─→ US3 ─┐
                     │              └─→ US4 ─┼─→ US5 integration → Polish
                     └─→ US5 core ───────────┘
```

- **US1 (P1)**: testable après Foundational comme consultation admin privée, sans action factice.
- **US2 (P2)**: dépend de US1 pour la destination de liste, mais se teste sans catalogue public.
- **US3 (P3)**: dépend des composants partagés de US1 et US2 et se teste par persistance, statut/RLS et invalidation de tag.
- **US4 (P4)**: dépend de la liste US1 et du pipeline US2, sans dépendre de US3 ni du rendu public.
- **US5 (P5)**: sa lecture et son rendu de base sont testables après Foundational ; seule T047 attend US2 à US4 pour prouver les effets publics des cinq mutations.

### Within Each User Story

1. Écrire les tests et constater l'échec attendu.
2. Implémenter les fonctions pures et accès aux données.
3. Implémenter les Server Actions avant de brancher les Client Components.
4. Brancher les routes et composants sans élargir la frontière client.
5. Faire réussir le test indépendant avant de passer à la priorité suivante.

## Parallel Opportunities

- T002 et T003 peuvent être menées en parallèle après T001.
- T009 et T010 peuvent être menées en parallèle pendant la préparation de la migration après T005.
- Après Foundational, US1, le socle de création US2 et la lecture publique US5 peuvent être répartis entre contributeurs, en évitant les fichiers partagés `lib/data/services.ts`, `lib/services/mappers.ts`, `app/globals.css` et `package.json` au même moment.
- Les tests marqués [P] dans une histoire sont écrits en parallèle, avant son implémentation.
- US3 et US4 peuvent être menées en parallèle après US1 et le pipeline US2, avec coordination sur `service-actions.ts`, `service-list.tsx` et `actions.test.ts`.

## Parallel Example: User Story 1

```text
T014 — tests unitaires de tri dans tests/unit/services/mappers.test.ts
T015 — accès/liste/état vide dans tests/services-management/access.spec.ts
T016 — chargement/erreurs/session dans tests/services-management/error-states.spec.ts
```

## Parallel Example: User Story 2

```text
T023 — validation et prix dans tests/unit/services/
T024 — contrat d'action create dans tests/unit/services/actions.test.ts
T025 — parcours navigateur create dans tests/services-management/crud.spec.ts
```

## Parallel Example: User Story 3

```text
T032 — contrat update/visibility dans tests/unit/services/actions.test.ts
T033 — édition/visibilité dans tests/services-management/crud.spec.ts
T034 — session/rôle/historique dans tests/services-management/access.spec.ts
```

## Parallel Example: User Story 4

```text
T040 — contrat delete dans tests/unit/services/actions.test.ts
T041 — dialogue et concurrence dans tests/services-management/crud.spec.ts
T043 — composant dialogue dans app/(admin)/admin/(protected)/prestations/_components/delete-service-dialog.tsx après les tests rouges
```

## Parallel Example: User Story 5

```text
T045 — mapping/formatage dans tests/unit/services/
T046 — baseline publique dans tests/services-management/public-catalog.spec.ts
T047 — panne/cache dans tests/services-management/error-states.spec.ts
T048 — client anon dans lib/supabase/public.ts après les tests rouges
T050 — rendu optionnel dans components/service-section.tsx après les tests rouges
```

## Implementation Strategy

### First Verifiable Increment (Not the Feature MVP)

1. Terminer Phase 1: Setup.
2. Terminer Phase 2: Foundational et faire réussir la matrice base/RLS.
3. Terminer Phase 3: US1.
4. Arrêter et valider indépendamment l'accès, la liste complète, l'ordre et les états sans commande cassée.
5. Utiliser ce catalogue administratif en lecture comme jalon technique, sans le présenter comme le MVP fonctionnel livré.

### Feature MVP

Le MVP de gestion des prestations exige Setup, Foundational, US1, US2, US3, US4, le cœur public US5 et T047. Il n'est démontrable comme fonctionnalité complète qu'après vérification du CRUD, du masquage, de la suppression et de leur projection publique.

### Incremental Delivery

1. Setup + Foundational → schéma exact, sécurité et cache prêts.
2. US1 → incrément admin consultable, non présenté comme MVP final.
3. US2 → création autonome.
4. US3 → édition et publication réversible.
5. US4 → suppression protégée.
6. US5 → bascule publique dynamique puis intégration croisée des cinq mutations sans régression visuelle.
7. Polish → matrices complètes, documentation et preuves de livraison.

### Parallel Team Strategy

Après Foundational, répartir par frontières de fichiers :

- contributeur A: US1, puis US3 sur la DAL et la liste admin ;
- contributeur B: US2, puis US4 sur validation, actions et formulaires ;
- contributeur C: US5 sur client anon, cache, mapping et rendu public ;
- intégrer séquentiellement les fichiers partagés avant d'exécuter Phase 8.

## Notes

- Une tâche `[P]` ne partage aucun fichier avec une autre tâche parallèle proposée.
- Les tests sont écrits avant l'implémentation et doivent échouer pour la raison attendue, pas pour une erreur d'environnement.
- Le timestamp de migration n'est jamais inventé : `<cli-timestamp>` désigne exclusivement le fichier créé par la CLI dans T006.
- Aucun `service_role`, secret, cookie, JWT, e-mail fixture complet ou erreur Supabase brute ne doit apparaître dans le code client, les logs ou les rapports.
- Une opération distante, une migration hébergée ou un déploiement reste interdit sans autorisation explicite et vérification de la cible.
- Committer après chaque tâche ou petit groupe logique facilite la reprise et la revue.

## Phase 9: Convergence

- [x] T063 CRITICAL Créer avec la CLI Supabase une migration corrective qui remplace la contrainte d'échelle de `prestations.prix` par une vérification `scale(prix) <= 2`, puis ajouter des tests pgTAP couvrant notamment le rejet de `1.000` et l'acceptation des bornes valides, conformément à Constitution VI et FR-008–FR-009 (contradicts)
- [x] T064 CRITICAL Remplacer les libellés de catégories dupliqués dans `app/(public)/services/page.tsx` par la source métier centralisée `publicLabel`, préserver exactement le rendu public actuel et ajouter un test empêchant leur dérive, conformément à Constitution VI, T009 et T051 (contradicts)
- [x] T065 HIGH Remplacer le paramètre d'URL `success` contrôlable par le client par un mécanisme de confirmation ponctuelle lié à une mutation réellement réussie pour la création, la modification et la suppression, puis tester qu'une URL forgée ou une valeur inconnue n'affiche jamais de succès, conformément à FR-016, FR-019 et Constitution VII (contradicts)
- [x] T066 HIGH Faire lire `prix` sous une représentation textuelle exacte dans les DAL publique et admin avant conversion en centimes, sans élargir les colonnes ni contourner RLS ou le cache, puis tester les centimes et la borne maximale, conformément à la décision « Price Boundary » du plan, T035 et T049 (partial)
- [x] T067 HIGH Propager depuis les gardes fortes un état sûr et distinct pour session expirée, session révoquée ou rôle retiré avec consigne de reconnexion sans fuite de données, puis compléter les tests services par l'enregistrement refusé après retrait en cours d'édition, la visibilité des lignes masquées pour l'admin, le refus non-admin et le retour arrière après déconnexion, conformément à FR-004, FR-013, SC-001 et US3/AC5 (partial)
- [x] T068 HIGH Valider les entrées brutes `active` comme un booléen fermé et explicite pour les mises à jour et bascules, réserver la valeur par défaut au seul cas de création autorisé, borner `displayOrder` à un entier PostgreSQL sûr et prouver qu'une entrée absente ou malformée ne mute ni n'invalide le cache, conformément à FR-012, FR-015 et T032 (partial)
- [x] T069 MEDIUM Étendre les tests Playwright d'accessibilité aux parcours clavier complets de liste, création, modification, visibilité et suppression, avec focus visible, retour de focus, annonces et cibles mesurées à au moins 44 px aux largeurs 320, 768 et 1 024 px sous Chromium et WebKit, conformément à FR-026, SC-008 et T053 (partial)

## Phase 10: Convergence

- [x] T070 HIGH Remplacer le cookie littéral de succès par une preuve ponctuelle authentifiée côté serveur et liée à la mutation confirmée, consommée une seule fois sans être constructible ni rejouable par le client, puis tester le refus d'un cookie forgé, d'une valeur inconnue et d'un rejeu dans `lib/services/success-flash.ts`, `proxy.ts`, `lib/supabase/proxy.ts`, `app/(admin)/admin/(protected)/prestations/_actions/service-actions.ts`, `tests/unit/services/success-flash.test.ts` et `tests/services-management/crud.spec.ts`, conformément à FR-016, FR-019 et Constitution VII (contradicts)
- [x] T071 HIGH Remplacer les remontées brutes d'erreurs Supabase des lectures publique et administrative par des exceptions sûres et des diagnostics serveur allowlistés avec identifiant de corrélation, sans ligne, requête ni détail fournisseur, puis tester l'absence de fuite dans les logs et sorties partageables dans `lib/data/services.ts`, `lib/services/diagnostics.ts`, `tests/unit/services/diagnostics.test.ts`, `tests/services-management/error-states.spec.ts` et `scripts/check-services-management.mjs`, conformément à la décision diagnostics du plan, SC-012 et Constitution VII (partial)
- [x] T072 MEDIUM Faire exécuter au script `supabase:advisors` la vraie commande CLI locale découverte par `--help`, l'intégrer à `services:check` avec résultat expurgé et code non nul au seuil documenté, puis prouver que l'advisor réel couvre les prestations sans confondre le test pgTAP d'inventaire dans `package.json` et `scripts/check-services-management.mjs`, conformément à la section Testing du plan, T058 et Constitution VII (contradicts)
- [x] T073 MEDIUM Compléter la matrice Playwright pour activer Masquer puis Réactiver uniquement au clavier, vérifier les annonces et le statut après chaque mutation ainsi que la conservation du focus logique aux largeurs 320, 768 et 1 024 px sous Chromium et WebKit dans `tests/services-management/accessibility.spec.ts`, conformément à FR-026, SC-008, T069 et Constitutions III/VII (partial)

## Phase 11: Convergence

- [x] T074 CRITICAL Remplacer le marqueur de consommation mono-nonce du flash de succès par un mécanisme serveur authentifié et borné qui refuse chaque nonce pendant toute sa durée de rejeu, puis couvrir explicitement la séquence première preuve consommée → seconde preuve consommée → rejeu de la première ainsi que les preuves altérées et expirées dans `lib/services/success-flash.ts`, `lib/supabase/proxy.ts`, `tests/unit/services/success-flash.test.ts` et `tests/services-management/crud.spec.ts`, conformément à FR-016, FR-019, T070 et Constitution VII (contradicts)
- [x] T075 HIGH Préserver et normaliser le statut de réponse Supabase/PostgREST aux frontières de lecture et de mutation afin que le statut réseau `0`, les annulations/délais et les statuts 429/502/503/504 produisent l'état récupérable `unavailable` plutôt que `internal`, sans exposer le détail fournisseur, puis tester les formes de réponse réelles dans `lib/data/services.ts`, `lib/services/errors.ts`, `lib/services/action-core.ts`, `app/(admin)/admin/(protected)/prestations/_actions/service-actions.ts`, `tests/unit/services/actions.test.ts` et `tests/unit/services/diagnostics.test.ts`, conformément à FR-028 et à la décision 12 du plan (partial)
- [x] T076 MEDIUM Journaliser les échecs d'autorisation indisponible, de mutation et d'invalidation des actions avec un diagnostic strictement limité à la catégorie, la phase et le même identifiant de corrélation que l'état récupérable retourné, puis prouver l'absence d'erreur Supabase brute, de donnée de session et de détail d'infrastructure dans `lib/services/action-core.ts`, `lib/services/diagnostics.ts`, `tests/unit/services/actions.test.ts` et `tests/unit/services/diagnostics.test.ts`, conformément à la décision 12 du plan et SC-012 (partial)
- [x] T077 MEDIUM Contrôler le champ de montant afin que le passage à « Sur devis » efface immédiatement toute valeur antérieure et le désactive, puis que le retour à « Prix fixe » ou « À partir de » exige une nouvelle valeur valide sans casser la conservation des autres champs après erreur, avec couverture dans `app/(admin)/admin/(protected)/prestations/_components/service-form.tsx` et `tests/services-management/crud.spec.ts`, conformément au cas limite tarifaire de la spécification, à FR-008 et au contrat `admin-services-ui.md` (partial)

## Phase 12: Catégories administrables à la création

**Goal**: Permettre « Administration → Prestations → Nouvelle catégorie », puis l’utilisation immédiate de cette catégorie dans une prestation et sa projection publique non vide, sans ouvrir le renommage ni la suppression.

**Independent Test**: Créer une catégorie valide, refuser son doublon normalisé, vérifier son option unique dans le formulaire, créer une prestation active liée et observer sa section publique générique ; vérifier en parallèle que anon/non-admin ne peuvent pas insérer et que personne ne peut update/delete une catégorie dans ce périmètre.

- [x] T078 Mettre à jour `spec.md`, `plan.md`, `research.md`, `data-model.md`, les contrats et `quickstart.md` avec le périmètre création seule, le fallback visuel, l’omission des catégories vides et les critères SC-013/SC-014
- [x] T079 Créer par la CLI `supabase/migrations/20260814132648_service_categories.sql` avec table, contraintes, seed des trois catégories, clé étrangère, grants, RLS, index et trigger
- [x] T080 Ajouter `supabase/tests/database/10_service_categories.sql`, mettre à jour les inventaires existants et enregistrer le test dans `package.json` et `scripts/run-foundation-checks.mjs`
- [x] T081 Régénérer `lib/supabase/database.types.ts` et centraliser DTO, colonnes explicites, mapping et ordre dynamique dans `lib/services/` et `lib/data/services.ts`
- [x] T082 Étendre la validation serveur afin que les prestations relisent la catégorie courante avant mutation et que la création de catégorie borne nom/ordre sans accepter de code client
- [x] T083 Implémenter `createServiceCategoryAction` avec réautorisation, code UUID serveur, insertion RLS, doublon sûr, invalidation `prestations` et flash ponctuel authentifié
- [x] T084 Créer `/admin/prestations/categories/nouvelle`, son formulaire accessible et les accès « Nouvelle catégorie » depuis la liste et le formulaire de prestation
- [x] T085 Alimenter les sélecteurs de création/édition depuis Supabase, désactiver sûrement la soumission sans catégorie et préserver les valeurs/erreurs
- [x] T086 Rendre les sections publiques depuis les catégories en base, conserver les trois présentations initiales, appliquer le fallback générique et omettre les groupes sans prestation active
- [x] T087 Étendre les tests unitaires de validation, mapping, colonnes et flash ainsi que Playwright pour création/doublon/utilisation/publication et catégorie vide
- [x] T088 Exécuter reset, pgTAP complet, lint/advisors Supabase, drift des types, unitaires, ESLint, TypeScript, build et suites Playwright Chromium/WebKit ; corriger tout échec
- [ ] T089 Réaliser le test utilisateur SC-014 chronométré sur la preview : catégorie → prestation active → section publique en moins de 3 minutes, sans aide
- [x] T090 Vérifier la cible Supabase de test, appliquer uniquement la migration catégories, pousser `dev` et attendre le déploiement Netlify réussi sans toucher la production
- [x] T091 Tester sur Netlify `dev` les parcours catégorie, prestations et régressions publiques, puis consigner les résultats et limites manuelles dans `quickstart.md`
