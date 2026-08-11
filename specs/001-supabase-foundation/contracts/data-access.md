# Data Access Contract

## Purpose

Ce contrat décrit les opérations que les futures pages et Server Actions pourront construire sur le socle. La présente feature fournit les tables, types et clients ; elle n'implémente pas encore ces fonctions métier.

## Domain constants

```ts
type ServiceCategory =
  | "onglerie_manucure"
  | "soins_corps"
  | "esthetique_visage";

type PriceType = "fixed" | "starting_at" | "quote";

type GalleryVariant =
  | "featured"
  | "small"
  | "wide_small"
  | "wide_large"
  | "social";
```

Ces unions devront être centralisées à partir du contrat de domaine ; elles ne doivent pas être recopiées avec d'autres valeurs dans les formulaires ou composants.

## Read operations

### `listPublicServices(category?)`

- **Caller**: visiteur, utilisateur connecté ou administrateur.
- **Filter**: `actif = true`; `categorie = category` si fourni.
- **Projection**: uniquement les colonnes nécessaires à la page publique.
- **Order**: `ordre_affichage ASC`, `created_at ASC`, `id ASC`.
- **Result**: zéro à environ 40 prestations, sans pagination.
- **Security guarantee**: RLS exclut une ligne inactive même si l'appelant omet le filtre applicatif.

### `listPublicGallery(variant?)`

- **Caller**: visiteur, utilisateur connecté ou administrateur.
- **Filter**: `actif = true`; `variante_affichage = variant` si fourni.
- **Projection**: métadonnées d'affichage uniquement.
- **Order**: `ordre_affichage ASC`, `created_at ASC`, `id ASC`.
- **Result**: jusqu'à 100 photos dans le MVP, sans pagination publique.
- **Security guarantee**: RLS exclut une métadonnée inactive même si l'appelant connaît son UUID.

### `listAdminServices()` / `listAdminGallery()`

- **Caller**: session administrateur courante uniquement.
- **Result**: lignes actives et inactives.
- **Order**: mêmes règles stables que les listes publiques.
- **Failure**: un utilisateur non-admin obtient un résultat vide ou un refus selon l'opération Supabase ; l'application ne doit jamais interpréter ce résultat comme une autorisation.

## Mutation operations

Les futures mutations internes seront des Server Actions. Chaque action devra vérifier la session, vérifier le rôle, valider et normaliser avec Zod, exécuter la mutation via le client lié à la session, traiter l'erreur, puis invalider le cache concerné. La clé `service_role` n'est pas autorisée.

| Operation | Valid caller | Database effect |
| --- | --- | --- |
| `createService` | Administrateur courant | Insère une prestation valide |
| `updateService` | Administrateur courant | Modifie une prestation existante et actualise `updated_at` |
| `deleteService` | Administrateur courant | Supprime définitivement après confirmation UI future |
| `createGalleryPhotoMetadata` | Administrateur courant | Insère une référence de fichier unique après upload réussi |
| `updateGalleryPhotoMetadata` | Administrateur courant | Modifie les métadonnées sans renommer arbitrairement l'objet |
| `deleteGalleryPhotoMetadata` | Administrateur courant | Opération future appartenant au workflow coordonné de la galerie ; la fondation ne teste que la permission SQL isolée |

Une mutation ne doit annoncer sa réussite qu'après confirmation de PostgreSQL. Les valeurs de prix sont validées comme décimales et persistées dans `numeric(10,2)` ; aucun calcul métier ne prend un flottant JavaScript comme source de vérité.

## Typed client contract

- `database.types.ts` est généré depuis la base locale reconstruite par migrations.
- Les clients navigateur et serveur utilisent tous deux le paramètre générique `Database`.
- Les projections explicites sont préférées à `select("*")` dans la future couche d'accès.
- Le module serveur importe `server-only` et retourne une nouvelle instance par contexte de requête.
- Les données privées de session ou d'administration ne sont jamais placées dans un cache partagé.

## Foundation diagnostic contract

Chaque contrôle livré par cette fondation traduit son échec principal dans exactement une des quatre familles suivantes. Le détail du format est défini dans [diagnostics.md](./diagnostics.md).

| Kind | Meaning | Public handling |
| --- | --- | --- |
| `validation` | Variable, entrée ou contrainte de données invalide, y compris unicité | Résumé non sensible du contrôle concerné |
| `authorization` | Profil ou session sans droit suffisant, inscription publique refusée comprise | Résumé générique du refus attendu ou inattendu |
| `privilege` | `GRANT`, droit par défaut ou capacité SQL requise absente/incohérente | Ressource et opération abstraites, sans SQL brut |
| `internal` | Réseau local, service indisponible, quota ou erreur non classée | Contexte minimal non sensible |

Les messages destinés aux utilisateurs, dont les nuances futures `authentication` ou `conflict`, sont hors périmètre. Les messages SQL bruts, corps de réponse sensibles, tokens, cookies, clés, mots de passe et traces ne figurent jamais dans la sortie partageable.

## Non-goals

- Implémenter les fonctions ci-dessus dans cette feature.
- Ajouter cache, Server Actions, Route Handlers, interface `/admin` ou pages publiques connectées.
- Importer les tableaux de prestations et de galerie existants.
- Générer les chemins de production ou orchestrer la suppression fichier/métadonnée.
