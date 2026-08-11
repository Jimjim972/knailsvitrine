# Quickstart: Fondation Supabase

Ce guide décrit le parcours attendu une fois les tâches d'implémentation réalisées. Il travaille uniquement sur la pile Supabase locale et ne modifie aucun projet hébergé.

## Prerequisites

- Node.js 22 LTS actif ;
- Docker Desktop démarré ;
- npm disponible ;
- dépôt placé à sa racine ;
- aucun secret Supabase hébergé nécessaire.

Vérifier le runtime :

```bash
node --version
npm --version
npx supabase --version
node --help
```

Le premier numéro doit être `v22.x`, Supabase CLI doit afficher `2.112.0` après installation des dépendances et l'aide Node doit confirmer le support de la suppression native des types utilisée par le contrôle de `lib/supabase/env.ts`.

## 1. Establish the toolchain

Lors de l'implémentation, matérialiser Node.js 22 dans `.nvmrc` et `package.json`, puis installer les versions exactes prévues :

```bash
nvm install 22
nvm use 22
npm install --save-exact @supabase/supabase-js@2.112.2 @supabase/ssr@0.12.4 zod@4.4.3
npm install --save-dev --save-exact supabase@2.112.0
```

Ne jamais substituer une clé secrète à la clé publiable, même pour faciliter les tests applicatifs.

## 2. Initialize and create the migration

La première implémentation initialise la configuration avec la CLI si elle n'existe pas :

```bash
npx supabase init
npx supabase migration new supabase_foundation
```

Le fichier horodaté généré par la CLI reçoit le SQL de fondation. Son nom ne doit pas être inventé manuellement.

La migration établit dans un ordre déterministe :

1. schéma privé et helpers à `search_path` fixe ;
2. tables et contraintes nommées ;
3. trigger `updated_at` ;
4. index partiels ;
5. révocations et droits explicites ;
6. activation RLS et politiques par opération ;
7. politiques `storage.objects` bornées au bucket et au préfixe.

Le bucket `galerie` est déclaré dans `supabase/config.toml` avec sa visibilité, sa limite et ses MIME autorisés.

La même configuration ferme explicitement toutes les créations de compte publiques :

- `auth.enable_signup = false` ;
- `auth.enable_anonymous_sign_ins = false` ;
- `auth.email.enable_signup = false` ;
- `auth.sms.enable_signup = false` ;
- aucun fournisseur externe activé.

## 3. Start and rebuild locally

```bash
npx supabase stop
npx supabase start
npx supabase db reset --local
```

Le redémarrage est requis après une modification de `config.toml`. `db reset --local` applique la migration et crée le bucket déclaré par configuration ; aucune commande de seed de bucket n'est nécessaire. Résultat attendu : le bucket `galerie` existe, la configuration Auth fermée est active et aucun seed métier de prestations ou de photos n'apparaît.

## 4. Generate application types

Après une reconstruction réussie :

```bash
npm run supabase:types:generate
```

Le fichier généré est versionné avec la migration. Pour contrôler la dérive sans écraser la référence :

```bash
npm run supabase:types:check
```

Le contrôle génère dans un fichier temporaire à permissions restreintes, compare sans écraser la référence suivie et nettoie toujours le temporaire. Une différence signifie que la migration et les types ne sont pas synchronisés.

## 5. Configure the Next.js clients

Créer un fichier local `.env.local` non versionné à partir de `.env.example` et y copier uniquement les valeurs publiques fournies par la pile locale :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
```

Vérifier ensuite :

- le client navigateur typé ;
- la fabrique serveur asynchrone avec `await cookies()` ;
- l'absence de `service_role`, clé secrète, token ou mot de passe dans les fichiers suivis ;
- l'échec explicite de la validation si l'URL ou la clé publiable manque.

La validation accepte HTTP uniquement pour `localhost`, `127.0.0.1` et `[::1]`, accepte HTTPS pour Supabase hébergé, et refuse notamment `http://project.supabase.co`, `http://localhost.evil.example`, `ftp:`, une URL mal formée ou vide.

## 6. Run the database and access tests

