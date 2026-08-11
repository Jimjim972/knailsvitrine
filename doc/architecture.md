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
   |
   v
Supabase
   |-- PostgreSQL : prestations et métadonnées des photos
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

### Table `prestations`

| Colonne | Type indicatif | Rôle |
| --- | --- | --- |
| `id` | `uuid` | Identifiant unique |
| `nom` | `text` | Nom de la prestation |
| `description` | `text` | Présentation détaillée |
| `prix` | `numeric` | Prix exact borné à 99 999 999,99 et limité par contrainte à deux décimales pour `fixed` ou `starting_at`, absent pour `quote` |
| `type_prix` | `text` | `fixed`, `starting_at` ou `quote` |
| `duree_minutes` | `integer` | Durée indicative |
| `categorie` | `text` | Groupe de prestations |
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
| `created_at` | `timestamptz` | Date d'ajout |
| `updated_at` | `timestamptz` | Date de dernière modification |

Une table de catégories séparée pourra être ajoutée plus tard si les catégories doivent également être administrables.

## Stockage des fichiers

Un bucket Supabase Storage dédié `galerie` contiendra les images publiques. La fondation impose le format canonique `photos/<uuid-v4>.<extension-autorisée>` ; la future gestion de galerie générera effectivement ce chemin sans réutiliser le nom fourni par l'utilisateur.

Le bucket accepte JPEG, PNG et WebP jusqu'à 8 MiB. Sa visibilité publique autorise le téléchargement d'un lien connu, pas la liste des objets ni une écriture publique.

La base de données ne contiendra pas les fichiers eux-mêmes. Elle conservera uniquement leur chemin et leurs métadonnées. La fondation prépare séparément les permissions de suppression ; lorsqu'une photo sera supprimée depuis l'administration, le futur workflow applicatif devra retirer l'enregistrement et le fichier correspondant avec une stratégie de reprise en cas d'échec partiel.

Les envois devront se faire directement vers Supabase Storage avec une session administrateur valide, afin d'éviter de faire transiter les fichiers lourds par les fonctions Netlify.

## Authentification et autorisations

- lecture publique uniquement pour les prestations et photos actives ;
- création, modification et suppression réservées à l'administrateur authentifié ;
- Row Level Security activée sur toutes les tables exposées ;
- politiques Storage limitant les écritures au compte administrateur ;
- utilisation de cookies sécurisés pour la session côté serveur ;
- aucune clé `service_role` exposée au navigateur.

Le rôle est stocké dans `app_metadata` et `private.is_current_admin()` relit sa valeur protégée courante dans `auth.users`. Cette fonction hors schéma exposé exige aussi un `session_id` encore présent, non expiré et rattaché à `auth.uid()` dans `auth.sessions` ; le rôle ancien du JWT et `user_metadata` ne suffisent jamais.

Les clients Supabase sont séparés sous `lib/supabase/` : validation publique partagée dans `env.ts`, types générés dans `database.types.ts`, client navigateur à clé publiable dans `client.ts`, fabrique serveur par requête dans `server.ts` et client response-aware dans `proxy.ts`. Le Proxy Next.js 16 rafraîchit les cookies et préfiltre seulement l'absence d'identité ; la DAL `server-only`, `public.is_current_admin()` puis RLS prennent les décisions fortes au plus près de chaque page ou action sensible. Les réponses `/admin` portent `Cache-Control: private, no-store` et aucune donnée de session n'utilise un cache partagé.

Une perte de session, une révocation ou un retrait du rôle pendant un parcours renvoie vers la connexion avec un motif fermé `session=expired` et une consigne de reconnexion, sans préciser l'identité ni la cause interne. Les mutations déjà ouvertes sont réautorisées au POST et restent sur le formulaire avec le même état sûr lorsqu'elles sont refusées.

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
4. Les fichiers image sont servis directement par Supabase Storage.

### Modification d'une prestation

1. L'administrateur se connecte dans `/admin`.
2. Le serveur vérifie la session Supabase.
3. Les données du formulaire sont validées.
4. La prestation est créée ou modifiée dans PostgreSQL.
5. La page publique concernée est actualisée ou revalidée.

Les lectures de prix demandent explicitement `prix::text` à PostgREST avant la conversion en centimes, afin qu'aucun nombre JSON flottant ne devienne la source de vérité applicative. Elles conservent aussi le statut de réponse PostgREST : le statut réseau `0`, les annulations/délais et les statuts `429`, `502`, `503` et `504` deviennent une indisponibilité récupérable. Après création, modification ou suppression confirmée, la Server Action émet une preuve HMAC HttpOnly de courte durée, liée à un cookie de garde aléatoire, puis redirige vers la liste. Le Proxy vérifie signature, durée, liaison et registre de consommation avant de transmettre uniquement le type fermé de succès au Server Component. Chaque document `/admin/prestations` efface preuve et garde, puis ajoute l'empreinte du nonce à un registre signé, borné et purgé à expiration. Une altération ou une saturation fait échouer la vérification de façon fermée ; un paramètre d'URL, un cookie littéral ou le rejeu de n'importe quelle preuve encore vivante ne peut donc jamais fabriquer un succès.

### Ajout d'une photo

1. L'administrateur sélectionne une image.
2. Le navigateur vérifie le format et la taille.
3. L'image est envoyée vers Supabase Storage.
4. Son chemin et son texte alternatif sont enregistrés dans `photos_galerie`.
5. La galerie publique est actualisée ou revalidée.

## Hors périmètre initial

Pour conserver un backend simple, la première version n'inclut pas :

- la réservation et le paiement en ligne ;
- plusieurs rôles administratifs ;
- un historique complet des modifications ;
- un système de commentaires ou d'avis ;
- des transformations d'images avancées ;
- une application backend séparée.

Ces fonctions pourront être ajoutées ultérieurement sans remettre en cause l'architecture de base.
