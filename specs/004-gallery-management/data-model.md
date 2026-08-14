# Data Model: Gestion de la galerie

## 1. Entité PostgreSQL `public.photos_galerie`

La table existante reste l'unique source de vérité des métadonnées et de l'état durable des opérations de fichier.

| Colonne | Type | Null | Défaut | Règle |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | non | `gen_random_uuid()` | Clé primaire stable. |
| `storage_path` | `text` | non | — | Unique, chemin du fichier courant/référencé, motif `photos/<uuid-v4>.(jpg|jpeg|png|webp)`. |
| `alt_text` | `text` | non | — | Après trim, 1 à 200 caractères. |
| `titre` | `text` | oui | `null` | Après trim, 1 à 120 caractères lorsqu'il existe. |
| `libelle` | `text` | oui | `null` | Après trim, 1 à 40 caractères lorsqu'il existe. |
| `lien_externe` | `text` | oui | `null` | URL HTTPS validée ; l'application applique une validation URL complète. |
| `variante_affichage` | `text` | non | — | `featured`, `small`, `wide_small`, `wide_large` ou `social`. |
| `width` | `integer` | non | — | Dimension finale positive, au plus 8 192 ; sortie nouvelle au plus 1 600 de large. |
| `height` | `integer` | non | — | Dimension finale positive, au plus 8 192. |
| `mime_type` | `text` | non | — | `image/jpeg`, `image/png` ou `image/webp`; tout nouveau fichier est WebP. |
| `size_bytes` | `integer` | non | — | 1 à 1 048 576 pour la donnée livrée ; la migration rejette les nouvelles métadonnées au-dessus de 1 Mio. |
| `ordre_affichage` | `integer` | non | `0` | Entier positif ou nul. |
| `actif` | `boolean` | non | `true` | Intention de visibilité ; ne suffit pas sans `file_state='ready'`. |
| `file_state` | `text` | non | `ready` | `ready`, `pending` ou `repair_required`. |
| `operation_kind` | `text` | oui | `null` | `create`, `replace` ou `delete` pour une opération non prête. |
| `operation_id` | `uuid` | oui | `null` | Jeton idempotent généré côté serveur. |
| `pending_storage_path` | `text` | oui | `null` | Nouveau WebP réservé `photos/<uuid-v4>.webp`. |
| `pending_width` | `integer` | oui | `null` | Largeur attendue du nouveau fichier, positive et au plus 1 600. |
| `pending_height` | `integer` | oui | `null` | Hauteur attendue du nouveau fichier, positive et au plus 1 600. |
| `pending_size_bytes` | `integer` | oui | `null` | Poids attendu du nouveau fichier, 1 à 1 048 576. |
| `cleanup_storage_path` | `text` | oui | `null` | Objet exact à retirer ; accepte les extensions héritées. |
| `operation_started_at` | `timestamptz` | oui | `null` | Date serveur, présente pour `pending`/`repair_required`. |
| `repair_code` | `text` | oui | `null` | Code fermé : `upload_unconfirmed`, `metadata_unconfirmed`, `invalid_object_bytes`, `new_file_cleanup`, `old_file_cleanup`, `object_delete_unconfirmed`, `row_delete_unconfirmed`, `object_missing`, `stale_pending_no_object` ou `stale_pending_object_present`. |
| `created_at` | `timestamptz` | non | `now()` | Départage stable. |
| `updated_at` | `timestamptz` | non | `now()` | Trigger existant. |

### Contraintes d'état

`ready` impose :

- `operation_kind`, `operation_id`, `pending_storage_path`, `pending_width`, `pending_height`, `pending_size_bytes`, `cleanup_storage_path`, `operation_started_at` et `repair_code` à `null` ;
- `storage_path`, `mime_type`, `width`, `height` et `size_bytes` décrivent le fichier courant.

`pending` et `repair_required` imposent :

- `operation_kind`, `operation_id` et `operation_started_at` non nuls ;
- `actif` peut conserver l'intention de publication, mais RLS rend la ligne non publique ;
- tous les chemins non nuls respectent le motif canonique.

`pending` est exclusivement transitoire. Une opération dont `operation_started_at <= now() - interval '10 minutes'` est éligible à la réconciliation administrative ; l'inspection du chemin attendu choisit `stale_pending_no_object` ou `stale_pending_object_present`, puis la ligne passe à `repair_required` sans suppression automatique.

