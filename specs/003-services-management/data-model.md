# Data Model: Gestion des prestations

## Existing foundation and migration scope

La fonctionnalité réutilise `public.prestations`. La migration 003 ne crée aucune nouvelle table. Elle doit être créée avec la CLI installée et réaliser, dans cet ordre logique :

1. durcir la représentation et les contraintes de `prix` ;
2. consolider les politiques `SELECT` de `prestations` sans changer la matrice d'accès ;
3. insérer les huit prestations statiques avec identifiants et ordres déterministes ;
4. laisser les politiques de mutation, le trigger `updated_at` et l'index public partiel en place.

Les types Supabase sont régénérés après la migration même si `numeric` continue d'être représenté par `number` dans le type généré.

## Entity: `public.prestations`

| Column | PostgreSQL type after 003 | Null/default | Invariant |
| --- | --- | --- | --- |
| `id` | `uuid` | non nul, UUID généré | Clé primaire et identité stable |
| `nom` | `text` | non nul | `btrim` entre 2 et 120 caractères |
| `description` | `text` | non nul | `btrim` entre 1 et 1 000 caractères |
| `categorie` | `text` | non nul | `onglerie_manucure`, `soins_corps` ou `esthetique_visage` |
| `prix` | `numeric` | nullable | Entre `0` et `99999999.99`, au plus deux décimales, absent pour `quote` |
| `type_prix` | `text` | non nul | `fixed`, `starting_at` ou `quote` |
| `duree_minutes` | `integer` | nullable | Entre 5 et 600 inclus |
| `badge` | `text` | nullable | Si présent, `btrim` entre 1 et 40 caractères |
| `image_path` | `text` | nullable | Reste absent dans le périmètre 003 |
| `ordre_affichage` | `integer` | non nul, `0` | Entier supérieur ou égal à zéro, non unique |
| `actif` | `boolean` | non nul, `true` | Contrôle la visibilité publique |
| `created_at` | `timestamptz` | non nul, serveur | Immuable dans le contrat applicatif |
| `updated_at` | `timestamptz` | non nul, serveur | Remplacé par le trigger avant chaque update |

### Price invariants

- `fixed` et `starting_at` exigent un prix.
- `quote` exige `prix IS NULL`.
- La plage reste celle de l'ancien `numeric(10,2)` : `0` à `99 999 999,99` euros.
- Une valeur avec plus de deux décimales est refusée, pas arrondie.
- La migration remplace la borne fournie auparavant par le typmod par des contraintes nommées vérifiables.
- La valeur persistée PostgreSQL est la source de vérité ; le runtime ne calcule qu'en cents entiers.

### Named constraints affected by 003

Conserver les contraintes existantes de nom, description, catégorie, type, couplage prix/type, durée, badge, image et ordre. Remplacer/compléter la contrainte de prix par :

- `prestations_prix_bounds_check` : prix nul ou compris dans la plage autorisée ;
- `prestations_prix_scale_check` : prix nul ou échelle inférieure ou égale à deux ;
- `prestations_prix_matches_type_check` : couplage montant/type inchangé.

Le SQL final doit éviter deux contraintes redondantes portant le même invariant.

### Indexes

Conserver :

```text
prestations_public_category_order_idx
  (categorie, ordre_affichage, created_at, id)
  WHERE actif = true
```

À environ 40 lignes, aucun nouvel index administratif n'est ajouté avant mesure réelle.

## Access model

### Grants

| Role | Privileges on `public.prestations` |
| --- | --- |
| `anon` | `SELECT` |
| `authenticated` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `service_role` | aucun grant applicatif nécessaire |

Les grants rendent l'opération atteignable ; RLS décide ensuite des lignes.

### RLS policies after consolidation

| Policy intent | Role | Operation | Predicate |
| --- | --- | --- | --- |
| Lecture publique | `anon` | `SELECT` | `actif = true` |
| Lecture authentifiée | `authenticated` | `SELECT` | `actif = true OR private.is_current_admin()` |
| Création admin | `authenticated` | `INSERT` | `private.is_current_admin()` |
| Modification admin | `authenticated` | `UPDATE` | `private.is_current_admin()` en `USING` et `WITH CHECK` |
| Suppression admin | `authenticated` | `DELETE` | `private.is_current_admin()` |

La politique `SELECT` authenticated reste compatible avec l'UPDATE. Une session retirée ou expirée retombe immédiatement sur la lecture des seules lignes actives et ne peut plus muter.

## Product categories

Les catégories ne sont pas une table. Une constante produit unique définit le code, le rang et deux libellés de présentation afin que l'administration reste explicite sans modifier les titres éditoriaux publics :

| Rank | Code | Admin label | Public label |
| --- | --- | --- | --- |
| 0 | `onglerie_manucure` | Onglerie et manucure | Onglerie & Manucure |
| 1 | `soins_corps` | Soins du corps | Soins du Corps |
| 2 | `esthetique_visage` | Esthétique et visage | Esthétique & Visage |

