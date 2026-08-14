# Implementation Plan: Gestion des prestations

**Branch**: `003-services-management` *(contexte Spec Kit ; branche Git de travail actuelle : `dev`)* | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-services-management/spec.md`

## Summary

Remplacer les huit prestations statiques de `/services` par la table `public.prestations` existante, puis livrer sous `/admin/prestations` une liste complète et les parcours unitaires de création, modification, visibilité et suppression. Les lectures publiques passent par une DAL anonyme sans cookies, mise en cache avec Cache Components et le tag `prestations`; les lectures administratives restent par requête, privées et non cachées. Chaque Server Action réutilise le contrôle administrateur courant de 002, valide avec Zod, écrit sous les politiques Supabase puis appelle `updateTag("prestations")` uniquement après succès confirmé.

Une première migration créée par la CLI renforce l'exactitude des prix, consolide les politiques `SELECT` des prestations et reprend les huit contenus actuels avec des identifiants et ordres déterministes. L’extension du 2026-08-14 ajoute par migration CLI `public.categories_prestations`, migre les trois catégories initiales, remplace le contrôle fermé par une clé étrangère et livre la création administrative d’une catégorie. Aucun nouveau service externe, Route Handler, ORM, upload d'image ou parcours de réservation n'est introduit.

## Technical Context

**Language/Version**: TypeScript strict 5.9.3, SQL PostgreSQL/Supabase, Node.js 22 LTS cible

**Primary Dependencies**: Next.js 16.3.0, React 19.2.8, `@supabase/supabase-js` 2.112.2, `@supabase/ssr` 0.12.4, Zod 4.4.3 ; Supabase CLI 2.112.0, Playwright 1.62.1 et `@axe-core/playwright` 4.12.1 pour les contrôles

**Storage**: Tables `public.prestations` et `public.categories_prestations`; migrations versionnées pour le prix exact, la reprise initiale, la clé étrangère, les grants et RLS ; aucun fichier Storage supplémentaire

**Testing**: pgTAP via Supabase CLI, contrats purs avec `node:test`, Playwright Chromium/WebKit, scénarios locaux immuables par processus pour les états vide/indisponible, interception Playwright du POST pour le pending, Axe, contrôle manuel Safari mobile/Firefox/technologie d'assistance, ESLint, `tsc --noEmit`, build Next.js, génération/drift des types et scan de secrets

**Target Platform**: Netlify avec l'adaptateur Next.js courant, Supabase PostgreSQL/Auth hébergé, navigateurs modernes desktop et mobile ; pile locale Supabase sous Docker pour les migrations et tests

**Project Type**: Application web Next.js App Router unique avec PostgreSQL/Auth gérés par Supabase

**Performance Goals**: nouvel état public visible en moins de 5 secondes après une mutation confirmée et une nouvelle consultation ; état pending annoncé en moins de 1 seconde ; ordre stable sur 40 prestations pendant 20 actualisations ; aucune pagination au volume MVP

**Constraints**: public limité aux lignes actives ; admin courant seul pour les lignes masquées et mutations ; prix exact sans calcul métier en flottant ; Cache Components activé sans cache de session/admin ; réponses `/admin` privées et non stockables ; 44 × 44 px, clavier, annonces accessibles et largeurs 320/768/1 024 px ; design public inchangé ; aucune mutation distante sans cible autorisée et vérifiée ; aucun scénario de panne sélectionnable par le navigateur ou accepté hors pile Supabase loopback locale

**Scale/Scope**: un administrateur, environ 40 prestations, trois catégories initiales plus quelques catégories ajoutées, trois types de prix, une route de création de catégorie, cinq Server Actions et un tag de cache public

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence |
| --- | --- | --- |
| Périmètre MVP | PASS | Le plan couvre le CRUD des prestations, leur lecture publique et la création unitaire de catégories ; galerie, réservation, paiement, renommage/suppression de catégorie et opérations groupées restent exclus. |
| Sources de vérité | PASS | `doc/spec.md`, `doc/design.md`, `doc/architecture.md`, `doc/infra.md`, les guides Next.js 16.3 installés et la documentation/changelog Supabase actuels ont été consultés. |
| Fidélité visuelle et accessibilité | PASS | Les composants réutilisent les tokens, typographies, cartes, états, focus, cibles tactiles et breakpoints documentés ; les trois univers publics restent inchangés. |
| Architecture Next.js côté serveur | PASS | Pages et listes restent Server Components ; les formulaires interactifs, le dialogue et les Error Boundaries imposées par Next.js sont les seules frontières clientes ; les mutations sont des Server Actions réautorisées et validées. |
| Sécurité Supabase en profondeur | PASS | La DAL admin utilise la session courante, RLS répète le contrôle en base, le public utilise un client anonyme et aucune clé privilégiée n'est ajoutée. |
| Intégrité et reproductibilité | PASS | Une migration CLI durcit le prix, les politiques et les données initiales ; les types et tests pgTAP restent reproductibles. |
| Cache et confidentialité | PASS | Seule la lecture publique anonyme reçoit `use cache`; l'autorisation, les lignes masquées et les pages admin restent hors de tout cache partagé. |
| Vérification | PASS | La matrice couvre contraintes, rôles, CRUD, cache, erreurs, double soumission, responsive, accessibilité, régression publique et preview Netlify. |
| Documentation synchronisée | PASS | Le changement de représentation SQL du prix devra mettre à jour `doc/spec.md`, `doc/architecture.md` et le modèle 001 dans le même lot d'implémentation. |

## Project Structure

### Documentation (this feature)

```text
specs/003-services-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── service-data.md
│   ├── service-actions.md
│   ├── admin-services-ui.md
│   └── verification.md
└── tasks.md                 # Produit ensuite par $speckit-tasks
```

### Source Code (repository root)

```text
.
├── .env.example                             # Scénario E2E local documenté vide
├── next.config.ts                           # Active Cache Components
├── app/
│   ├── globals.css                          # Extensions admin conformes à doc/design.md
│   ├── (public)/
│   │   └── services/
│   │       ├── page.tsx                     # Catégories dynamiques + données publiques
│   │       ├── loading.tsx                  # État de navigation public
│   │       └── error.tsx                    # Client Error Boundary, indisponibilité récupérable
│   └── (admin)/admin/
│       ├── connexion/page.tsx               # `instant = false`, auth existante
│       └── (protected)/
│           ├── layout.tsx                   # `instant = false`, garde et navigation admin
│           ├── page.tsx                     # Accueil avec lien Prestations réel
│           └── prestations/
│               ├── page.tsx                 # Liste complète non cachée
│               ├── loading.tsx
│               ├── error.tsx                # Client Error Boundary de la liste
│               ├── nouvelle/page.tsx
│               ├── categories/nouvelle/page.tsx
│               ├── [id]/modifier/page.tsx
│               ├── _actions/service-actions.ts
│               ├── _actions/service-category-actions.ts
│               └── _components/
│                   ├── service-form.tsx
│                   ├── service-category-form.tsx
│                   ├── service-list.tsx
│                   ├── service-visibility-form.tsx
│                   └── delete-service-dialog.tsx
├── components/
│   └── service-section.tsx                  # Carte publique accepte prix/durée/badge optionnels
├── lib/
│   ├── data/services.ts                     # Lectures public caché/admin non caché
│   ├── services/
│   │   ├── constants.ts                     # Codes/rangs/libellés admin-public, prix, cache
│   │   ├── types.ts                         # DTO public/admin et états d'action
│   │   ├── price.ts                         # Chaîne française ↔ cents ↔ affichage
│   │   ├── mappers.ts                       # Lignes explicites vers view models
│   │   ├── action-core.ts                   # Orchestration pure testable
│   │   ├── errors.ts                        # Messages publics stables
│   │   ├── diagnostics.ts                   # Catégories expurgées + correlation ID
│   │   └── e2e-scenario.ts                  # Scénario serveur immuable, local et fail-closed
│   ├── validations/service.ts               # Schémas Zod création/édition/UUID
│   └── supabase/
│       ├── public.ts                        # Client serveur anonyme sans cookies
│       ├── server.ts                        # Client SSR admin existant
│       └── database.types.ts                # Types régénérés après migration
├── supabase/
│   ├── migrations/
│   │   └── <cli-timestamp>_services_management.sql
│   │   └── <cli-timestamp>_service_categories.sql
│   └── tests/database/
│       ├── 08_services_management.sql
│       └── 10_service_categories.sql
├── tests/
│   ├── unit/services/
│   │   ├── validation.test.ts
│   │   ├── price.test.ts
│   │   ├── mappers.test.ts
│   │   ├── actions.test.ts
│   │   ├── diagnostics.test.ts
│   │   └── e2e-scenario.test.ts
│   └── services-management/
│       ├── access.spec.ts
│       ├── crud.spec.ts
│       ├── public-catalog.spec.ts
│       ├── accessibility.spec.ts
│       └── error-states.spec.ts
├── scripts/check-services-management.mjs
├── scripts/run-services-scenario-tests.mjs
├── playwright.config.ts
└── package.json
```

**Structure Decision**: Conserver l'application unique et les groupes de routes actuels. La route publique garde `ServiceSection`; les trois catégories initiales utilisent leurs présentations dédiées et les nouvelles un fallback générique documenté. La route de création de catégorie reste sous le layout protégé. La liste reste un Server Component et délègue les interactions aux frontières clientes minimales. La logique métier et les lectures restent sous `lib/`; aucune connexion Supabase, validation ou règle de prix n'entre dans un composant de présentation.

**Data Boundaries**: `getPublicServices()` utilise exclusivement un client anonyme sans cookies, lit catégories et prestations actives en parallèle, retourne des sections non vides et porte `use cache`, `cacheLife("days")`, `cacheTag("prestations")`. Les lectures administratives utilisent le client SSR par requête après `requireAdminPage()` et ne sont jamais cachées. L’ordre des catégories vient de `categories_prestations.ordre_affichage`, départagé par date puis code.

**Mutation Boundaries**: Les quatre actions de prestation et `createServiceCategoryAction` suivent la chaîne `requireAdminAction()` → validation Zod → mutation ciblée sous RLS → vérification de la ligne affectée → `updateTag("prestations")` → état structuré ou redirection. Les actions de prestation relisent la catégorie avant mutation et la clé étrangère confirme l’intégrité. Le code de nouvelle catégorie est généré exclusivement côté serveur. Une cible absente ou masquée par l'autorisation n'est jamais annoncée comme succès.

**Price Boundary**: La saisie reste une chaîne française canonique jusqu'à sa conversion en cents entiers sûrs. Les calculs, comparaisons et formatages utilisent les cents. Le rendu canonique conserve `45 €` pour un montant entier, utilise deux décimales pour des centimes (`45,50 €`), préfixe un prix de départ par « À partir de » et rend un devis comme « Sur devis ». Le nombre transmis au client Supabase n'est qu'un adaptateur de transport dans la plage sûre ; PostgreSQL `numeric` et ses contraintes restent la source de vérité. Les lectures demandent `prix::text` lorsque la réponse exacte est nécessaire, puis vérifient la conversion en cents.

**Cache Components Migration**: Ajouter `cacheComponents: true`, retirer les deux exports existants `dynamic = "force-dynamic"` et poser `instant = false` au niveau de `/admin/connexion` et du layout admin protégé. Cette adoption minimale autorise les lectures request-bound de l'administration sans mettre en cache ni streamer un shell protégé, tandis que le catalogue public utilise explicitement le nouveau modèle.

**Deterministic Test Boundary**: Les fonctions pures d'action reçoivent leurs dépendances en argument afin que `node:test` simule autorisation refusée, zéro ligne et indisponibilité sans Supabase distant. Dans Playwright, le pending est provoqué en retardant uniquement le POST de Server Action avec l'interception réseau du navigateur. Les états serveur `admin-empty`, `admin-unavailable` et `public-unavailable` utilisent un adaptateur `server-only` sélectionné une seule fois au démarrage d'un processus de test isolé par la variable interne au runner `KN_SERVICE_E2E_SCENARIO`. Cet adaptateur refuse de s'activer si l'URL Supabase n'est pas un hôte loopback exact ou si un contexte Netlify est détecté ; il n'accepte aucun cookie, en-tête, paramètre d'URL ou commande navigateur. Le runner local réutilise un build normal, démarre séquentiellement un processus serveur par scénario avec `workers: 1`, puis l'arrête. Pour `public-unavailable`, le test effectue d'abord une mutation réelle de fixture dans ce processus afin que `updateTag("prestations")` invalide toute valeur publique préconstruite, puis ouvre une nouvelle consultation qui exécute la lecture défaillante. Les tests RLS, CRUD et cache normaux utilisent toujours la vraie pile Supabase locale et ne passent jamais par cet adaptateur.

## Phase 0: Research

[research.md](./research.md) fixe les décisions de migration, prix exact, clients Supabase, cache Next.js 16, actions, UI, données initiales, diagnostics et stratégie de tests. Aucune incertitude technique ne reste ouverte.

## Phase 1: Design & Contracts

- [data-model.md](./data-model.md) décrit `public.prestations`, `public.categories_prestations`, les modèles applicatifs, les états d'action et la reprise des données initiales.
- [contracts/service-data.md](./contracts/service-data.md) fixe les lectures publiques/administratives, les colonnes, l'ordre et les frontières de cache.
- [contracts/service-actions.md](./contracts/service-actions.md) fixe les cinq Server Actions, leurs entrées, sorties, autorisations, erreurs et invalidations.
- [contracts/admin-services-ui.md](./contracts/admin-services-ui.md) fixe les routes, composants, états responsive/accessibles et confirmation destructive.
- [contracts/verification.md](./contracts/verification.md) relie les exigences aux contrôles pgTAP, unitaires, Playwright, cache, Netlify et manuels.
- [quickstart.md](./quickstart.md) fournit la procédure reproductible locale et les gates de déploiement.

### Post-design Constitution Re-check

| Gate | Status | Design confirmation |
| --- | --- | --- |
| Périmètre MVP | PASS | Le CRUD des prestations et la création unitaire de catégorie couvrent la demande ; renommage, suppression et visuel de catégorie restent absents. |
| Sécurité en profondeur | PASS | Garde serveur, session courante, client SSR, privilèges explicites, RLS et vérification de ligne affectée se cumulent ; le public reste anon. |
| Next.js 16 | PASS | Cache Components, `instant = false`, `use cache`, `cacheLife`, `cacheTag`, `updateTag`, `params` asynchrones et `error.tsx` clients suivent les guides installés 16.3. |
| Intégrité et reproductibilité | PASS | Prix borné et à deux décimales, seed déterministe et politiques consolidées sont livrés dans une migration CLI testée. |
| Design et accessibilité | PASS | Liste sémantique responsive, formulaires groupés, dialogue titré, focus restauré, labels, erreurs et annonces utilisent les règles existantes. |
| Erreurs et confidentialité | PASS | États discriminés, diagnostics expurgés, absence de faux succès et conservation des valeurs récupérables sont contractualisés. |
| Cache et déploiement | PASS | Seul le catalogue anon est partagé ; les mutations expirent le tag immédiatement et la preview Netlify valide persistance et en-têtes privés. |
| Documentation synchronisée | PASS | Les contrats identifient explicitement les documents maîtres et l'artefact 001 à mettre à jour avec la migration du prix. |

## Complexity Tracking

Aucune violation de la constitution ne nécessite de dérogation. La migration de `numeric(10,2)` vers `numeric` borné par contraintes n'élargit pas le domaine : elle empêche le comportement de ronde silencieuse et conserve exactement la même plage métier.
