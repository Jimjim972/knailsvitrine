# Contract: Accès aux données de galerie

## Lecture publique `getPublicGalleryPhotos()`

### Préconditions

- Module `server-only`.
- Client Supabase anonyme sans cookies.
- URL d'image même origine construite seulement depuis l'ID validé ; aucun chemin Storage dans le DTO public.

### Requête

- Table `public.photos_galerie`.
- Colonnes explicites : `id`, `alt_text`, `titre`, `libelle`, `lien_externe`, `variante_affichage`, `width`, `height`, `ordre_affichage`, `created_at`.
- Filtres explicites : `actif = true`, `file_state = ready`.
- Tri : rang de section, `ordre_affichage`, `created_at`, `id`, tous croissants.
- Aucune pagination jusqu'à 100 lignes ; au-delà, le contrat admin évolue, pas la projection publique du MVP sans besoin mesuré.

### Cache

```text
use cache
cacheLife("days")
cacheTag("galerie")
```

Aucune fonction du graphe d'appel ne lit cookies, headers, session ou autorisation. `updateTag("galerie")` est appelé après chaque changement confirmé de la projection publique et après tout masquage de sécurité vers `pending`/`repair_required`.

### Sortie

Deux tableaux `main` et `social` de `PublicGalleryPhoto`. Les variantes `featured|small|wide_small|wide_large` vont dans `main`; `social` va uniquement dans `social`.

Le filtre empêche la découverte des métadonnées des lignes masquées ou non `ready`. `imageUrl` vaut uniquement `/api/gallery-images/<id>` ; le cache ne contient ni chemin ni URL Storage. Cette même URL applicative est réautorisée à chaque demande et cesse de livrer les octets dès que la ligne n'est plus active et `ready`.

### Échec

Une erreur lève une erreur serveur classée et expurgée. La route montre une indisponibilité récupérable, jamais une fausse galerie vide ni les anciens tableaux statiques.

## Lectures administratives

### `getAdminGalleryPhotos()`

- Exige `requireAdminPage('/admin/galerie')` avant lecture.
- Client SSR par requête, aucun cache.
- Colonnes explicites de `AdminGalleryPhoto`, y compris état et chemins nécessaires aux actions de réparation.
- Paramètres serveur validés : page entière >=1, taille fermée de 100 ; la page 1 couvre les 100 premières lignes sans pagination visible si le total ne dépasse pas 100.
- Aucun filtre de visibilité/état ; tri par section, ordre, date et ID avant `range()` stable ; le résultat inclut le total exact et les informations précédente/suivante.
- Une réponse vide réussie est l'état métier vide ; une erreur ne l'est jamais.

### `getAdminGalleryPhoto(id)`

- Attend et valide l'UUID issu de `params` asynchrone.
- Retourne une ligne ou `null` sans révéler si une cible existe hors autorisation.
- Ne construit pas de formulaire à partir d'une ligne supprimée ou non lisible.

## URL et rendu d'image

- La base conserve seulement `storage_path`, jamais une URL complète dépendante de l'environnement.
- L'URL publique vaut `/api/gallery-images/<id>` ; l'URL administrative vaut `/api/admin/gallery-images/<id>`.
- Les deux handlers valident `params.id` avec le même schéma Zod UUID partagé de `lib/validations/gallery.ts` ; aucun parseur local divergent n'est autorisé.
- Le handler public revalide le contexte public anonyme — sans prétendre identifier le visiteur — en relisant la ligne active/`ready` et son chemin via le client anonyme, télécharge l'objet du bucket privé avec RLS et l'option fetch `cache:'no-store'`, puis répond `200` avec MIME contrôlé, `Content-Disposition:inline`, `X-Content-Type-Options:nosniff` et `Cache-Control:private, no-store`. UUID invalide, cible non publique et objet absent produisent le même `404` expurgé.
- Le handler administratif relit une session admin courante avant la ligne et sert les miniatures de tous les états avec les mêmes en-têtes non persistants ; session absente/refusée ne révèle pas l'existence de la cible.
- Les images persistées passent à `next/image` avec dimensions, alt, `sizes` et `unoptimized`; aucune règle `remotePatterns` Supabase n'est nécessaire pour ces URLs même origine.
- `GalleryImage` est un Client Component minimal : sur erreur publique, il retire la carte de la vue courante sans détail technique ni espace cassé ; il n'effectue aucune mutation anonyme.
- Sur erreur d'une miniature admin, le composant affiche le contrôle « Vérifier » ; son activation appelle `markGalleryPhotoObjectMissingAction` avec l'ID seulement. La Server Action relit le chemin, confirme l'absence et persiste `repair_required/object_missing` ; un échec réseau ne devient pas une absence et plusieurs miniatures absentes ne lancent pas une rafale automatique.

## Interdictions

- `select('*')` ;
- client cookie-aware dans la lecture publique ;
- cache d'une lecture admin ou d'un état d'opération ;
- URL Storage, `actif` ou `file_state` fournis par le navigateur comme vérité ;
- lien signé dont la durée pourrait dépasser un masquage ou une révocation de session ;
- secours à partir des tableaux statiques après la bascule ;
- ordre lexical des variantes comme ordre produit ;
- réponse d'image publiquement cachable ou redirection vers l'URL Storage.
