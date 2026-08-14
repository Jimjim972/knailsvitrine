# Quickstart: Gestion des prestations

Ce guide décrit la validation reproductible attendue une fois les tâches de `003-services-management` implémentées. Les commandes Supabase visent uniquement la pile locale jusqu'à la section de preview explicitement autorisée.

## Prerequisites

- Node.js 22 LTS actif, conformément à `package.json` et `.nvmrc` ;
- Docker Desktop démarré ;
- dépendances du dépôt installées ;
- pile Supabase locale non liée à une production ;
- aucun secret Supabase hébergé nécessaire.

```bash
node --version
npm --version
npx supabase --version
npx supabase migration new --help
npx supabase db reset --help
npx supabase db advisors --help
```

Versions de référence : Next.js 16.3.0, React 19.2.8, TypeScript 5.9.3, Supabase JS/CLI 2.112.2/2.112.0, `@supabase/ssr` 0.12.4 et Zod 4.4.3.

Si `node --version` n'est pas une version 22.x, activer d'abord le runtime configuré pour le projet avant d'interpréter un échec de build ou de test.

## 1. Preserve the public and admin baselines

Avant la bascule, consigner les références suivantes à partir du code existant et de `doc/design.md` :

### Public services baseline

- URL `/services`, Header/Footer et titre « Nos Prestations » ;
- trois sections dans l'ordre Onglerie & Manucure, Soins du Corps, Esthétique & Visage ;
- image, eyebrow, titre d'image, légende et disposition reverse de chaque section ;
- huit cartes avec leurs noms, descriptions, prix, durées et badges ;
- chaque lien « Réserver » cible `/contact` ;
- absence de débordement horizontal à 320, 768 et 1 024 px.

### Admin baseline

- `/admin/connexion` et `/admin` sans Header/Footer publics ;
- barre supérieure, marque, contexte Administration et déconnexion ;
- réponses `/admin` privées et non stockables ;
- aucun lien Galerie factice ;
- tests Auth existants réussis avant leur mise à jour ciblée.

Cette fiche est la référence de SC-006 et SC-011. Ne pas se fier uniquement à une comparaison mémorielle après suppression des constantes statiques.

## 2. Create the feature migration through the CLI

Découvrir puis créer le fichier sans inventer son timestamp :

```bash
npx supabase migration new --help
npx supabase migration new services_management
```

La migration unique de la fonctionnalité doit :

1. convertir `prestations.prix` vers `numeric` sans perte ;
2. imposer la plage et l'échelle de prix avec des contraintes nommées ;
3. remplacer les politiques `SELECT` prestations par les politiques anon/authenticated consolidées ;
4. insérer les huit prestations avec UUID, textes, catégories, prix, durées, badges, ordres, statuts et timestamps explicites ;
5. ne modifier ni la galerie, ni Storage, ni un utilisateur Auth.

Avant tout déploiement hébergé futur, exporter les prestations et confirmer que la table cible correspond bien au socle vide attendu. Une ligne préexistante ou une collision UUID arrête la migration ; aucun `ON CONFLICT DO NOTHING`, upsert par nom ou écrasement silencieux n'est autorisé.

Après rédaction, ajouter `supabase/tests/database/08_services_management.sql` et inclure ce fichier dans le script pgTAP existant.

L’extension catégories doit être créée séparément par la même procédure CLI (`npx supabase migration new service_categories`). Elle crée `categories_prestations`, reprend les trois codes initiaux, remplace le CHECK de `prestations.categorie` par une clé étrangère, pose grants/RLS et ajoute `supabase/tests/database/10_service_categories.sql` à tous les runners.

## 3. Rebuild the local database

```bash
npx supabase stop
npx supabase start
npm run supabase:reset
npm run supabase:types:generate
npm run supabase:types:check
```

Résultat attendu :

- toutes les migrations sont appliquées dans l'ordre ;
- huit prestations initiales et aucune duplication ;
- trois catégories initiales, la clé étrangère des prestations et les types générés de la nouvelle table ;
- les types générés restent synchronisés ;
- aucune clé ou donnée Auth privilégiée n'est écrite dans un fichier ou un rapport.

## 4. Validate database behavior first

```bash
npm run supabase:test:db
npm run supabase:lint
npx supabase db advisors --local
```

Attendus :

