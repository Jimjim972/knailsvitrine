# Architecture de l'application

## Vue d'ensemble

Le projet reste une seule application Next.js. Il n'est pas nécessaire de créer un serveur Express ou un second projet backend : les composants serveur, Server Actions et Route Handlers de Next.js assurent la logique applicative, tandis que Supabase fournit les services de données.

```text
Visiteur
   |
   v
Application Next.js sur Netlify
   |-- pages publiques
   |-- espace /admin protégé
   |-- composants serveur et actions serveur
   |-- garde Edge des POST du formulaire de contact
   `-- définition HTML statique détectée par Netlify Forms
   |
   v
Supabase
   |-- PostgreSQL : catégories, prestations et métadonnées des photos
   |-- Auth : connexion de l'administrateur
   `-- Storage : fichiers de la galerie
```

## Parties de l'application

### Site public

- page d'accueil ;
- liste des prestations actives ;
- galerie des photos visibles ;
- page de contact ;
- aucune authentification requise.

### Espace d'administration

L'espace `/admin` permettra à l'administrateur de :

- se connecter et se déconnecter ;
- créer, modifier, ordonner, afficher ou masquer une prestation ;
- ajouter, ordonner, afficher, masquer ou supprimer une photo ;
- saisir un texte alternatif pour chaque image.

Il n'est pas prévu d'ouvrir l'inscription au public. L'auto-inscription doit être désactivée dans Supabase Auth, y compris pour les appels directs qui contournent l'interface. Le premier compte administrateur sera créé manuellement dans Supabase.

## Modèle de données initial

### Table `categories_prestations`

| Colonne | Type indicatif | Rôle |
| --- | --- | --- |
| `code` | `text` | Identifiant technique stable, généré côté serveur |
| `nom` | `text` | Libellé public et administratif unique |
| `ordre_affichage` | `integer` | Rang entre catégories |
| `created_at` | `timestamptz` | Départage stable |
| `updated_at` | `timestamptz` | Date de dernière modification |

La table est lisible publiquement afin de construire le catalogue. Seul l’administrateur courant peut insérer, modifier ou supprimer une catégorie. `prestations.categorie` référence sa clé primaire avec `ON UPDATE RESTRICT ON DELETE RESTRICT` : le code reste stable et une catégorie encore utilisée ne peut jamais être supprimée en cascade.

### Table `prestations`

| Colonne | Type indicatif | Rôle |
| --- | --- | --- |
| `id` | `uuid` | Identifiant unique |
| `nom` | `text` | Nom de la prestation |
| `description` | `text` | Présentation détaillée |
| `prix` | `numeric` | Prix exact borné à 99 999 999,99 et limité par contrainte à deux décimales pour `fixed` ou `starting_at`, absent pour `quote` |
| `type_prix` | `text` | `fixed`, `starting_at` ou `quote` |
| `duree_minutes` | `integer` | Durée indicative |
| `categorie` | `text` | Clé étrangère vers le groupe de prestations |
| `badge` | `text` | Libellé promotionnel facultatif |
| `image_path` | `text` | Chemin d'une image associée |
| `ordre_affichage` | `integer` | Position dans la liste |
| `actif` | `boolean` | Affichage sur le site public |
| `created_at` | `timestamptz` | Date de création |
| `updated_at` | `timestamptz` | Date de dernière modification |

### Table `photos_galerie`

