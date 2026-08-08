<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Règles du projet K'nails

## 1. Mission et périmètre

Ce projet est le **MVP** du site vitrine K'nails Beauty Institut. L'objectif est de livrer un site public et un petit espace d'administration permettant de gérer environ 40 prestations et une galerie de photos.

Rester strictement dans le périmètre du MVP. Ne pas ajouter de réservation, paiement, compte client, programme de fidélité, publication Instagram automatique, gestion multi-rôles ou application backend séparée sans demande explicite de l'utilisateur.

## 2. Sources de vérité obligatoires

Avant de proposer un plan ou de modifier le code, lire les documents suivants dans cet ordre :

1. `doc/spec.md` pour les besoins, règles de gestion, critères d'acceptation et limites du MVP ;
2. `doc/design.md` pour l'identité visuelle, les composants, le responsive et les règles d'extension de l'interface ;
3. `doc/architecture.md` pour les responsabilités des composants, les flux et l'organisation cible ;
4. `doc/infra.md` pour l'hébergement, les services externes, les quotas et les variables d'environnement ;
5. le ou les guides pertinents dans `node_modules/next/dist/docs/` pour vérifier les API réelles de la version installée ;
6. la documentation et le changelog officiels de Supabase pour toute tâche concernant Supabase.

Ne pas implémenter une fonctionnalité d'après la mémoire si elle est décrite dans ces sources. En cas de contradiction :

1. la demande explicite la plus récente de l'utilisateur prévaut ;
2. `doc/spec.md` prévaut sur les autres documents du projet ;
3. `doc/design.md` prévaut pour les décisions visuelles et d'interaction ;
4. `doc/architecture.md` prévaut sur `doc/infra.md` pour la structure applicative ;
5. la documentation correspondant aux versions réellement installées prévaut sur les habitudes ou connaissances générales.

Lorsqu'une décision fonctionnelle ou technique change, mettre à jour les documents concernés dans la même modification afin qu'ils ne deviennent pas obsolètes.

**Règle impérative : toute création ou modification du frontend doit respecter à la lettre `doc/design.md`. Aucun écart visuel, responsive ou d'interaction n'est autorisé sans demande explicite de l'utilisateur et mise à jour simultanée de `doc/design.md`.**

## 3. Stack retenue

- Next.js 16 avec App Router ;
- React 19 ;
- TypeScript ;
- Supabase PostgreSQL, Auth et Storage ;
- Netlify pour la production ;
- GitHub comme source des déploiements ;
- CSS existant du projet, sauf décision explicite de migration ;
- Zod pour la validation des entrées lorsque le backend est implémenté.

Ne pas introduire un ORM, un serveur Express, un CMS supplémentaire, une bibliothèque globale d'état ou un second système d'authentification sans besoin démontré et validation de l'utilisateur.

## 4. Patterns Next.js obligatoires

### 4.1 App Router et organisation

- Utiliser exclusivement l'App Router dans `app/`.
- Créer une route publique avec `page.tsx` et une API HTTP uniquement avec `route.ts`.
- Utiliser les layouts pour l'interface partagée, pas comme unique barrière d'autorisation.
- Utiliser les dossiers privés `_components`, `_lib` ou des modules partagés clairement nommés pour le code non routable lorsque cela améliore la lisibilité.
- Conserver les accès Supabase et les règles métier hors des composants de présentation.
- Préférer des modules courts avec une responsabilité claire.

### 4.2 Server Components et Client Components

- Les composants sont des Server Components par défaut.
- Ajouter `"use client"` uniquement lorsqu'un composant a besoin d'état local, d'effets, d'événements navigateur, d'une prévisualisation de fichier ou d'une API du navigateur.
- Garder la frontière client aussi basse que possible dans l'arbre de composants.
- Ne jamais importer un module contenant des secrets ou un client serveur dans un Client Component.
- Ne transmettre au client que les propriétés nécessaires à l'affichage.

### 4.3 Lecture des données