- prix limites acceptés et valeurs négatives, trop grandes ou trop précises refusées sans arrondi ;
- couplage `fixed`/`starting_at`/`quote` intact ;
- huit UUID et contenus exacts dans l'ordre attendu ;
- anon et non-admin lisent uniquement les actives ;
- seul l'admin courant lit les masquées et effectue CRUD ;
- rôle retiré, session révoquée ou expirée refusés au contrôle suivant ;
- catégories lisibles publiquement, insertion autorisée au seul admin courant, update/delete refusés à tous les rôles applicatifs ;
- l'avertissement de politiques permissives multiples n'existe plus pour `prestations` ;
- l'éventuel avertissement historique de `photos_galerie` est signalé séparément, sans élargir 003.

Exécuter également les advisors réels, distincts de l'inventaire pgTAP :

```bash
npm run supabase:advisors
```

Le script appelle `supabase db advisors --local --type all --level warn --fail-on error` : les avertissements restent visibles pour traitement, tandis qu'un advisor de niveau `error` rend la commande et `services:check` non nuls. Le rapport agrégé ne republie jamais la sortie brute de l'outil.

## 5. Configure the local public environment

`.env.local`, ignoré par Git, contient les deux valeurs publiques de la pile loopback et un secret serveur local distinct :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
SERVICE_SUCCESS_FLASH_SECRET=<random value of at least 32 characters>
```

Le secret de flash est généré séparément pour chaque environnement, n'est jamais préfixé par `NEXT_PUBLIC_` et n'est jamais versionné ; `.env.example` n'en documente que le nom vide. Ne jamais ajouter de `service_role`, JWT, cookie, session, mot de passe fixture ou valeur secrète réelle dans `.env.example`, les composants clients ou un rapport.

Le build valide la configuration du client public ; la pile locale et ces variables doivent donc être disponibles avant `npm run build`. Les cartes sont exclues du shell statique par `io()` et `Suspense`, afin qu'une relecture en panne ne laisse jamais les anciennes cartes visibles.

## 6. Implement the data and cache boundaries

Suivre cet ordre afin de garder une bascule vérifiable :

1. ajouter les types de catégorie dynamique, les trois présentations initiales, le fallback générique, les types de prix et le tag ;
2. ajouter validation/normalisation exacte et tests unitaires rouges ;
3. activer `cacheComponents` et migrer les deux configs admin vers `instant = false` ;
4. ajouter la DAL admin non cachée et la liste de consultation ;
5. ajouter les quatre actions de prestation et l’action de catégorie, puis les routes/composants admin ;
6. ajouter le client public anonyme sans cookies et la DAL publique cachée ;
7. brancher `/services` sur les catégories dynamiques, conserver les trois présentations initiales et omettre les sections vides ;
8. supprimer les tableaux statiques seulement lorsque le reset local contient les huit lignes ;
9. vérifier l'intégration croisée des cinq mutations de prestation et la création/utilisation d’une catégorie sur une nouvelle consultation publique ;
10. mettre à jour l'accueil admin, les tests 002 devenus obsolètes et la documentation du prix et du flux.

La lecture publique utilise `use cache`, `cacheLife("days")`, `cacheTag("prestations")`. Le composant de cartes appelle `io()` avant cette lecture et reste sous `Suspense` : le shell contient le chargement, tandis que le résultat partagé reste caché. Les pages admin, lignes masquées, autorisations et clients SSR ne reçoivent aucune directive de cache.

## 7. Extend scripts and test discovery

Élargir les scripts sans supprimer les contrôles existants :

```text
test:unit            -> auth + services avec node:test
test:e2e:auth        -> tests/admin-auth
test:e2e:services    -> tests/services-management
test:e2e:services:scenarios -> états serveur locaux isolés
services:check       -> agrégat local catégorisé et expurgé
```

Adapter `playwright.config.ts` pour que les deux suites soient découvrables tout en conservant Chromium, WebKit, `workers: 1`, le setup local et le serveur de production. Les fixtures services utilisent des identifiants propres au test, ne journalisent aucun secret et nettoient uniquement leurs lignes.

### Deterministic delay and failure scenarios

Le cœur pur des actions reçoit des dépendances injectables pour simuler autorisation refusée, indisponibilité et zéro ligne dans `node:test`. Le navigateur vérifie le pending en retardant le POST de Server Action avec `page.route()` avant de laisser la requête réelle continuer ; aucun délai artificiel n'entre dans le code applicatif.

Les états `admin-empty`, `admin-unavailable` et `public-unavailable` sont exécutés par `scripts/run-services-scenario-tests.mjs`. Le runner réutilise le build normal, fixe lui-même `KN_SERVICE_E2E_SCENARIO` pour un seul processus Next.js, attend le test ciblé, arrête ce processus puis passe au scénario suivant. Pour `public-unavailable`, le test réalise d'abord une mutation réelle de fixture dans le même processus afin que `updateTag("prestations")` invalide toute valeur préconstruite, puis ouvre `/services` et observe la lecture défaillante. `.env.example` documente la variable vide et réservée au runner ; ne jamais lui attribuer une valeur dans `.env.local` ou Netlify et ne jamais la définir manuellement pour un serveur partagé.

L'adaptateur `server-only` refuse le scénario sauf si :

- `NEXT_PUBLIC_SUPABASE_URL` utilise exactement `localhost`, `127.0.0.1` ou `[::1]` ;
- aucun contexte Netlify n'est détecté ;
- la valeur appartient à l'énumération fermée attendue ;
- aucun cookie, en-tête, query string ou appel HTTP ne tente de la changer.

```bash
npm run test:e2e:services:scenarios
```

Les tests d'accès, RLS, CRUD, invalidation et cache exécutent la vraie pile Supabase locale avec `KN_SERVICE_E2E_SCENARIO` absent. Le runner de scénarios ne prouve jamais une politique RLS et ne doit pas être inclus dans un gate Netlify.

## 8. Run pure service contracts

```bash
npm run test:unit
```

Vérifier au minimum :

- les 28 cas numérotés exactement dans `contracts/verification.md`, sans en substituer ni en fusionner ;
- virgule/point, chaîne canonique et cents sûrs ;
- `1,005` refusé et montant maximum exact ;
- quote efface immédiatement le montant et le retour à un tarif chiffré exige une nouvelle valeur ;
- formats canoniques `45 €`, `45,50 €`, « À partir de 45,50 € » et « Sur devis » ;
- durée/badge absents sans placeholder ;
- rang des catégories et départage ordre/date/ID ;
- aucune mutation après refus d'autorisation ou validation ;
- zéro ligne affectée devient `not_found` ;
- double activation UI prévue pour une seule soumission ;
- statuts PostgREST `0`, `429`, `502`, `503`, `504`, annulation et délai classés `unavailable` aux frontières de lecture et mutation ;
- diagnostics d'autorisation indisponible, mutation et invalidation expurgés avec le même identifiant de corrélation ;
- booléens de publication fermés, statut requis en modification/visibilité et ordre borné au type `integer` PostgreSQL ;
- sélection `prix::text` pour les lectures publique et administrative ;
- preuve de succès HMAC HttpOnly, liée au client et inscrite dans un registre de consommation signé/borné, sans succès déclenchable par l'URL, un cookie littéral, une altération, une saturation ou un rejeu A → B → A.

## 9. Build the production-like application

```bash
npm run lint
npm run typecheck
npm run build
```

Le build doit confirmer :

- aucune config `dynamic`, `revalidate` ou `fetchCache` incompatible avec Cache Components ;
- `/services` utilise la lecture publique cachée ;
- les routes admin restent request-bound et non cachées ;
- aucune lecture de cookies n'entre dans le scope `use cache` ;
- aucune erreur de prerender ou de paramètre asynchrone ;
- aucune ancienne constante de prestation n'est utilisée comme fallback.

Lire le tableau de routes/cache du build. N'utiliser `next build --debug-prerender` qu'en diagnostic local et ne jamais déployer sa sortie.

## 10. Run browser acceptance

```bash
npm run test:e2e:auth
npm run test:e2e:services
npm run test:e2e:services:scenarios
```

### Required admin path

1. se connecter avec la fixture admin locale ;
2. ouvrir Prestations depuis `/admin` ;
3. vérifier actifs/masqués, catégories, ordres et états textuels ;
4. créer fixed, starting-at et quote ;
5. provoquer une validation invalide et vérifier les valeurs conservées ;
6. retarder une action, vérifier pending sous une seconde et une seule ligne créée ;
7. modifier chaque champ d'une prestation de test ;
8. masquer puis vérifier l'absence publique ;
9. réactiver puis vérifier le rang et le prix public ;
10. annuler une suppression, puis confirmer ;
11. simuler une cible déjà supprimée et vérifier l'absence de faux succès ;
12. retirer rôle/session pendant l'édition et vérifier le refus du save suivant.

### Required public path

- les huit prestations migrées correspondent à la baseline ;
- trois sections initiales, visuels, ordre et liens inchangés ; nouvelles sections actives avec fallback générique ;
- seuls les éléments actifs sont visibles ;
- prix fixe, « À partir de » et « Sur devis » corrects ;
- durée/badge absents sans espace vide ;
- catégorie vide omise du catalogue ;
- nouvelle consultation publique mise à jour en moins de cinq secondes ;
- panne de données affiche une indisponibilité, jamais le vieux tableau statique.

### Required UI matrix

- Chromium et WebKit à 320, 768 et 1 024 px ;
- aucun débordement horizontal ;
- navigation complète au clavier ;
- focus visible et restauration après dialogue ;
- cibles d'au moins 44 × 44 px ;
- erreurs reliées aux champs et états annoncés ;
- Axe sans violation pertinente ;
- Header/Footer publics absents de l'administration.

## 11. Run the full local gate

```bash
npm run foundation:check
npm run auth:check
npm run services:check
```

Si `services:check` n'est pas encore disponible, exécuter explicitement :

```bash
npm run supabase:reset
npm run supabase:test:db
npm run supabase:lint
npx supabase db advisors --local
npm run supabase:types:check
npm run test:unit
npm run lint
npm run typecheck
npm run build
npm run test:e2e:auth
npm run test:e2e:services
npm run scan:build-secrets
```

Tout échec donne un code non nul. Le rapport partageable ne contient aucune clé, JWT, cookie, session, mot de passe, e-mail fixture complet, SQL brut, trace serveur ou objet Supabase.

## 12. Manual acceptance

Ces contrôles ne sont pas remplacés par WebKit ou Axe :

1. exécuter liste, création, édition et suppression sur Safari mobile réel à 320/375 px ;
2. répéter un smoke sur Firefox actuel ;
3. parcourir tous les formulaires et le dialogue au clavier ;
4. vérifier les annonces avec la technologie d'assistance disponible ;
5. faire chronométrer à un utilisateur cible non technique le parcours création → nouvelle consultation publique, attendu sous deux minutes ;
6. comparer visuellement `/services`, `/galerie`, `/contact` et le chrome global à la baseline ;
7. confirmer que le CTA Réserver reste une prise de contact et qu'aucun lien Galerie factice n'apparaît dans l'admin.

### Protocole utilisateur guidé SC-010

Utiliser un reset/fixture propre identique pour chaque session et un utilisateur cible non technique qui n'a pas participé à l'implémentation. L'observateur lit une consigne à la fois, sans montrer l'écran, suggérer un libellé, corriger la navigation ou autoriser un redémarrage. Une première tentative est l'exécution ininterrompue comprise entre la lecture de la consigne et l'annonce de fin par l'utilisateur ; une demande d'aide, un abandon ou un redémarrage vaut échec pour cette tâche.

| # | Consigne donnée littéralement | Preuve de réussite au premier essai |
| ---: | --- | --- |
| 1 | « Retrouvez une prestation masquée. » | L'utilisateur identifie une ligne portant le statut textuel « Masquée ». |
| 2 | « Créez une nouvelle prestation active à prix fixe avec les informations fournies. » | Une seule nouvelle ligne apparaît avec les valeurs de la fiche de test. |
| 3 | « Modifiez le prix de cette nouvelle prestation avec le montant fourni. » | La même ligne conserve son identité et affiche le nouveau montant. |
| 4 | « Masquez cette prestation. » | La même ligne affiche le statut « Masquée ». |
| 5 | « Supprimez définitivement cette prestation. » | La ligne disparaît seulement après ouverture et confirmation explicite du dialogue. |

Consigner pour chaque tâche `succès/échec`, l'aide éventuellement demandée et la présence de la confirmation destructive, sans enregistrer de donnée de session. Le gate réussit avec au moins 4 succès sur 5 et aucune suppression déclenchée avant confirmation ; sinon consigner l'échec et corriger l'interface avant de répéter avec un reset propre et un autre utilisateur représentatif.

## 13. Netlify preview gate

Avant une production ultérieure, et seulement sur une preview Netlify reliée à un projet Supabase de test explicitement autorisé :

- vérifier la cible, exporter les prestations et revoir la migration avant push ;
- appliquer les migrations selon la procédure du projet, sans commande distante devinée ;
- confirmer une seule reprise des huit prestations ;
- inspecter le cache public et le rafraîchissement sous cinq secondes ;
- inspecter `Cache-Control: private, no-store` sur toutes les réponses admin derrière le CDN ;
- tester CRUD, logout, rôle/session révoqué et ancienne page ouverte pendant un nouveau déploiement ;
- confirmer qu'une ancienne Server Action échoue avec un message de refresh/réessai ;
- examiner les advisors et logs sans secret ni donnée de session.

Une migration locale validée ne prouve pas l'état hébergé. Aucune mutation de projet hébergé ni aucun déploiement n'est autorisé par ce guide seul.

## 14. Documentation synchronization

Avant de déclarer la fonctionnalité terminée :

- remplacer `numeric(10,2)` par `numeric` borné/à deux décimales dans `doc/spec.md`, `doc/architecture.md` et `specs/001-supabase-foundation/data-model.md` ;
- documenter la DAL publique cachée, la DAL admin non cachée et les routes Prestations dans `doc/architecture.md` ;
- mettre à jour `doc/design.md` seulement si les composants livrés ajoutent une variante non déjà prévue ;
- mettre à jour `doc/infra.md` seulement si une variable, procédure Netlify ou fournisseur change ;
- vérifier que `spec.md`, plan, contrats, migration, types, tests et documents maîtres décrivent le même comportement.

## 15. État de vérification au 11 août 2026

Les contrôles locaux automatisés ont été exécutés avec Node.js 22.13.0 et la pile Supabase loopback non liée : reset des migrations, 265 assertions pgTAP, lint base, advisors Supabase réels, drift des types, 87 tests `node:test`, ESLint, TypeScript, build Next.js de production, suites Auth et Prestations sous Chromium/WebKit, scénarios de panne isolés et scan du bundle. La matrice Prestations inclut les cinq mutations relues publiquement, les trois types de prix, une catégorie vide, la contrainte d'échelle refusant aussi `1.000`, le registre HMAC borné avec refus des cookies forgés, altérés, saturés et du rejeu A → B → A, la classification déterministe des délais/statuts PostgREST, les diagnostics d'action corrélés et expurgés, l'effacement du montant « Sur devis », Masquer/Réactiver au clavier sur trois largeurs et 40 prestations relues 20 fois dans un ordre identique.

Les contrôles manuels sur un appareil Safari mobile réel à 320/375 px, Firefox, une technologie d'assistance et le protocole utilisateur SC-010 avec une personne non technique ne peuvent pas être attestés par l'environnement automatisé. Ils restent un gate d'acceptation humaine à exécuter ; aucun résultat fictif n'est consigné.

Le gate Netlify n'a pas été exécuté : aucune preview Netlify ni aucun projet Supabase hébergé de test n'ont été explicitement autorisés pour cette intervention. Aucune migration distante, mutation hébergée ou opération de déploiement n'a été effectuée. Les vérifications CDN, anciens onglets/actions et logs hébergés restent donc requises avant une mise en production.

## 16. Validation hébergée au 14 août 2026

Le parcours fonctionnel Prestations a ensuite été exécuté avec l'autorisation explicite de l'utilisateur sur la preview [`dev--friendly-cactus-227b77.netlify.app`](https://dev--friendly-cactus-227b77.netlify.app), reliée au projet Supabase de test `pfucayywhexemzdfwmcs`. La production n'a pas été déployée ni modifiée.

- la liste administrateur charge les neuf prestations initiales avec catégorie, ordre, statut et actions ;
- les entrées invalides sont refusées avec des messages associés aux champs et les valeurs sont conservées : nom trop court, prix négatif, durée inférieure à 5 minutes, badge supérieur à 40 caractères et ordre négatif ;
- une prestation temporaire active a été créée avec prix fixe, durée, badge, catégorie et ordre, puis affichée dès la consultation publique suivante avec `12,34 €` ;
- la même ligne a été modifiée sans changer d'identité : nouvelle catégorie, ordre, badge, durée et tarif « À partir de 23,45 € » visibles publiquement en moins de cinq secondes ;
- le tarif fixe, le tarif « À partir de » et le libellé public « Sur devis » ont été observés sur le catalogue hébergé ;
- Masquer retire la prestation de `/services`, Réactiver la republie, et chaque mutation affiche un statut administratif explicite ;
- Supprimer ouvre d'abord le dialogue nominatif et irréversible, puis ne retire la ligne qu'après « Supprimer définitivement » ;
- après suppression, la prestation temporaire est absente de l'administration et du public, et le compteur est revenu à neuf ; aucune autre prestation n'a été modifiée ;
- l'affichage courant contrôlé à 650 px ne présente aucun débordement horizontal ; la matrice automatisée Chromium/WebKit couvre séparément 320, 768 et 1 024 px.

La valeur `SERVICE_SUCCESS_FLASH_SECRET` du seul contexte Netlify `branch-deploy` avait auparavant été corrigée pour respecter la longueur minimale attendue ; les confirmations de création et de modification sont effectivement apparues pendant ce parcours. Aucun secret ni identifiant de session n'est consigné ici. Les contrôles humains sur Safari mobile réel, Firefox, technologie d'assistance et participant non technique restent les seules validations manuelles externes non attestées.