| Colonne | Type indicatif | Rôle |
| --- | --- | --- |
| `id` | `uuid` | Identifiant unique |
| `storage_path` | `text` | Chemin du fichier dans Supabase Storage |
| `alt_text` | `text` | Description accessible de la photo |
| `titre` | `text` | Titre facultatif |
| `libelle` | `text` | Libellé facultatif |
| `lien_externe` | `text` | URL HTTPS facultative |
| `variante_affichage` | `text` | Variante de composition de galerie |
| `width` | `integer` | Largeur finale positive |
| `height` | `integer` | Hauteur finale positive |
| `mime_type` | `text` | Type média contrôlé |
| `size_bytes` | `integer` | Taille du fichier |
| `ordre_affichage` | `integer` | Position dans la galerie |
| `actif` | `boolean` | Affichage sur le site public |
| `file_state` | `text` | Cohérence du couple ligne-fichier : `ready`, `pending` ou `repair_required` |
| `operation_kind` | `text` | Opération `create`, `replace` ou `delete` en cours ou à reprendre |
| `operation_id` | `uuid` | Identifiant idempotent de l'opération |
| `pending_storage_path` | `text` | Nouveau chemin réservé à confirmer |
| `pending_width` | `integer` | Largeur attendue du nouveau fichier |
| `pending_height` | `integer` | Hauteur attendue du nouveau fichier |
| `pending_size_bytes` | `integer` | Poids attendu du nouveau fichier |
| `cleanup_storage_path` | `text` | Ancien chemin ou résidu restant à retirer |
| `operation_started_at` | `timestamptz` | Début serveur de l'opération |
| `repair_code` | `text` | Cause fermée parmi `upload_unconfirmed`, `metadata_unconfirmed`, `invalid_object_bytes`, `new_file_cleanup`, `old_file_cleanup`, `object_delete_unconfirmed`, `row_delete_unconfirmed`, `object_missing`, `stale_pending_no_object` et `stale_pending_object_present` |
| `created_at` | `timestamptz` | Date d'ajout |
| `updated_at` | `timestamptz` | Date de dernière modification |

## Stockage des fichiers

Un bucket Supabase Storage dédié et privé `galerie` contiendra les images de la galerie. La fondation impose le format canonique `photos/<uuid-v4>.<extension-autorisée>` ; la gestion de galerie génère effectivement ce chemin sans réutiliser le nom fourni par l'utilisateur.

Les pages ne reçoivent jamais une URL Storage. Elles utilisent une URL même origine par ID ; une Route Handler relit à chaque requête la ligne active et `ready`, récupère son chemin serveur puis télécharge l'objet privé sous RLS. Un masquage, un état non `ready` ou une suppression rend donc immédiatement la même URL applicative indisponible.

Le bucket accepte les MIME JPEG, PNG et WebP jusqu'à 8 MiB, mais la chaîne applicative refuse APNG et WebP animé avant décodage complet. Une politique SELECT anonyme autorise uniquement les opérations de téléchargement d'un chemin lié à une ligne active/`ready`, jamais la liste ; toutes les écritures restent administratives.

Les politiques Storage restent versionnées dans la migration SQL. La configuration du bucket appartenant au fournisseur — privé, limite 8 MiB et MIME — passe par `supabase/config.toml` en local et par `scripts/configure-gallery-bucket.mjs` via l'API officielle sur une cible hébergée. Ce script idempotent exige une URL/référence concordante et une clé dédiée `sb_secret_...` injectée ponctuellement, vérifie la postcondition puis impose sa révocation ; la clé JWT historique `service_role` et tout chargement par Next.js ou Netlify sont exclus.

La base de données ne contient pas les fichiers eux-mêmes. Elle conserve uniquement leur chemin et leurs métadonnées. Le workflow applicatif masque d'abord la photo, retire l'objet exact par l'API Storage, puis retire la ligne ; un état durable `repair_required` permet de reprendre idempotemment tout échec partiel.

Les envois devront se faire directement vers Supabase Storage avec une session administrateur valide, afin d'éviter de faire transiter les fichiers lourds par les fonctions Netlify. Chaque nouvel ajout ou remplacement utilise un chemin inédit `photos/<uuid-v4>.webp` sans écraser l'ancien objet. Les JPEG et PNG déjà repris restent lisibles.

Les mutations qui traversent PostgreSQL et Storage suivent une reprise compensatoire : une ligne est d'abord masquée dans l'état `pending`, les chemins exacts et l'identifiant d'opération sont conservés, puis l'opération passe à `ready` uniquement lorsque la paire ligne-fichier est cohérente. La finalisation relit d'abord les métadonnées, puis télécharge avec la session administrateur le WebP final borné à 1 Mio et valide ses octets avant publication. Un échec partiel devient `repair_required`, reste invisible au public et peut être repris de manière idempotente. La suppression efface l'objet par l'API Storage avant de retirer définitivement la ligne ; aucun SQL direct ne supprime une ligne de `storage.objects`.