Le visuel, l'eyebrow, le titre d'image et la légende restent dans la configuration publique existante. Le rang produit corrige l'écart entre l'ordre visuel et l'ordre lexical des codes.

## Initial migrated records

Toutes les lignes sont `fixed`, actives, sans `image_path`, avec un UUID v4 fixe et un ordre explicite par catégorie.

| Category | Order | Name | Price | Duration | Badge |
| --- | ---: | --- | ---: | ---: | --- |
| Onglerie & Manucure | 0 | Manucure Russe | 45.00 | 45 | — |
| Onglerie & Manucure | 1 | Pose Vernis Semi-Permanent | 35.00 | 30 | Populaire |
| Onglerie & Manucure | 2 | Pose Complète Gel (Chablons) | 75.00 | 90 | — |
| Soins du Corps | 0 | Modelage Relaxant Sur-Mesure | 85.00 | 60 | — |
| Soins du Corps | 1 | Gommage Corps Éclat | 50.00 | 40 | — |
| Esthétique & Visage | 0 | Soin Signature "Glow" | 95.00 | 75 | — |
| Esthétique & Visage | 1 | Lifting Colombien (Visage) | 120.00 | 60 | Nouveau |
| Esthétique & Visage | 2 | Beauté du Regard | 65.00 | 60 | — |

Les descriptions sont reprises textuellement depuis la page statique. La migration utilise des timestamps explicites et ordonnés afin que le départage reste déterministe même si des ordres sont modifiés ultérieurement.

## Application model: `ServiceCategory`

```text
code: one of the three database category codes
adminLabel: explicit French label for the list and select
publicLabel: unchanged editorial title for the public section
rank: 0 | 1 | 2
public presentation: existing section image and editorial text
```

Cette configuration est en lecture seule pour l'administrateur.

## Application model: exact price

```text
rawInput: French user input retained for recoverable validation
canonicalDecimal: normalized decimal string with at most two digits
minorUnits: safe integer cents used for checks and formatting
databaseValue: PostgreSQL numeric read/written at the adapter boundary
```

Transitions de saisie :

```text
fixed/starting_at + valid amount ──► canonical decimal ──► cents ──► database numeric
quote                          ──► amount removed        ──► NULL
quote → fixed/starting_at      ──► amount required before mutation
```

## Public view model: `PublicService`

| Field | Type | Source/behavior |
| --- | --- | --- |
| `id` | UUID string | Stable React key, never displayed |
| `name` | string | `nom` |
| `description` | string | `description` |
| `category` | category code | Used for grouping |
| `priceLabel` | string | `45 €`, `45,50 €`, « À partir de 45,50 € » or « Sur devis » |
| `durationLabel` | string or null | `<minutes> min` only when present |
| `badge` | string or null | No placeholder when absent |
| `displayOrder` | integer | Ordering proof, not displayed unless needed |
| `createdAt` | timestamp string | Stable tie-breaker, not displayed |

`actif`, `updated_at` and `image_path` are not transmitted to the public component.

## Administrative view model: `AdminService`

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | UUID string | Edit/visibility/delete target |
| `name`, `description` | string | Form and list data |
| `category` | category code + `adminLabel` | List and select |
| `priceType` | `fixed` / `starting_at` / `quote` | Form control |
| `priceMinorUnits` | safe integer or null | Exact form value |
| `durationMinutes` | integer or null | Form value |
| `badge` | string or null | Form/list value |
| `displayOrder` | non-negative integer | Form/list value |
| `active` | boolean | Text status and visibility action |
| `createdAt`, `updatedAt` | timestamp strings | Stable sort and conflict diagnostics |

## Action state

```text
idle
  ├─► validation       (fieldErrors + recoverable values)
  ├─► session_expired  (no mutation)
  ├─► unavailable      (retry or reconnect)
  ├─► not_found        (target disappeared or no longer visible to action)
  ├─► internal         (correlation ID, no provider details)
  └─► success          (confirmed row ID and safe message)
```

Create/update states may retain all non-sensitive raw fields after a recoverable failure. Visibility/delete states retain only the target ID, expected name/status and safe message.

## Service lifecycle

```text
created active ──► hidden ──► active
      │              │
      └──────────────┴──────► permanently deleted
```

- Hiding preserves every field and removes the row from anon reads.
- Reactivating restores public eligibility at the same category/order.
- Deletion removes exactly one row and has no Storage side effect in 003.
- Concurrent edits follow last confirmed write wins; a missing target returns `not_found`, never success.

## Query ordering

Within a category:

```text
ordre_affichage ASC, created_at ASC, id ASC
```

Across categories, use `ServiceCategory.rank`. Duplicate display orders remain valid. Both public and admin DTO mappers must produce the same deterministic order.