Les tests pgTAP créent leurs utilisateurs, sessions et données de contrôle dans une transaction locale puis nettoient tout. Ils simulent les claims et le rôle PostgreSQL de chaque profil sans utiliser une clé privilégiée pour réussir le parcours testé.

```bash
npm run supabase:test:db
```

### Required matrix

| Scenario | `anon` | Auth non-admin | Current admin | Revoked old admin |
| --- | --- | --- | --- | --- |
| Lire prestation/photo active | Succès | Succès | Succès | Accès public seulement |
| Lire prestation/photo inactive | 0 ligne | 0 ligne | Succès | 0 ligne |
| Insérer | Refus | Refus | Succès | Refus |
| Modifier/masquer | Refus | Refus | Succès | Refus |
| Supprimer | Refus | Refus | Succès | Refus |
| Storage `INSERT` | Refus | Refus | Succès | Refus |
| Storage upsert (`INSERT` + `SELECT` + `UPDATE`) | Refus | Refus | Succès | Refus |
| Storage `DELETE` | Refus | Refus | Succès | Refus |

Les tests de contraintes couvrent aussi :

- les bornes de nom, description, durée, badge, dimensions, alt et taille ;
- chaque catégorie, type de prix et variante autorisés, plus une valeur interdite ;
- le couplage `type_prix`/`prix` ;
- une URL non HTTPS ;
- un chemin non canonique et un doublon de `storage_path` ;
- un MIME interdit et une taille supérieure à 8 MiB ;
- deux lignes ayant le même ordre et la stabilité `ordre`, `created_at`, `id` ;
- un jeu de 40 prestations et un jeu de 100 photos, sans pagination, avec le même tri stable ;
- un rôle placé uniquement dans `user_metadata` ;
- un ancien JWT admin dont la session a été supprimée.

Le contrôle exécute 223 assertions pgTAP. L'inventaire vérifie séparément les `GRANT` courants et les privilèges par défaut fermés pour les futures tables, séquences et fonctions, afin qu'un droit SQL manquant ne soit pas confondu avec un refus RLS.

## 7. Run Auth and Storage API integration checks

Ces contrôles refusent de s'exécuter si l'URL Supabase n'est pas loopback. Après vérification de `npx supabase status --help`, ils capturent en mémoire la capacité administrative depuis la sortie machine de l'état local, sans la recopier dans un fichier ou la console. Elle sert uniquement à créer, compter, inspecter et nettoyer les identités de test ; toutes les inscriptions publiques et opérations Storage contrôlées emploient la clé publiable et les sessions réelles. Aucune clé, aucun JWT, mot de passe ou corps d'erreur brut ne doit être imprimé.

```bash
npm run supabase:test:auth
npm run supabase:test:storage
```

Chaque script produit, même lorsqu'il est lancé seul, des résultats conformes à [contracts/diagnostics.md](./contracts/diagnostics.md). Un refus attendu est un succès ; seul l'échec du contrôle possède exactement une catégorie.

Résultat Auth attendu : une inscription directe avec un email aléatoire échoue avec `signup_disabled`, ne retourne aucune session et ne modifie pas le nombre d'utilisateurs. Les créations anonyme, OTP/magic-link et SMS échouent aussi ; l'inventaire prouve la fermeture email, SMS et fournisseurs externes.

Comme la fermeture email locale désactive également la connexion publique du fournisseur dans la version contrôlée, le harnais Storage crée ses utilisateurs avec l'API administrative locale, insère de vraies lignes jetables dans `auth.sessions`, puis signe uniquement en mémoire des JWT locaux correspondant à ces sessions. Les opérations Storage utilisent toujours la clé publiable et l'ancien JWT admin perd ses droits dès que sa ligne de session est supprimée.

Résultat Storage attendu :

- un admin envoie `photos/<uuid-v4>.png`, puis un `fetch` public non authentifié récupère réellement les octets ;
- `anon`, non-admin et admin révoqué ne peuvent ni envoyer, remplacer ni supprimer, et aucun refus ne laisse de résidu ou ne modifie les octets ;
- l'admin peut lister, envoyer, faire un upsert et supprimer ;
- un résultat vide ou un refus satisfait le contrôle de non-découverte publique ;
- un mauvais préfixe, sous-dossier, nom non UUID v4, MIME GIF et contenu de 8 MiB + 1 octet sont refusés ;
- supprimer l'objet seul laisse temporairement la métadonnée, et supprimer la métadonnée seule laisse temporairement l'objet accessible ; le nettoyage final retire toutes les fixtures.