- Centraliser les lectures dans une couche d'accès aux données sous `lib/` ou dans un dossier privé clairement identifié.
- Marquer les modules strictement serveur avec `server-only` lorsque cela est approprié.
- Sélectionner explicitement les colonnes nécessaires au lieu de récupérer systématiquement `*`.
- Exécuter en parallèle les lectures indépendantes.
- Retourner des objets adaptés à l'interface plutôt que les lignes de base complètes lorsqu'elles contiennent des champs inutiles.

### 4.4 Mutations et formulaires

- Utiliser des Server Actions pour les formulaires CRUD internes à l'application.
- Considérer chaque Server Action comme un endpoint public accessible directement.
- Dans chaque action : vérifier la session, vérifier le rôle, valider les données, exécuter la mutation, traiter l'erreur, puis invalider le cache concerné.
- Valider avec Zod côté serveur même si des contraintes HTML sont présentes côté client.
- Utiliser `useActionState` ou les primitives React actuelles documentées pour afficher l'état en cours et les erreurs de formulaire.
- Empêcher les doubles soumissions et demander une confirmation avant une suppression.
- Utiliser un Route Handler seulement pour un véritable contrat HTTP, un webhook ou un besoin que les Server Actions ne couvrent pas proprement.

### 4.5 Authentification et autorisation

- Utiliser Supabase Auth avec le mécanisme SSR et les cookies recommandé par la documentation actuelle.
- Dans Next.js 16, vérifier la convention `proxy.ts` dans la documentation locale avant d'ajouter une interception de requêtes. Ne pas recréer automatiquement un ancien `middleware.ts`.
- Une redirection dans Proxy ou une interface masquée n'est jamais une autorisation suffisante.
- Répéter le contrôle d'autorisation au plus près de chaque lecture sensible et de chaque mutation.
- Ne pas dépendre uniquement d'un layout pour protéger `/admin`, car les layouts ne sont pas réévalués comme une barrière de sécurité à chaque navigation.

### 4.6 Cache et revalidation

- Vérifier d'abord si `cacheComponents` est activé dans `next.config.ts`.
- Si le modèle Cache Components est utilisé, suivre la documentation Next.js 16 : `use cache`, `cacheLife`, `cacheTag`, `updateTag` et `revalidateTag`.
- Utiliser des tags séparés pour les prestations et la galerie.
- Utiliser `updateTag` après une Server Action lorsque l'administrateur doit voir immédiatement sa modification.
- Ne jamais partager en cache les données de session ou les données privées de l'administration.
- Tester le comportement du cache sur Netlify, pas uniquement en développement local.

### 4.7 Images

- Utiliser `next/image` lorsque cela respecte la stratégie décrite dans `doc/spec.md`.
- Toujours fournir `alt`, `width` et `height`, ou un conteneur dimensionné avec `fill` et une valeur `sizes` correcte.
- Configurer `images.remotePatterns` de manière précise pour le domaine Supabase ; ne pas autoriser des hôtes ou chemins génériques inutiles.
- Charger en priorité uniquement les images réellement visibles au premier écran.
- Compresser et convertir les images avant leur stockage conformément aux limites du MVP.

### 4.8 APIs asynchrones et conventions de version

- Ne pas supposer que `cookies()`, `headers()`, `params`, `searchParams` ou les autres API Next.js sont synchrones.
- Lire leur guide local avant utilisation et respecter leur signature dans la version installée.
- Respecter les avertissements de dépréciation et ne pas copier un exemple provenant d'une ancienne version de Next.js sans vérification.

## 5. Patterns Supabase obligatoires

### 5.1 Documentation et versions

- Avant toute implémentation Supabase, consulter `https://supabase.com/changelog.md` et rechercher les changements cassants pertinents.
- Utiliser en priorité la documentation officielle actuelle.
- Découvrir les commandes Supabase CLI avec `supabase --help` et les sous-commandes `--help` ; ne pas deviner leur syntaxe.

### 5.2 Clients Supabase

- Séparer clairement le client navigateur et le client serveur.
- Utiliser la clé publishable dans le navigateur avec RLS activée.
- Ne jamais exposer la clé `service_role` ou une clé secrète dans un composant client, un bundle public ou une variable `NEXT_PUBLIC_*`.
- Ne pas utiliser `service_role` pour contourner RLS dans les opérations CRUD normales.

