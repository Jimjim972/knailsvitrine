# Implementation Plan: Authentification administrateur

**Branch**: `002-admin-authentication` *(contexte Spec Kit ; branche Git de travail actuelle : `dev`)* | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-admin-authentication/spec.md`

## Summary

Livrer `/admin/connexion`, un accueil `/admin` minimal et la déconnexion de la session courante avec Supabase Auth SSR. `proxy.ts` rafraîchit les cookies et effectue seulement un préfiltrage d'identité ; l'autorisation forte reste dans une DAL `server-only`, appelée par chaque page protégée et chaque action qui lit ou modifie des données administratives, puis appuyée sur un RPC booléen qui réutilise `private.is_current_admin()`. Ce prédicat relit le rôle protégé courant dans Supabase Auth et la session courante en base, sans autoriser depuis un ancien claim. La déconnexion est explicitement exemptée du rôle administrateur afin de pouvoir nettoyer une session dont le droit vient d'être retiré, sans donner accès à une donnée métier. Cette séparation refuse aussi un ancien JWT administrateur lorsque son rôle ou sa session n'est plus courant, sans exposer de clé privilégiée ni créer de second backend.

## Technical Context

**Language/Version**: TypeScript strict 5.9, SQL PostgreSQL/Supabase, Node.js 22 LTS

**Primary Dependencies**: Next.js 16.3.0, React 19.2.8, `@supabase/supabase-js` 2.112.2, `@supabase/ssr` 0.12.4, Zod 4.4.3 ; Playwright 1.62.1 et `@axe-core/playwright` 4.12.1 comme dépendances de développement ciblées

**Storage**: Supabase Auth pour les identités et sessions ; PostgreSQL pour le contrôle revocation-aware existant dans `auth.sessions` ; aucun nouvel enregistrement métier persistant

**Testing**: pgTAP local pour le RPC et ses droits, intégration Auth locale avec sessions courantes/révoquées/expirées réelles, contrats unitaires des actions et gardes, Playwright Chromium/WebKit pour le parcours, Axe pour les contrôles automatisables, contrôle manuel Safari mobile, ESLint, `tsc --noEmit`, build Next.js et scans de secrets

**Target Platform**: Netlify pour Next.js, Supabase hébergé pour Auth/PostgreSQL, navigateurs modernes desktop et mobile ; pile locale Supabase sous Docker pour le développement et les tests

**Project Type**: Application web Next.js App Router unique avec services gérés externes

**Performance Goals**: état d'attente visible et annoncé dans les 1 000 ms suivant la première activation, avec exactement un POST de soumission navigateur et un appel `signInWithPassword` pendant une réponse retardée ; connexion guidée chronométrée du formulaire utilisable au contexte Administration visible en moins de 60 secondes ; 20 cycles composés chacun d'une navigation protégée puis d'une actualisation complète maintiennent une session valide ; la première requête protégée après révocation est refusée

**Constraints**: Aucun signup, reset, MFA, CRUD ou rôle supplémentaire ; aucun secret dans le navigateur ; autorisation répétée au plus près des données/actions ; session et réponses admin hors cache partagé ; message identique pour identifiants invalides et compte non-admin ; redirection de retour strictement interne ; 44 × 44 px, clavier, annonces accessibles et largeurs 320/768/1 024 px ; pages publiques visuellement inchangées

**Scale/Scope**: Un administrateur et un seul niveau d'autorisation, deux pages livrées (`/admin/connexion`, `/admin`), deux Server Actions, un RPC sans argument, un matcher Proxy `/admin/:path*`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence |
| --- | --- | --- |
| Périmètre MVP | PASS | Le plan couvre uniquement connexion, contrôle d'accès, accueil minimal et déconnexion ; aucun CRUD, compte public ou faux lien fonctionnel n'est ajouté. |
| Sources de vérité | PASS | `doc/spec.md`, `doc/design.md`, `doc/architecture.md`, `doc/infra.md`, les guides Next.js 16.3 installés et la documentation/changelog Supabase actuels ont été consultés dans l'ordre requis. |
| Fidélité visuelle et accessibilité | PASS | L'administration réutilise exactement les tokens, typographies, rayons, espacements, états et breakpoints définis dans `doc/design.md`, sans altérer le rendu public. |
| Architecture Next.js côté serveur | PASS | Server Components par défaut, Client Component limité au formulaire, Server Actions traitées comme endpoints publics et Proxy limité au transport/contrôle optimiste. |
| Sécurité Supabase en profondeur | PASS | Le rôle vient de `app_metadata`, la session doit encore exister dans `auth.sessions`, le contrôle fort est répété côté serveur et RLS reste la dernière barrière des futures données. |
| Intégrité et reproductibilité | PASS | Entrées validées avec Zod ; le wrapper RPC et ses droits passent par une migration CLI, des types régénérés et des tests pgTAP. |
| Isolation des sessions | PASS | Aucun `use cache` ni cache partagé ; clients Supabase par requête, cookies propagés par Proxy et réponses `/admin` privées sans stockage. |
| Vérification | PASS | La matrice couvre visiteur, mauvais identifiants, non-admin, admin courant, session révoquée, logout multi-onglets, redirections, accessibilité, responsive et non-régression publique. |

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-authentication/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── authentication.md
│   ├── admin-access.md
│   ├── session-refresh.md
│   └── verification.md
└── tasks.md                 # Produit ensuite par $speckit-tasks
```

