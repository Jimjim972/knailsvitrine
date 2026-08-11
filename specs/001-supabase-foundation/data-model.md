# Phase 1 Data Model: Fondation Supabase

## Conventions communes

- Les identifiants sont des `uuid` avec `gen_random_uuid()` par défaut.
- Les dates sont des `timestamptz NOT NULL DEFAULT now()` calculées par PostgreSQL.
- Un trigger `BEFORE UPDATE` appelle `private.set_updated_at()` pour remplacer `updated_at` par l'heure serveur.
- Les contraintes sont nommées afin que les erreurs de validation puissent être classées sans exposer le SQL.
- Les valeurs textuelles obligatoires sont contrôlées après `btrim` ; les valeurs facultatives sont soit `NULL`, soit non vides après normalisation.
- Les listes publiques utilisent `ordre_affichage ASC, created_at ASC, id ASC`. `id` départage uniquement les égalités complètes et rend le résultat déterministe.

## Entity: `public.prestations`

| Column | PostgreSQL type | Null/default | Invariant |
| --- | --- | --- | --- |
| `id` | `uuid` | non nul, UUID généré | Clé primaire |
| `nom` | `text` | non nul | Longueur de `btrim(nom)` entre 2 et 120 caractères |
| `description` | `text` | non nul | Longueur de `btrim(description)` entre 1 et 1 000 caractères |
| `categorie` | `text` | non nul | `onglerie_manucure`, `soins_corps` ou `esthetique_visage` |
| `prix` | `numeric` | nullable | Valeur de 0 à 99 999 999,99, au plus deux décimales |
| `type_prix` | `text` | non nul | `fixed`, `starting_at` ou `quote` |
| `duree_minutes` | `integer` | nullable | Entre 5 et 600 inclus |
| `badge` | `text` | nullable | Si présent, longueur de `btrim(badge)` entre 1 et 40 |
| `image_path` | `text` | nullable | Si présent, valeur non vide après `btrim` |
| `ordre_affichage` | `integer` | non nul, `0` | Supérieur ou égal à zéro, non unique |
| `actif` | `boolean` | non nul, `true` | Visibilité publique |
| `created_at` | `timestamptz` | non nul, `now()` | Immuable dans le contrat applicatif |
| `updated_at` | `timestamptz` | non nul, `now()` | Maintenu par trigger |

### Couplage prix/type

- `fixed` et `starting_at` exigent un `prix` non nul.
- `quote` exige `prix IS NULL`.
- Depuis la migration 003, `numeric` sans typmod évite l'arrondi silencieux avant contrainte ; des contraintes nommées refusent les valeurs hors plage ou comportant plus de deux décimales.
- Le stockage PostgreSQL demeure la source de vérité ; les couches TypeScript utilisent des cents entiers et ne traitent jamais un flottant comme valeur métier.

### Contraintes nommées

`prestations_nom_length_check`, `prestations_description_length_check`, `prestations_categorie_check`, `prestations_type_prix_check`, `prestations_prix_bounds_check`, `prestations_prix_scale_check`, `prestations_prix_matches_type_check`, `prestations_duree_minutes_check`, `prestations_badge_check`, `prestations_image_path_check` et `prestations_ordre_affichage_check`.

### Index

```text
prestations_public_category_order_idx
  (categorie, ordre_affichage, created_at, id)
  WHERE actif = true
```

L'index primaire couvre l'accès direct par `id`. Aucun index d'administration supplémentaire n'est prévu au volume du MVP avant mesure réelle.

## Entity: `public.photos_galerie`

| Column | PostgreSQL type | Null/default | Invariant |
| --- | --- | --- | --- |
| `id` | `uuid` | non nul, UUID généré | Clé primaire |
| `storage_path` | `text` | non nul | Unique, forme `photos/<uuid-v4-minuscule>.<jpg|jpeg|png|webp>` |
| `alt_text` | `text` | non nul | Longueur de `btrim(alt_text)` entre 1 et 200 caractères |
| `titre` | `text` | nullable | Si présent, non vide après `btrim` |
| `libelle` | `text` | nullable | Si présent, non vide après `btrim` |
| `lien_externe` | `text` | nullable | Si présent, commence par `https://` et constitue une URL HTTPS validable côté application |
| `variante_affichage` | `text` | non nul | `featured`, `small`, `wide_small`, `wide_large` ou `social` |
| `width` | `integer` | non nul | Strictement positif |
| `height` | `integer` | non nul | Strictement positif |
| `mime_type` | `text` | non nul | `image/jpeg`, `image/png` ou `image/webp` |
| `size_bytes` | `integer` | non nul | Entre 1 et 8 388 608 inclus |
| `ordre_affichage` | `integer` | non nul, `0` | Supérieur ou égal à zéro, non unique |
| `actif` | `boolean` | non nul, `true` | Visibilité de la métadonnée dans la liste publique |
| `created_at` | `timestamptz` | non nul, `now()` | Immuable dans le contrat applicatif |
| `updated_at` | `timestamptz` | non nul, `now()` | Maintenu par trigger |

La contrainte SQL de `lien_externe` impose le schéma HTTPS. La future validation Zod devra aussi construire une URL valide avant mutation, car une expression SQL seule n'est pas un parseur d'URL complet.

### Contraintes nommées