Lorsqu'un audit confirme que l'objet d'une ligne auparavant `ready` est absent, la même mutation génère côté serveur un nouvel `operation_id`, fixe `operation_kind='replace'`, `operation_started_at=now()` et `repair_code='object_missing'`, sans inventer de `pending_storage_path`. Cette exception fermée signifie « remplacement à préparer » : l'interface peut soit réserver un nouveau fichier en conservant l'identité de la photo, soit démarrer une suppression avec une nouvelle opération ciblée. Aucune action générique de finalisation n'est possible tant qu'un nouveau chemin n'a pas été réservé.

Contraintes par opération :

| Opération | `storage_path` | Nouveau fichier attendu | `cleanup_storage_path` |
| --- | --- | --- | --- |
| `create` | chemin WebP réservé de la future photo | `pending_storage_path` et dimensions/poids attendus présents jusqu'à la finalisation | chemin réservé seulement si un résidu doit être retiré |
| `replace` | ancien fichier courant tant que le basculement n'est pas confirmé, puis nouveau fichier ; chemin manquant conservé comme référence pour `object_missing` | nouveau chemin WebP et dimensions/poids attendus avant bascule, sauf `object_missing` avant réservation | ancien chemin après bascule et avant nettoyage |
| `delete` | fichier courant ciblé | `null` | fichier courant tant que son absence n'est pas confirmée |

La migration doit employer des CHECK nommés, refuser les combinaisons impossibles et ne pas stocker de message brut de fournisseur.

### Index

- Conserver l'unicité de `storage_path`.
- Remplacer `photos_galerie_public_variant_order_idx` par un index partiel sur `(variante_affichage, ordre_affichage, created_at, id)` avec `actif = true AND file_state = 'ready'`.
- Aucun index supplémentaire sur les colonnes d'opération au volume MVP avant mesure.

### RLS et privilèges

| Acteur | Lecture | Écriture |
| --- | --- | --- |
| `anon` | seulement `actif=true AND file_state='ready'` | aucune |
| `authenticated` non-admin | même projection publique | aucune |
| administrateur courant | toutes les lignes et tous les états | insert/update/delete sous `private.is_current_admin()` |

RLS reste activée. Les GRANT explicites restent `SELECT` pour `anon, authenticated` et `INSERT, UPDATE, DELETE` pour `authenticated`; les politiques déterminent ensuite les lignes.

## 2. Objet Storage `galerie/photos/<uuid-v4>.<extension>`

| Propriété | Règle |
| --- | --- |
| Bucket | `galerie`, privé ; toute lecture passe par RLS. |
| Nouveau chemin | `photos/<uuid-v4>.webp`, généré côté serveur. |
| Héritage | `.jpg`, `.jpeg`, `.png`, `.webp` restent lisibles et supprimables. |
| Nouveau MIME | `image/webp`. |
| Taille applicative | 1 à 1 048 576 octets. |
| Upload | Session admin, `upsert:false`, chemin réservé exact. |
| Suppression | API Storage `remove([exactPath])`, jamais SQL direct. |
| Relation logique | À l'état `ready`, exactement un objet attendu par photo ; pas de clé étrangère inter-service possible. |

Le bucket conserve sa limite infrastructure de 8 Mio pour accepter les objets hérités et défendre en profondeur. L'application et les métadonnées imposent 1 Mio aux nouveaux objets.

La politique INSERT lie le `name` WebP à une ligne `pending` dont `pending_storage_path` est identique. La politique DELETE n'autorise que les chemins encore présents dans `storage_path`, `pending_storage_path` ou `cleanup_storage_path` d'une ligne administrable. La politique SELECT administrateur reste bornée au bucket et à `private.is_current_admin()`. Une politique SELECT anonyme séparée autorise uniquement `object.get_authenticated_info` et `object.get_authenticated`, jamais la liste, et seulement si `name` correspond au `storage_path` d'une ligne `actif=true AND file_state='ready'`.

## 3. Modèles applicatifs

### `PublicGalleryPhoto`

- `id`, `imageUrl` (toujours `/api/gallery-images/<id>`), `altText`, `title`, `label`, `externalUrl`, `variant`, `width`, `height`, `displayOrder`.
- Ne contient ni `file_state`, chemins de compensation, dates d'opération, `repair_code`, `actif`, MIME interne ni erreur fournisseur.

### `AdminGalleryPhoto`