### Source Code (repository root)

```text
.
├── app/
│   ├── layout.tsx                         # Document, polices et styles globaux uniquement
│   ├── globals.css                        # Tokens d'état et styles admin conformes au design
│   ├── (public)/
│   │   ├── layout.tsx                     # Header/Footer publics
│   │   ├── page.tsx
│   │   ├── services/page.tsx
│   │   ├── galerie/page.tsx
│   │   └── contact/page.tsx
│   └── (admin)/admin/
│       ├── _actions/auth-actions.ts       # Login/logout, Zod et résultats structurés
│       ├── _components/login-form.tsx     # Seule frontière client nécessaire
│       ├── _components/logout-form.tsx    # Erreur de déconnexion et état pending
│       ├── connexion/page.tsx             # Route publique de connexion
│       └── (protected)/
│           ├── layout.tsx                 # Barre supérieure admin et garde UX
│           └── page.tsx                   # Accueil minimal avec garde explicite
├── lib/
│   ├── auth/
│   │   ├── admin-session.ts               # DAL server-only et contrôle RPC fort
│   │   ├── auth-state.ts                  # DTO discriminés sans secret
│   │   ├── auth-errors.ts                 # Classification publique stable
│   │   ├── auth-diagnostics.ts            # Diagnostic structuré et caviardé
│   │   └── return-path.ts                 # Validation pure des destinations
│   ├── validations/admin-auth.ts          # Schéma Zod et messages centralisés
│   └── supabase/
│       ├── proxy.ts                       # Client SSR Proxy, cookies et en-têtes
│       ├── server.ts                      # Client serveur par requête existant
│       └── database.types.ts              # Types régénérés après migration
├── proxy.ts                               # Matcher `/admin/:path*`
├── supabase/
│   ├── migrations/
│   │   └── <cli-timestamp>_admin_authentication.sql
│   └── tests/database/
│       └── 07_admin_authentication.sql
├── tests/admin-auth/
│   ├── global-setup.ts                    # Fixtures locales protégées et nettoyage
│   ├── local-supabase.ts                  # Capacité locale éphémère et gardes loopback
│   ├── access.spec.ts
│   ├── login.spec.ts
│   ├── logout.spec.ts
│   ├── accessibility.spec.ts
│   └── public-regression.spec.ts
├── tests/unit/auth/
│   ├── admin-session.test.ts              # Contrat direct de requireAdminAction
│   ├── auth-actions.test.ts                # Contrats login/logout et unicité de l'appel Auth
│   ├── validation.test.ts
│   ├── return-path.test.ts
│   ├── error-mapping.test.ts
│   └── redaction.test.ts
├── playwright.config.ts
└── scripts/check-admin-auth.mjs           # Rapport local catégorisé et garde loopback
```

**Structure Decision**: Conserver un seul root layout et utiliser des groupes de routes qui ne modifient aucune URL. `(public)` reçoit le chrome Header/Footer existant ; `(admin)` isole visuellement la connexion et l'espace protégé. La logique d'identité reste sous `lib/auth` et `lib/supabase`, hors des composants. Aucun Route Handler, backend ou système d'authentification supplémentaire n'est nécessaire.

