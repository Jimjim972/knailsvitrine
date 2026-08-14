# Contract: Service data access

## Purpose

Définir deux lectures séparées : un catalogue public partageable limité aux lignes actives et une lecture administrative privée couvrant toutes les lignes. Aucun composant de présentation ne construit directement une requête Supabase.

## Public read: `getPublicServices()`

### Preconditions

- Exécution serveur uniquement.
- Client Supabase anonyme et sans cookies.
- Variables publiques Supabase valides.

### Query contract

- Tables : `public.categories_prestations` et `public.prestations`, lues en parallèle.
- Colonnes catégorie explicites : `code`, `nom`, `ordre_affichage`, `created_at`, `updated_at`.
- Colonnes explicites : `id`, `nom`, `description`, `categorie`, `prix::text`, `type_prix`, `duree_minutes`, `badge`, `ordre_affichage`, `created_at`.
- Filtre explicite : `actif = true`.
- Tri SQL : `categorie`, `ordre_affichage`, `created_at`, `id` croissants.
- Tri final : ordre/date/code de catégorie, puis ordre/date/ID de prestation.
- Maximum attendu : environ 40 lignes, sans pagination.

### Cache contract

```text
use cache
cacheLife("days")
cacheTag("prestations")
```

La fonction ne doit appeler, directement ou indirectement, ni `cookies()`, ni `headers()`, ni `searchParams`, ni une lecture d'autorisation. Aucune donnée masquée ne peut entrer dans cette valeur partagée.

### Output

`PublicServiceSection[]`, chaque section contenant son DTO `ServiceCategory` et ses `PublicService`. Les sections vides sont retirées au rendu public. Le composant reçoit des libellés déjà formatés et jamais une ligne brute.

### Failure

Une erreur de configuration, réseau, quota ou lecture lève une erreur serveur classée. La route publique affiche un état d'indisponibilité récupérable ; elle ne réutilise pas les constantes codées en dur et ne montre pas une liste vide mensongère.

## Admin list read: `getAdminServices()`

### Preconditions

- `requireAdminPage("/admin/prestations")` confirmé dans la page.
- Client SSR Supabase par requête avec cookies courants.
- Aucun cache Next partagé ou privé.

### Query contract

- Colonnes explicites : tous les champs de `AdminService`, avec `prix::text`.
- Aucun filtre `actif` : l'administrateur voit actifs et masqués.
- Même tri déterministe que le contrat public.
- La requête reste soumise à la politique RLS authenticated.

### Output

`AdminService[]`. Une réponse vide est un état métier valide seulement après une lecture réussie.

### Failure

- Session refusée : redirection vers la connexion par la garde existante.
- Autorisation indisponible : état admin indisponible, aucune donnée.
- Requête échouée : état erreur récupérable, jamais état vide.

## Admin detail read: `getAdminService(id)`

### Preconditions

- Page dynamique avec `params` awaited.
- UUID validé avant la requête.
- Garde page forte exécutée pour le chemin de modification.

### Query

Même sélection que l'admin list, filtrée par `id`, résultat au plus un.

### Result

- Une ligne : `AdminService` pour le formulaire.
- Zéro ligne : état introuvable sûr, sans révéler si la cible existe hors autorisation.
- Erreur : indisponibilité récupérable avec corrélation.

## Admin category read: `getAdminServiceCategories()`

- Garde `requireAdminPage()` exécutée par la page appelante.
- Client SSR courant, aucun cache partagé.
- Colonnes explicites `code`, `nom`, `ordre_affichage`, `created_at`, `updated_at`.
- Ordre `ordre_affichage`, `created_at`, `code`.
- La liste alimente les formulaires ; une réponse vide est valide et désactive la création/modification de prestation.

## Category grouping

Le mapper initialise un groupe par catégorie lue en base, selon l’ordre de catégorie. Les services dont la catégorie n’est pas présente ne sont jamais inventés. Une catégorie sans ligne active n’est pas rendue publiquement.

## Prohibited patterns

- `select("*")` ;
- client SSR cookie-aware dans `getPublicServices()` ;
- cache de `getAdminServices()`, `getAdminService()` ou d'une décision d'autorisation ;
- transmission de `image_path`, `updated_at` ou `actif` au composant public ;
- dépendance sur l'ordre lexical des codes de catégorie ;
- résultat de secours issu des anciennes constantes statiques.