À l'entrée dans la liste administrative, une action réautorisée réconcilie uniquement les opérations `pending` âgées d'au moins 10 minutes vers `stale_pending_object_present` ou `stale_pending_no_object` selon l'inspection du chemin exact, sans suppression automatique. Une miniature admin en échec peut déclencher l'audit du chemin relu côté serveur ; seule une absence confirmée produit `object_missing`. Côté public, la Route Handler retourne un 404 expurgé pour un état non public ou un objet absent et le composant masque la carte cassée dans la vue courante jusqu'à cet audit.

Le bootstrap initial convertit les neuf images existantes avec `sharp@0.35.3`, épinglé exactement dans `package.json` et `package-lock.json` et importé uniquement par `scripts/bootstrap-gallery.mjs`. Un manifeste SHA-256 lie sources, WebP et métadonnées ; l'import passe ensuite par les mêmes réservations, politiques, validations serveur et finalisations que l'administration, sans clé `service_role`. La page publique conserve ses tableaux statiques comme source active jusqu'à deux bootstraps identiques et au contrôle des neuf paires ; la bascule dynamique et leur retrait forment ensuite une seule étape.

## Authentification et autorisations

- lecture publique uniquement pour les prestations et photos actives ;
- création, modification et suppression réservées à l'administrateur authentifié ;
- Row Level Security activée sur toutes les tables exposées ;
- politiques Storage limitant les écritures au compte administrateur ;
- bucket galerie privé et téléchargement public limité par RLS à l'opération, au chemin et à une ligne active/`ready` ;
- utilisation de cookies sécurisés pour la session côté serveur ;
- aucune clé `service_role` exposée au navigateur.

Le rôle est stocké dans `app_metadata` et `private.is_current_admin()` relit sa valeur protégée courante dans `auth.users`. Cette fonction hors schéma exposé exige aussi un `session_id` encore présent, non expiré et rattaché à `auth.uid()` dans `auth.sessions` ; le rôle ancien du JWT et `user_metadata` ne suffisent jamais.

Les clients Supabase sont séparés sous `lib/supabase/` : validation publique partagée dans `env.ts`, types générés dans `database.types.ts`, client navigateur à clé publiable dans `client.ts`, fabrique serveur par requête dans `server.ts` et client response-aware dans `proxy.ts`. Le Proxy Next.js 16 rafraîchit les cookies et préfiltre seulement l'absence d'identité ; la DAL `server-only`, `public.is_current_admin()` puis RLS prennent les décisions fortes au plus près de chaque page ou action sensible. Les réponses `/admin` portent `Cache-Control: private, no-store` et aucune donnée de session n'utilise un cache partagé.

Une perte de session, une révocation ou un retrait du rôle pendant un parcours renvoie vers la connexion avec un motif fermé `session=expired` et une consigne de reconnexion, sans préciser l'identité ni la cause interne. Les mutations déjà ouvertes sont réautorisées au POST et restent sur le formulaire avec le même état sûr lorsqu'elles sont refusées.

## Architecture des gates de sécurité de production

`scripts/check-deploy-target.mjs` lie chaque contrôle distant au SHA, au contexte Netlify, à l'origine et à la référence Supabase attendus. `scripts/check-hosted-supabase-security.mjs` inspecte les privilèges effectifs avec `has_table_privilege`, séparément des politiques RLS, puis lit Auth, bucket, advisors, SSL et restrictions réseau sans mutation. `scripts/check-preview-security.mjs` est le seul runner mutable hébergé : il exige `deploy_preview`, un projet différent de la production et `MUTATION_AUTHORIZED=true`.

