# Implementation Plan: Fondation Supabase

**Branch**: `001-supabase-foundation` *(contexte Spec Kit ; branche Git de travail actuelle : `dev`)* | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-supabase-foundation/spec.md`

## Summary

Établir un socle Supabase reproductible pour les prestations et la galerie : schéma PostgreSQL contraint, bucket public de diffusion, inscriptions publiques désactivées, droits explicites, politiques RLS pour les profils `anon`, connecté non-admin et administrateur, clients Next.js typés et contrôles de sécurité catégorisés. L'administration repose sur `app_metadata.role = "admin"` et sur une session Supabase encore active ; aucune interface, donnée existante, orchestration de suppression galerie, génération applicative de chemin ou modification de production n'entre dans cette fonctionnalité.

## Technical Context

**Language/Version**: TypeScript strict 5.9, SQL PostgreSQL/Supabase, Node.js 22 LTS

**Primary Dependencies**: Next.js 16.3.0, React 19.2.8, `@supabase/supabase-js` 2.112.2, `@supabase/ssr` 0.12.4, Zod 4.4.3, Supabase CLI 2.112.0

**Storage**: Supabase PostgreSQL, Supabase Auth et bucket Supabase Storage public `galerie`

**Testing**: pgTAP via `supabase test db`, intégration HTTP locale Auth/Storage avec la clé publiable et des sessions réelles, sorties autonomes et rapport agrégé conformes au même contrat de diagnostic, lint PostgreSQL, advisors Supabase, contrôle de dérive des types générés, ESLint, `tsc --noEmit`, build Next.js et scan post-build de secrets

**Target Platform**: Netlify pour l'application Next.js et Supabase hébergé ; pile Supabase locale sous Docker pour le développement et les tests

**Project Type**: Application web Next.js unique avec services gérés externes

**Performance Goals**: Lecture publique indexée et stable d'environ 40 prestations et jusqu'à 100 photos, sans pagination ni requête N+1 ; aucun SLA de latence n'est fixé pour ce socle local, la mesure de bout en bout étant différée au branchement des pages et à la validation Netlify

**Constraints**: Offres gratuites, aucune clé secrète dans le client, RLS sur tout objet exposé, inscription publique refusée au niveau Auth, HTTP admis uniquement pour les hôtes loopback exacts (`localhost`, `127.0.0.1`, `[::1]`) et HTTPS exigé ailleurs, commandes Supabase destructives forcées en mode local, capacité administrative locale capturée en mémoire uniquement pour créer/inspecter/nettoyer les fixtures, pas d'ORM, pas de `service_role` pour une opération applicative testée, pas de mutation de production, aucune interface ou import de contenu dans cette fonctionnalité

**Scale/Scope**: Deux tables métier, un bucket public, un seul rôle administrateur, trois profils d'accès et cinq variantes de galerie

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence |
| --- | --- | --- |
| Périmètre MVP | PASS | Le plan se limite au socle de données, d'identité et de fichiers ; réservation, paiement, parcours public de création de compte, UI et import restent exclus, tandis que l'endpoint d'inscription est explicitement fermé. |
| Sources de vérité | PASS | `doc/spec.md`, `doc/design.md`, `doc/architecture.md`, `doc/infra.md`, les guides Next.js locaux et la documentation Supabase actuelle ont été consultés dans l'ordre requis. |
| Next.js 16 | PASS | Les clients SSR utilisent les API asynchrones ; aucun ancien `middleware.ts` ni `proxy.ts` prématuré n'est prévu. |
| Supabase reproductible | PASS | Le schéma, les politiques, les droits et les tests passent par la CLI et des migrations versionnées. |
| Authentification et RLS | PASS | L'inscription publique est désactivée et les politiques vérifient un rôle contrôlé dans `app_metadata` ainsi qu'une session active au plus près de chaque donnée. |
| Storage | PASS | Le bucket, les MIME, la taille, le préfixe et les opérations `SELECT`/`INSERT`/`UPDATE`/`DELETE` sont explicitement bornés et vérifiés via la vraie API locale. |
| Cycle de suppression photo | PASS | Cette fondation n'expose aucune opération produit de suppression de photo : elle prouve seulement deux permissions isolées. Le futur workflow galerie reste tenu de traiter objet et métadonnée avec reprise en cas d'échec partiel. |
| TypeScript et validation | PASS | Les clients consomment des types générés et les variables publiques sont validées avec Zod. |
| Frontend et design | PASS | Aucun changement visuel ou interactif n'est inclus ; `doc/design.md` reste inchangé. |
| Vérification | PASS | Une matrice automatisée couvre `anon`, non-admin et admin, avec API Auth/Storage, charge 40/100, sorties catégorisées, lint, advisors, types, TypeScript, build et scan de secrets. |

## Project Structure

### Documentation (this feature)

```text
specs/001-supabase-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── access-control.md
│   ├── data-access.md
│   ├── diagnostics.md
│   ├── environment.md
│   └── storage.md
└── tasks.md                 # Produit ensuite par $speckit-tasks
```

### Source Code (repository root)

```text
.
├── .env.example
├── .nvmrc
├── app/                     # App Router existant, non modifié par cette feature
├── lib/
│   └── supabase/
│       ├── client.ts        # Client navigateur à clé publiable
│       ├── database.types.ts
│       ├── env.ts           # Validation des deux variables publiques
│       └── server.ts        # Client serveur par requête, marqué server-only
├── supabase/
│   ├── config.toml          # Projet local, inscription fermée et bucket galerie
│   ├── migrations/
│   │   └── <cli-timestamp>_supabase_foundation.sql
│   └── tests/
│       └── database/
│           ├── 00_test_helpers.sql
│           ├── 01_schema_constraints.sql
│           ├── 02_public_access.sql
│           ├── 03_admin_table_access.sql
│           ├── 04_storage_policies.sql
│           ├── 05_foundation_inventory.sql
│           └── 06_scale_and_order.sql
├── scripts/
│   ├── check-auth-signup.mjs       # Refus Auth local et sortie structurée
│   ├── check-supabase-storage.mjs  # Matrice Storage locale et sortie structurée
│   └── run-foundation-checks.mjs   # Garde locale, orchestration et catégorie unique
├── package.json
└── package-lock.json
```

**Structure Decision**: Conserver l'application Next.js unique et ajouter une couche Supabase minimale sous `lib/supabase`. Le dossier `supabase/` porte la configuration locale, les migrations et les tests pgTAP ; `scripts/` porte les contrôles de service Auth/Storage et leur rapport catégorisé. Aucun backend, ORM ou projet séparé n'est introduit.

**Test Execution Boundaries**: Avant tout reset ou contrôle, le lanceur vérifie une URL loopback et utilise exclusivement les variantes CLI locales confirmées par `--help`. Les scripts obtiennent la capacité administrative de la pile locale depuis la sortie machine de `supabase status`, la conservent seulement en mémoire, ne l'affichent jamais et l'emploient uniquement pour les fixtures. La matrice de `lib/supabase/env.ts` est exécutée avec le support natif de suppression des types de Node.js 22, vérifié par `node --help`, sans ajouter de framework de test.

## Phase 0: Research

Les décisions de versions, d'intégration SSR, de modèle relationnel, de droits, de RLS et de Storage sont consignées dans [research.md](./research.md). Les recherches ont éliminé les incertitudes techniques sans élargir le périmètre fonctionnel.

## Phase 1: Design & Contracts

- [data-model.md](./data-model.md) fixe les colonnes, contraintes, index, transitions et invariants d'identité.
- [contracts/data-access.md](./contracts/data-access.md) définit les lectures et mutations attendues par les futures couches applicatives.
- [contracts/access-control.md](./contracts/access-control.md) définit les profils, droits, politiques et refus attendus.
- [contracts/storage.md](./contracts/storage.md) définit le bucket, les objets admis et les permissions d'écriture séparées, sans implémenter le workflow galerie futur.
- [contracts/diagnostics.md](./contracts/diagnostics.md) fixe le format des contrôles et les quatre catégories de panne autorisées.
- [contracts/environment.md](./contracts/environment.md) fixe versions, variables et séparation des clients.
- [quickstart.md](./quickstart.md) documente l'établissement et la vérification locale de la fondation.

### Post-design Constitution Re-check

| Gate | Status | Design confirmation |
| --- | --- | --- |
| Périmètre MVP | PASS | Les contrats n'exposent que les deux domaines et un rôle administrateur. |
| Sécurité en profondeur | PASS | Fermeture de l'inscription, `GRANT`, privilèges par défaut fermés, RLS, helper privé et contrôles HTTP Storage/Auth sont cumulés. |
| Cycle de vie Storage | PASS | Les contrats n'assimilent pas les suppressions isolées au workflow produit ; la future galerie conserve l'obligation constitutionnelle de traiter ensemble objet et ligne dans un état récupérable. |
| Reproductibilité | PASS | Une réinitialisation locale, la configuration Auth, les migrations, le bucket configuré, les types générés et le lanceur de contrôles suffisent à reconstruire et vérifier le socle. |
| Contraintes métier | PASS | Les règles documentées sont imposées par PostgreSQL, pas seulement par les futurs formulaires. |
| Compatibilité actuelle | PASS | Node.js 22 et les versions exactes des bibliothèques Supabase évitent les incompatibilités observées avec Node.js 20. |
| Documentation synchronisée | PASS | Les artefacts intègrent les cinq clarifications ; aucune exigence visuelle n'est modifiée et les workflows galerie différés sont identifiés sans être simulés. |

## Complexity Tracking

Aucune violation de la constitution ne nécessite de dérogation.
