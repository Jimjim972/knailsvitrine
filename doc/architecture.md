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

Il n'est pas prévu d'ouvrir l'inscription au public. Le premier compte administrateur sera créé manuellement dans Supabase.

## Modèle de données initial

### Table `prestations`

| Colonne | Type indicatif | Rôle |
| --- | --- | --- |
| `id` | `uuid` | Identifiant unique |
| `nom` | `text` | Nom de la prestation |
| `description` | `text` | Présentation détaillée |
| `prix` | `numeric` | Prix affiché, si applicable |
| `prix_sur_devis` | `boolean` | Indique si le prix doit être demandé |
| `duree_minutes` | `integer` | Durée indicative |
| `categorie` | `text` | Groupe de prestations |
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
| `ordre_affichage` | `integer` | Position dans la galerie |
| `actif` | `boolean` | Affichage sur le site public |
| `created_at` | `timestamptz` | Date d'ajout |

Une table de catégories séparée pourra être ajoutée plus tard si les catégories doivent également être administrables.

## Stockage des fichiers

Un bucket Supabase Storage dédié, par exemple `galerie`, contiendra les images publiques.

La base de données ne contiendra pas les fichiers eux-mêmes. Elle conservera uniquement leur chemin et leurs métadonnées. Lorsqu'une photo est supprimée depuis l'administration, l'enregistrement et le fichier correspondant devront tous les deux être supprimés.

Les envois devront se faire directement vers Supabase Storage avec une session administrateur valide, afin d'éviter de faire transiter les fichiers lourds par les fonctions Netlify.

## Authentification et autorisations

- lecture publique uniquement pour les prestations et photos actives ;
- création, modification et suppression réservées à l'administrateur authentifié ;
- Row Level Security activée sur toutes les tables exposées ;
- politiques Storage limitant les écritures au compte administrateur ;
- utilisation de cookies sécurisés pour la session côté serveur ;
- aucune clé `service_role` exposée au navigateur.

Le rôle administrateur devra être défini dans des métadonnées contrôlées par le serveur ou dans une table dédiée. Les métadonnées modifiables par l'utilisateur ne doivent pas servir aux décisions d'autorisation.

## Organisation Next.js envisagée

```text
app/
|-- admin/
|   |-- connexion/
|   |-- prestations/
|   `-- galerie/
|-- services/
|-- galerie/
|-- contact/
`-- page.tsx

components/
|-- admin/
`-- public/

lib/
|-- supabase/
|   |-- client.ts
|   `-- server.ts
|-- validations/
`-- data/

supabase/
`-- migrations/
```

Cette organisation reste indicative et devra respecter les conventions déjà présentes dans le projet au moment de l'implémentation.

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