Le runner preview crée des identités UUID jetables par la clé secrète de maintenance obtenue au moment du test, puis toutes les preuves CRUD, RPC et Storage utilisent la clé publiable et des sessions anon, membre ou admin réelles. Le nettoyage des objets passe par Storage, celui des lignes par une requête de maintenance bornée aux UUID produits, et celui des identités par Auth Admin. Les trois inventaires sont relus avant de produire `security-preview.md` et `hosted-auth.md`. La clé élevée, les mots de passe, e-mails, JWT, chemins Storage et contenus ne sont jamais écrits dans une preuve.

La migration `production_security_hardening` remplace les deux politiques SELECT permissives superposées de `photos_galerie` par une politique anon active/`ready` et une politique authenticated unique qui réunit projection publique et autorité admin courante. La production reste auditée en lecture seule jusqu'à une autorisation distincte ; un warning ou une configuration non conforme bloque la promotion au lieu d'être corrigé implicitement.

## Métadonnées SEO et découverte

`lib/site/metadata.ts` centralise l'origine canonique, les métadonnées globales et les trois profils de page. `app/layout.tsx` installe `metadataBase` et les métadonnées partagées ; chaque page publique fournit ensuite son titre, sa description, son canonical et son objet Open Graph complets afin d'éviter le remplacement superficiel des champs imbriqués par Next.js.

`app/sitemap.ts` et `app/robots.ts` s'appuient sur `resolveDeploymentContext()` : seule une production Netlify valide et liée à l'origine canonique publie les trois URL indexables. Les previews, branch deploys, environnements locaux ou contextes indéterminés restent fermés aux robots et ne publient aucune URL dans le sitemap. Le layout `/admin`, connexion comprise, impose indépendamment `noindex, nofollow` et ne définit aucun canonical.

`lib/site/structured-data.ts` produit un unique `BeautySalon` JSON-LD à partir des coordonnées confirmées et visibles de `lib/contact-details.ts`. `scripts/check-seo.mjs` vérifie les documents HTTP selon un profil local, preview ou production, puis soumet toute cible hébergée au validateur public Schema.org ; un résultat absent, inaccessible ou inclassable bloque la validation au lieu d'être assimilé à un succès.

## Contrat automatisé d'accessibilité

`tests/helpers/accessibility.ts` centralise les trois viewports obligatoires, les contrôles de reflow, cibles tactiles, focus clavier et réduction des mouvements. Chaque état représentatif produit deux analyses Axe attachées au cas Playwright : un scan WCAG 2.1 A/AA à zéro violation quel que soit l'impact, puis un scan général à zéro anomalie sérieuse ou critique. Le helper n'exclut aucune règle ni aucun nœud ; toute dérogation future devra être explicite, datée et bornée.

Ces contrôles restent des pré-alertes automatisées. Le zoom navigateur, le jugement sur les contrastes complexes et textes alternatifs, Safari sur appareil physique, Firefox réel et les annonces VoiceOver/AT conservent une preuve manuelle distincte et bloquante.

## Organisation Next.js actuelle pour l'authentification

```text
app/
|-- layout.tsx
|-- (public)/
|   |-- layout.tsx
|   |-- services/
|   |-- galerie/
|   `-- contact/
`-- (admin)/admin/
    |-- connexion/
    |-- _actions/
    |-- _components/
    `-- (protected)/

proxy.ts

lib/
|-- auth/
|-- supabase/
|   |-- proxy.ts
|   `-- server.ts
|-- validations/
`-- data/

supabase/
|-- config.toml
|-- migrations/
`-- tests/database/
```

Les routes Prestations et Galerie administratives ne seront ajoutées à cette structure que lorsqu'elles seront fonctionnelles ; l'accueil 002 ne présente aucun lien factice.

## Flux principaux

### Consultation publique

1. Next.js récupère les prestations ou les photos actives.
2. Supabase applique les règles de lecture publique.
3. Next.js produit la page.
4. Le navigateur demande `/api/gallery-images/<id>` ; la Route Handler relit l'état courant et télécharge l'objet privé sous RLS.
5. La réponse transmet l'image sans réencodage avec `Cache-Control: private, no-store`, sans révéler le chemin Storage.
6. Côté navigateur, les deux premières images sont montées après hydratation ; les suivantes attendent le premier défilement puis un `IntersectionObserver` à marge de 800 px, afin d'éviter les doubles requêtes et de borner le coût initial.