### 5.3 Base de données et migrations

- Toute évolution du schéma doit être reproductible dans `supabase/migrations`.
- Créer une migration avec la commande Supabase CLI appropriée avant de rédiger son SQL ; ne pas inventer un nom de fichier horodaté.
- Ajouter les contraintes de base de données prévues dans `doc/spec.md`, même si la validation existe déjà dans l'application.
- Indexer uniquement les chemins de lecture réellement utilisés.
- Vérifier si les tables sont exposées à la Data API et si les rôles possèdent les `GRANT` requis. L'exposition Data API et RLS sont deux protections distinctes.
- Ne pas modifier directement la production lorsque la demande concerne seulement le code ou la préparation d'une migration.

### 5.4 Row Level Security

- Activer RLS sur toute table située dans un schéma exposé, notamment `public`.
- Définir des politiques séparées correspondant exactement aux lectures publiques et aux écritures administrateur.
- Autoriser la lecture anonyme uniquement des prestations et photos actives.
- Garder les lignes inactives invisibles aux visiteurs et aux utilisateurs non-admin.
- Une politique `UPDATE` nécessite aussi une politique `SELECT` compatible.
- Ne jamais utiliser `user_metadata` ou `raw_user_meta_data` pour une décision d'autorisation.
- Utiliser `app_metadata` ou une table de rôles protégée, conformément à la décision décrite dans la spécification.
- Garder à l'esprit que les claims d'un JWT peuvent rester anciens jusqu'au rafraîchissement du jeton.
- Les vues exposées doivent utiliser `security_invoker = true` sur les versions PostgreSQL compatibles, ou être protégées explicitement.
- Ne pas placer une fonction `security definer` dans un schéma exposé.

### 5.5 Storage

- Utiliser un bucket dédié aux images de galerie.
- La lecture publique d'un fichier ne doit pas donner un droit d'écriture public.
- Restreindre les chemins, types de fichiers et opérations autorisés par les politiques Storage.
- Pour un remplacement avec upsert, prévoir les politiques `INSERT`, `SELECT` et `UPDATE`.
- Prévoir une politique distincte pour `DELETE`.
- Lors d'une suppression applicative, supprimer à la fois les métadonnées en base et le fichier, avec une stratégie explicite en cas d'échec partiel.
- Générer les chemins de fichiers dans l'application et ne pas faire confiance au nom fourni par l'utilisateur.

### 5.6 Vérification

- Après une modification du schéma ou des politiques, tester avec les rôles `anon`, `authenticated` non-admin et administrateur.
- Vérifier au minimum les cas de lecture active, lecture inactive, création, modification, suppression et remplacement Storage.
- Exécuter les advisors Supabase disponibles avant de finaliser une migration et corriger les alertes pertinentes.

## 6. Données et règles métier du MVP

- Environ 40 prestations ; aucune pagination publique nécessaire.
- Catégories initiales fermées : onglerie et manucure, soins du corps, esthétique et visage.
- Les prestations et photos inactives restent administrables mais ne sont pas publiques.
- Trier par `ordre_affichage`, puis par date de création pour obtenir un résultat stable.
- Enregistrer les prix avec un type exact PostgreSQL, jamais avec un flottant JavaScript comme source de vérité.
- Enregistrer les dimensions, le type MIME et la taille des images.
- Les contraintes exactes des champs sont définies dans `doc/spec.md` et ne doivent pas être dupliquées avec des valeurs différentes.

## 7. TypeScript et qualité du code

- Garder TypeScript strict et éviter `any`. Si un type reste inconnu, le modéliser ou utiliser `unknown` avec une validation.
- Définir des types de domaine explicites et générer les types Supabase lorsque le schéma existe.
- Ne pas dupliquer les chaînes de catégories, variantes d'images ou types de prix ; centraliser ces constantes.
- Préférer les fonctions pures pour la validation, le formatage des prix et la transformation des données.
- Ne pas mélanger logique métier, accès réseau et présentation dans un même composant.
- Utiliser des noms descriptifs en anglais pour le code et les noms SQL déjà définis dans la spécification ; conserver les textes visibles par l'utilisateur en français.
- Ne pas laisser de faux succès, de bouton sans effet, de données factices présentées comme réelles ou de commentaire `TODO` bloquant dans un parcours livré.
- Préserver le style et les conventions du code existant sauf refactorisation explicitement justifiée.