- Tous les champs administrables et les caractéristiques finales.
- Statut dérivé : `active`, `hidden` ou `repair_required` ; `pending` n'est pas présenté comme réussite et reste actionnable selon l'opération.
- Une URL de miniature même origine est construite uniquement à partir de l'ID ; le handler relit le chemin. Un objet absent produit l'état réparable, pas une mise en page publique cassée ni une fuite du chemin.

### `PreparedImage`

- Blob/File WebP final ; `mimeType='image/webp'`; `width`; `height`; `sizeBytes`; `quality` dans `0.85|0.8|0.75`; `hasAlpha`; URL d'aperçu temporaire.
- Objet client éphémère, jamais sérialisé en base ; l'URL `blob:` est révoquée.

### `GalleryActionState`

État discriminé : `idle`, `validation`, `pending`, `success`, `session_expired`, `forbidden`, `not_found`, `conflict`, `network`, `quota`, `repair_required`, `internal`.

- `fieldErrors` contient uniquement les champs attendus.
- `operationId`/chemin réservé ne sont transmis au client qu'au strict besoin de l'upload courant et sont revalidés à la finalisation.
- Les détails Supabase/SQL, cookies, jetons et traces sont exclus.

## 4. Transitions

### Visibilité

```text
hidden ready --activate--> active ready
active ready --hide-----> hidden ready
active/hidden --file operation--> non-public pending
pending --partial failure-------> non-public repair_required
repair_required --repair-------> active/hidden ready OR deleted
```

### Création

1. Aucun enregistrement.
2. Réservation : ligne `pending/create`, chemin WebP et `operation_id`.
3. Upload direct.
4. Finalisation vérifiée : métadonnées Storage bornées, téléchargement du chemin exact, validation RIFF/dimensions/chunks, puis `ready`, métadonnées finales, intention `actif` et champs d'opération vidés.
5. Annulation/échec : supprimer la réservation si aucun objet ; sinon retirer l'objet ou conserver `repair_required`.

### Remplacement

1. Photo `ready`, ancien objet.
2. Passage `pending/replace`, ancien `storage_path`, nouveau `pending_storage_path`.
3. Upload nouveau fichier.
4. Validation serveur des octets du nouveau fichier, puis bascule vers le nouveau `storage_path` et déplacement de l'ancien vers `cleanup_storage_path` dans une mutation ciblée.
5. Suppression de l'ancien objet.
6. Retour `ready`; si une étape échoue, `repair_required` conserve les deux chemins nécessaires.

### Suppression

1. Photo `ready` ou réparable.
2. Passage `pending/delete`, non public, objet courant dans `cleanup_storage_path`.
3. Suppression Storage ; une absence déjà confirmée est idempotente.
4. Suppression de la ligne.
5. Si l'étape 4 échoue, ligne `repair_required/row_delete_unconfirmed` sans objet, puis reprise ciblée.

## 5. Données initiales

Un bootstrap idempotent séparé reprend les neuf fichiers présents dans `public/images/` avec UUID et chemins Storage WebP déterministes, valeurs finales `ready`, dimensions connues et ordre relatif conservé :

- galerie principale : `nails-signature`, `french-manucure`, `salon-interior`, `manicure-tools`, `botanical-nail-art` ;
- journal social : `berry-coffee`, `matte-blush-nail`, `spa-products`, `berry-manicure`.

Le bootstrap vérifie la cible, s'authentifie comme administrateur et lit un manifeste versionné contenant UUID, chemin source fermé, SHA-256 source, SHA-256 WebP attendu et métadonnées métier. `sharp@0.35.3`, épinglé exactement dans le manifeste et le lockfile, applique orientation, sRGB, encodage WebP et retrait de métadonnées exclusivement depuis `scripts/bootstrap-gallery.mjs` ; un contrôle refuse tout import runtime et le validateur RIFF partagé confirme chaque sortie. Le script ignore une paire ligne-objet déjà conforme et utilise réservation/upload/relecture-validation/finalisation pour toute paire absente. Il s'arrête sur une divergence au lieu d'écraser. Il doit terminer deux fois avec un résultat identique et vérifier les neuf paires avant la bascule publique ; puis seulement la même étape de bascule retire les tableaux métier statiques du code. Aucun lien Instagram définitif ni `service_role` n'est utilisé. La migration SQL ne crée jamais une ligne `ready` dont l'objet n'existe pas.