### Envoi d'une demande de contact

1. Le build publie `public/__forms.html` avec deux définitions statiques identiques de champs : `contact` pour la production et `contact-preview` pour Deploy Preview, branch deploy et développement. Chacune déclare les quatre champs visibles, le honeypot `bot-field` et un `submission-id` opaque afin que Netlify/OpenNext détecte deux ressources séparées.
2. Le Client Component conserve les valeurs brutes, applique le schéma Zod partagé sur un instantané uniquement débarrassé de ses espaces périphériques, verrouille immédiatement une tentative valide et invoque une Server Action avec `useActionState`. La requête applicative ne contient pas `form-name`.
3. La Server Action revalide les champs et l'UUID avec le même schéma, puis retourne soit des erreurs fermées, soit un instantané normalisé autorisé. Elle ne contacte pas Netlify, n'accepte aucune origine fournie par l'appelant et ne journalise aucune valeur.
4. Après autorisation, le serveur choisit `contact` uniquement pour le contexte Netlify `production` et `contact-preview` pour `deploy-preview`, `branch-deploy`, `dev` ou `local`. Le navigateur ajoute ce nom et envoie l'instantané en `application/x-www-form-urlencoded` vers le chemin relatif constant `/__forms.html`, avec les credentials omis. Le `fetch` navigateur expire exactement après 10 secondes ; une seule action et un seul POST fournisseur sont actifs côté interface.
5. Une Netlify Edge Function attachée à toutes les requêtes POST laisse d'abord intacte, sans lecture ni clonage, toute requête portant l'en-tête interne `Next-Action`, afin de préserver le flux multipart du framework. Elle inspecte ensuite une copie des autres corps et transmet sans changement ceux qui ne déclarent aucun des deux noms Contact. Pour un POST Contact, elle dérive le seul nom autorisé de `context.deploy.context`, refuse en 422 l'absence de contexte fiable ou l'usage croisé production/preview, laisse le honeypot rempli atteindre le rejet silencieux natif, refuse toute donnée visible invalide, puis reconstruit une requête normalisée avant de poursuivre la chaîne Netlify.
6. Netlify Forms applique son honeypot et Akismet, puis sépare les soumissions vérifiées et indésirables dans son interface. `contact` et `contact-preview` possèdent chacun un hook e-mail `submission_created` borné à son `form_id` et son `form_name`; l'objet de la notification preview la rend immédiatement identifiable. Le champ `email` devient le `Reply-To`. Aucun message n'est copié dans Supabase ou `/admin`, et aucune autoréponse n'est envoyée au visiteur.
7. Le client transforme uniquement un HTTP 2xx reçu après l'autorisation serveur en état de succès contrôlé. L'interface peut alors annoncer que le message a été envoyé et vider les champs, sans prétendre connaître le classement final Verified/Spam. Un statut non positif, une erreur réseau ou l'expiration des 10 secondes préserve les quatre valeurs.

Le même `submission-id` est réutilisé après une issue réseau ambiguë afin de corréler un doublon éventuel. Il ne constitue pas une clé d'idempotence : Netlify Forms ne documente pas une garantie de livraison exactement une fois. Un jeton local monotone empêche une réponse tardive d'écraser l'état d'une tentative plus récente.

Les chaînes Server Action d'autorisation → POST AJAX → Edge → Forms et POST direct → Edge → Forms sont des gates de Deploy Preview. Une validation locale seule ne prouve ni la détection du blueprint, ni la réception ou le classement anti-spam.

### Modification d'une prestation

1. L'administrateur se connecte dans `/admin`.
2. Le serveur vérifie la session Supabase.
3. Les données du formulaire sont validées.
4. La prestation est créée ou modifiée dans PostgreSQL.
5. La page publique concernée est actualisée ou revalidée.

La catégorie envoyée par le formulaire est revalidée côté serveur par une lecture de `categories_prestations` avant toute insertion ou modification de prestation. La clé étrangère PostgreSQL reste la garantie finale.