**Authorization Boundaries**: Proxy rafraîchit la session et redirige uniquement l'absence d'identité. `connexion/page.tsx`, chaque page protégée et chaque Server Action qui lit ou modifie des données administratives appellent le contrôle fort ; ce contrat est prouvé directement pour `requireAdminAction()`. Le login ne réussit qu'après ce même contrôle post-authentification. Le logout est l'unique exception de 002 : il ne requiert pas de rôle encore valide, ne touche aucune donnée métier et nettoie seulement la session courante. Un administrateur déjà autorisé ouvrant `/admin/connexion` va toujours vers `/admin`; `returnTo` n'est pris en compte qu'après une nouvelle connexion réussie. Le layout protégé peut éviter de rendre son chrome en cas de refus, mais n'est jamais la seule barrière. Les futures mutations restent en plus soumises aux politiques RLS existantes.

**Cache Boundaries**: `cacheComponents` reste désactivé. Seul `React.cache()` peut dédupliquer un contrôle au sein d'un même rendu serveur ; aucune identité, décision d'autorisation ou page admin ne reçoit `use cache`, `unstable_cache` ou une restitution partagée. Toutes les réponses `/admin` portent `Cache-Control: private, no-store` et les en-têtes fournis par `@supabase/ssr` lors d'un changement de cookie sont conservés.

## Phase 0: Research

[research.md](./research.md) fixe les choix SSR, Proxy/DAL, preuve de session courante, actions, redirections sûres, déconnexion, isolation du cache, structure des layouts, erreurs, tests et compatibilité Netlify. Toutes les incertitudes techniques sont résolues sans élargir le MVP.

## Phase 1: Design & Contracts

- [data-model.md](./data-model.md) décrit les entités Auth existantes, le wrapper RPC, les DTO éphémères, les invariants et les transitions de session.
- [contracts/authentication.md](./contracts/authentication.md) fixe les entrées/sorties des actions de connexion et déconnexion, y compris la classification publique des erreurs.
- [contracts/admin-access.md](./contracts/admin-access.md) fixe le RPC, la DAL, les gardes de pages/actions et la matrice d'autorisation.
- [contracts/session-refresh.md](./contracts/session-refresh.md) fixe le matcher Proxy, le transfert des cookies/en-têtes, les redirections et les règles de cache.
- [contracts/verification.md](./contracts/verification.md) relie les exigences aux tests pgTAP, Auth, Playwright, Axe, Safari mobile et contrôles de dépôt.
- [quickstart.md](./quickstart.md) fournit la procédure locale reproductible et les gates Netlify/Safari à exécuter pendant l'implémentation.

### Post-design Constitution Re-check

| Gate | Status | Design confirmation |
| --- | --- | --- |
| Périmètre MVP | PASS | Les contrats exposent exactement deux actions et deux pages, sans parcours d'inscription, récupération, MFA, gestion de rôles ou CRUD. |
| Sécurité en profondeur | PASS | Identité cryptographique en Proxy, session/role courants via RPC, gardes serveur proches, RLS et nettoyage du contexte non-admin se cumulent. |
| Next.js 16 | PASS | `cookies()` et `searchParams` restent asynchrones, `proxy.ts` remplace l'ancien middleware et `redirect()` est hors des blocs qui interceptent les exceptions. |
| Reproductibilité | PASS | Migration nommée par la CLI, types générés, fixture locale loopback, nettoyage et commandes d'acceptation sont spécifiés. |
| Design et accessibilité | PASS | Les états, labels, focus, annonces, cibles tactiles, typographies et largeurs sont explicitement vérifiés ; le chrome public est seulement déplacé sans changement de rendu. |
| Erreurs et confidentialité | PASS | Les DTO ne contiennent ni mot de passe, token, session, erreur brute ni email complet ; aucun faux succès n'est permis. |
| Déploiement | PASS | Le plan utilise le support Next.js courant de Netlify, sans option expérimentale, origine large ou secret supplémentaire ; les réponses Auth sont revérifiées en preview. |
| Documentation synchronisée | PASS | Les décisions détaillent l'architecture déjà prévue par `doc/architecture.md` et les extensions déjà définies par `doc/design.md`; aucun besoin, fournisseur ou quota n'est modifié. |

## Complexity Tracking

Aucune violation de la constitution ne nécessite de dérogation.