`photos_galerie_storage_path_check`, `photos_galerie_alt_text_length_check`, `photos_galerie_titre_check`, `photos_galerie_libelle_check`, `photos_galerie_lien_externe_https_check`, `photos_galerie_variante_affichage_check`, `photos_galerie_width_check`, `photos_galerie_height_check`, `photos_galerie_mime_type_check`, `photos_galerie_storage_mime_match_check`, `photos_galerie_size_bytes_check` et `photos_galerie_ordre_affichage_check`.

### Index

```text
photos_galerie_storage_path_key
  UNIQUE (storage_path)

photos_galerie_public_variant_order_idx
  (variante_affichage, ordre_affichage, created_at, id)
  WHERE actif = true
```

## Entity: fichier de galerie

Le fichier est un objet Supabase Storage, pas une ligne applicative supplémentaire.

| Property | Contract |
| --- | --- |
| Bucket | `galerie`, public |
| Object name | Identique à `photos_galerie.storage_path` |
| Prefix | `photos/` |
| Canonical segment | UUID ; la future gestion de galerie le générera sans réutiliser le nom fourni par l'utilisateur |
| Extensions | `jpg`, `jpeg`, `png`, `webp` |
| MIME | JPEG, PNG ou WebP |
| Maximum input size | 8 MiB |

`storage_path` est une référence logique unique, sans clé étrangère vers `storage.objects`. Cette fondation valide seulement la forme (UUID v4 minuscule et extension autorisée) et prépare les droits séparés. La future gestion de galerie générera le chemin, coordonnera l'objet et sa métadonnée, puis prévoira une reprise en cas d'échec partiel. Un UUID généré dans un contrôle d'intégration reste une donnée de test, pas le générateur applicatif différé.

La borne visuelle cible de 1 600 px s'applique après le traitement d'image futur ; elle n'est pas une contrainte de métadonnée livrée par cette fondation. Ici, les dimensions persistées doivent seulement être positives.

## Entity: administrateur courant

L'administrateur n'est pas une table métier dans ce MVP. Il correspond à un utilisateur Supabase Auth qui satisfait les deux invariants suivants :

1. le JWT courant contient `app_metadata.role = "admin"` ;
2. son claim `session_id` référence encore une ligne de `auth.sessions` appartenant à `auth.uid()`.

La fonction `private.is_current_admin()` encapsule ce test. Elle n'accepte aucun argument utilisateur, se trouve hors schéma exposé, utilise un `search_path` vide et n'accorde `EXECUTE` qu'au rôle `authenticated`.

## Identity service configuration

La fermeture de l'inscription n'est pas une ligne métier. Elle fait néanmoins partie de l'état reproductible de la fondation :

- `auth.enable_signup = false` ;
- `auth.enable_anonymous_sign_ins = false` ;
- `auth.email.enable_signup = false` ;
- `auth.sms.enable_signup = false` ;
- aucun fournisseur d'identité externe n'est activé dans cette fondation ;
- la création d'un compte reste réservée à une procédure administrative protégée, hors navigateur et hors de cette feature.

Le projet hébergé devra recevoir la configuration équivalente lors d'un déploiement autorisé ; aucune modification distante n'est exécutée par ce plan.

## Relations et ownership

- Une ligne `photos_galerie` référence exactement un chemin de fichier logique, mais l'existence physique est contrôlée par les workflows Storage.
- Plusieurs prestations peuvent employer la même catégorie et le même ordre d'affichage.
- Plusieurs photos peuvent employer la même variante et le même ordre d'affichage.
- Aucune relation entre `prestations` et `photos_galerie` n'est requise dans cette feature.
- Les fonctions d'infrastructure appartiennent au schéma `private`; les tables exposées appartiennent à `public`.

## State transitions

### Prestations et métadonnées de photos

```text
créée active ──► masquée ──► réactivée
      │             │
      └─────────────┴──────► supprimée définitivement
```

- `actif = false` conserve la ligne pour l'administration et la retire des listes publiques.
- La suppression est définitive au niveau de la base ; sa confirmation relève de la future interface.
- La suppression d'une métadonnée et celle d'un objet sont deux capacités séparées dans cette fondation ; les contrôles peuvent créer une divergence temporaire et la nettoient ensuite, sans la présenter comme un workflow produit coordonné.

### Droits administrateur

```text
compte créé manuellement
  └─► rôle ajouté dans app_metadata
       └─► jeton rafraîchi = accès admin
            └─► rôle retiré + sessions révoquées = accès refusé
```

## Validation and test invariants

- Chaque contrainte accepte ses limites valides et refuse une valeur juste en dehors de chaque limite.
- Chaque update autorisé avance `updated_at` à l'heure serveur et remplace une valeur fournie par l'appelant.
- Un doublon de `ordre_affichage` reste valide et conserve un tri déterministe.
- Des jeux de 40 prestations et 100 photos conservent le même tri stable, sans pagination publique.
- Un doublon de `storage_path` est refusé.
- `anon` et `authenticated` non-admin ne reçoivent que les lignes actives.
- Seul l'administrateur courant peut lire les lignes inactives et muter les deux tables.
- Aucun profil non-admin ne peut créer, remplacer ou supprimer un objet Storage.
- Toute tentative d'auto-inscription par l'API Auth publique est refusée sans créer d'utilisateur.
- Chaque contrôle en échec reçoit exactement une catégorie parmi `validation`, `authorization`, `privilege` et `internal`.
- La fondation 001 ne contenait aucun seed ; la migration 003 reprend désormais les huit prestations publiques initiales avec UUID et timestamps déterministes. Aucun seed de photos n'est inclus.