## 8. Sécurité générale

- Ne jamais valider une autorisation uniquement dans le navigateur.
- Ne jamais enregistrer de mot de passe, jeton, cookie, clé ou contenu sensible dans les logs.
- Ne jamais afficher au visiteur une erreur SQL, une trace serveur ou un détail d'infrastructure.
- Valider les URL externes et accepter uniquement HTTPS lorsqu'elles sont administrables.
- Refuser les types de fichiers non prévus, en particulier SVG et fichiers exécutables dans le MVP.
- Ajouter une protection anti-spam au formulaire de contact avant sa mise en production.
- Ne pas effectuer de suppression en masse ou de modification destructive de production sans cible vérifiée et sauvegarde appropriée.

## 9. Interface, accessibilité et SEO

- Conserver le design existant et le comportement responsive.
- Utiliser du HTML sémantique avant d'ajouter des rôles ARIA.
- Assurer la navigation clavier, le focus visible, les labels de formulaire, les messages d'erreur associés et les annonces de statut.
- Respecter les textes alternatifs obligatoires définis dans la spécification.
- Préserver les métadonnées de page et ajouter sitemap, robots, Open Graph et données structurées lorsque les informations finales sont disponibles.
- Tester au minimum à 320 px, 768 px et 1 024 px, ainsi que sur Safari mobile.

## 10. Gestion des erreurs

- Retourner des états de formulaire structurés et compréhensibles.
- Conserver les valeurs saisies après une erreur récupérable.
- Distinguer validation, authentification, autorisation, réseau, quota et erreur interne.
- Journaliser le contexte technique utile côté serveur sans donnée sensible.
- Ne confirmer une opération qu'après son succès réel.
- Prévoir le nettoyage ou une reprise explicite lorsqu'une opération en plusieurs étapes échoue partiellement.

## 11. Documentation et maintenance

- Mettre à jour `doc/spec.md` lorsqu'un besoin, une règle métier ou un critère d'acceptation change.
- Mettre à jour `doc/design.md` lorsqu'un token, un composant, un comportement responsive ou une règle d'interaction change.
- Mettre à jour `doc/architecture.md` lorsqu'un composant, un flux, une table ou une responsabilité change.
- Mettre à jour `doc/infra.md` lorsqu'un fournisseur, un quota, une variable, un domaine ou une procédure de déploiement change.
- Documenter toute nouvelle variable dans un fichier d'exemple sans valeur secrète.
- Ne pas inscrire dans la documentation un quota ou une API temporellement variable sans vérifier sa source officielle actuelle.

## 12. Vérifications avant livraison

Exécuter, selon la portée de la modification :

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Pour une modification Supabase, ajouter les vérifications de migration, de requêtes et de politiques décrites dans `doc/spec.md`.

Contrôler également :

- aucun secret dans le code ou le bundle client ;
- aucune régression sur les pages `/services`, `/galerie` et `/contact` ;
- parcours `/admin` refusé sans autorisation ;
- états chargement, vide, erreur et réussite présents ;
- images et textes alternatifs valides ;
- interface conforme à `doc/design.md` ;
- documentation synchronisée avec l'implémentation.

Si une vérification ne peut pas être exécutée faute d'accès, de variables ou de service externe, l'indiquer clairement dans le compte rendu final.

## 13. Définition de terminé

Une tâche est terminée uniquement si :

1. le besoin correspondant dans `doc/spec.md` est satisfait ;
2. les limites du MVP sont respectées ;
3. les contrôles d'authentification, d'autorisation et RLS sont présents lorsque nécessaire ;
4. les états d'interface et les erreurs sont traités ;
5. les vérifications pertinentes réussissent ;
6. les documents du projet restent cohérents ;
7. aucun secret, faux comportement ou régression connue n'est livré silencieusement.