### Cycle de vie d’une catégorie de prestations

1. L’administrateur ouvre `/admin/prestations/categories/nouvelle` depuis la liste ou le formulaire de prestation.
2. La Server Action revalide la session et le rôle courant, puis normalise le nom et l’ordre avec Zod.
3. Le serveur génère un code `category_<uuid-sans-tirets>` et insère la ligne sous RLS ; le navigateur ne choisit jamais le code.
4. Une unicité insensible à la casse et aux espaces périphériques refuse les doublons.
5. Après insertion confirmée, le tag `prestations` est invalidé et un succès ponctuel authentifié ramène à la liste.
6. La catégorie devient sélectionnable immédiatement ; elle n’apparaît sur `/services` que lorsqu’une prestation active lui est associée.

Le renommage et le changement d’ordre suivent la même réautorisation et la même validation, mettent à jour uniquement `nom` et `ordre_affichage`, puis invalident le tag `prestations`. Le code technique n’est jamais modifiable. La suppression demande une confirmation accessible, cible le code validé et retourne un conflit métier expurgé lorsque PostgreSQL signale qu’une prestation référence encore la catégorie. Après déplacement ou suppression de toutes ses prestations, la suppression de la catégorie est confirmée, le cache est invalidé et aucun succès n’est annoncé pour une cible absente.

Les lectures de prix demandent explicitement `prix::text` à PostgREST avant la conversion en centimes, afin qu'aucun nombre JSON flottant ne devienne la source de vérité applicative. Elles conservent aussi le statut de réponse PostgREST : le statut réseau `0`, les annulations/délais et les statuts `429`, `502`, `503` et `504` deviennent une indisponibilité récupérable. Après création, modification ou suppression confirmée, la Server Action émet une preuve HMAC HttpOnly de courte durée, liée à un cookie de garde aléatoire, puis redirige vers la liste. Le Proxy vérifie signature, durée, liaison et registre de consommation avant de transmettre uniquement le type fermé de succès au Server Component. Chaque document `/admin/prestations` efface preuve et garde, puis ajoute l'empreinte du nonce à un registre signé, borné et purgé à expiration. Une altération ou une saturation fait échouer la vérification de façon fermée ; un paramètre d'URL, un cookie littéral ou le rejeu de n'importe quelle preuve encore vivante ne peut donc jamais fabriquer un succès.

### Ajout d'une photo

1. L'administrateur sélectionne une image.
2. Le navigateur inspecte le conteneur, les dimensions, le caractère fixe et le type réel avant décodage, applique l'orientation, convertit les pixels en sRGB, redimensionne puis encode un WebP sans métadonnée à 0,85, 0,80 ou 0,75. Deux fixtures RGBA de 25 points vérifient le chemin sans redimensionnement (0/255 exact, intermédiaires ±1) et le chemin 2 000 × 1 000 vers 1 600 × 800 (gradient analytique, intermédiaires ±3), sans exiger la conservation du RGB caché sous alpha nul.
3. Une Server Action réautorisée réserve une ligne masquée, un identifiant d'opération et un chemin UUID unique.
4. Le navigateur envoie directement le WebP préparé vers ce chemin Supabase Storage avec la session administrateur.
5. Une Server Action réautorisée vérifie les métadonnées, télécharge le WebP final de 1 Mio maximum et valide ses octets RIFF, dimensions, animation et chunks avant de finaliser `photos_galerie`, ou conserve un état `repair_required` récupérable.
6. Le tag public `galerie` est invalidé dès qu'un changement confirmé ou un masquage de sécurité affecte la projection publique.

## Hors périmètre initial

Pour conserver un backend simple, la première version n'inclut pas :

- la réservation et le paiement en ligne ;
- plusieurs rôles administratifs ;
- un historique complet des modifications ;
- un système de commentaires ou d'avis ;
- des transformations d'images avancées ;
- une application backend séparée.

Ces fonctions pourront être ajoutées ultérieurement sans remettre en cause l'architecture de base.