Ces deux derniers scénarios prouvent uniquement l'indépendance des permissions. Ils ne livrent pas le workflow coordonné de la future galerie.

## 8. Run Supabase diagnostics

```bash
npm run supabase:lint
npm run supabase:advisors
```

La CLI 2.112.0 ne fournit pas de sous-commande locale `db advisors`. Le script `supabase:advisors` exécute donc l'inventaire local pgTAP des RLS, politiques, fonctions, `GRANT` et privilèges par défaut ; les advisors du tableau de bord restent un gate distinct du futur projet hébergé. Examiner chaque alerte de `db lint` et corriger toute erreur pertinente avant livraison.

## 9. Run application verification

```bash
npm run lint
npm run typecheck
npm run build
npm run scan:build-secrets
```

Le build doit utiliser Node.js 22 et les variables publiques locales. Il ne doit pas nécessiter de secret Supabase.

## 10. Run the categorized acceptance report

Le lanceur final vérifie d'abord le loopback, refuse une cible liée distante et impose les variantes `--local` lorsqu'elles existent dans l'aide CLI. Il enveloppe ensuite les contrôles précédents, la validation d'environnement via l'import TypeScript natif de Node.js 22, la dérive des types, les diagnostics Supabase et les vérifications applicatives. Il agrège les sorties structurées Auth/Storage, classe chaque autre échec avec exactement une catégorie définie dans [contracts/diagnostics.md](./contracts/diagnostics.md), scanne les fichiers destinés au dépôt et le bundle après le build, puis retourne un code non nul si le bilan contient au moins un échec.

```bash
npm run foundation:check
```

La sortie partageable ne contient aucun secret, SQL brut, token, cookie, mot de passe ou détail d'infrastructure sensible.

Dernier gate local validé le 10 août 2026 sous Node.js 22.13.0 : reset, 223 assertions pgTAP, Auth, Storage, lint DB, inventaire des droits, dérive des types, ESLint, TypeScript, build Next.js et scans de secrets ont tous produit `pass`.

## 11. Final acceptance checks

- `npx supabase db reset --local` reconstruit le socle sans correction manuelle.
- Les trois profils et le profil admin révoqué passent toute la matrice.
- Les objets publics restent lisibles par URL, mais seuls les admins peuvent lister ou écrire dans Storage.
- Toute auto-inscription directe est refusée sans création d'utilisateur.
- Les données invalides échouent avec une contrainte identifiable.
- Les jeux de 40 prestations et 100 photos conservent un tri déterministe.
- Chaque échec du lanceur possède exactement une catégorie et le scan post-build ne trouve aucun secret privilégié.
- Les types générés sont synchronisés.
- Aucun contenu codé en dur n'a été importé.
- Aucun fichier UI, `proxy.ts`, cache ou page publique n'a été ajouté par cette feature.
- Aucun traitement, conversion, redimensionnement ou prévisualisation d'image et aucun générateur applicatif de chemin n'ont été ajoutés.
- Aucun workflow coordonné de suppression objet/métadonnée n'a été livré ; seules les permissions indépendantes sont présentes.
- Aucun changement n'a été appliqué à un projet Supabase hébergé.

## Production handoff (outside this feature)

Avant toute application future à un environnement hébergé : identifier et vérifier indépendamment le projet cible, sauvegarder les données concernées, revoir la migration, configurer les variables Netlify, puis revérifier la syntaxe installée avec `npx supabase config push --help`. Après autorisation distincte, la configuration versionnée pourra être appliquée avec `npx supabase config push --project-ref <verified-ref>` ou le mécanisme approuvé équivalent, séparément du workflow de migration. Exécuter ensuite la même matrice avec des comptes jetables autorisés et consulter les advisors du projet. Une tentative publique directe doit retourner `signup_disabled` sans créer de compte ; si elle en crée un, arrêter le déploiement et supprimer uniquement cet utilisateur jetable identifié avec un outil administratif protégé. Aucune de ces opérations distantes n'a été exécutée par cette feature.
