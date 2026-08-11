# Quickstart: Authentification administrateur

Ce guide décrit le parcours reproductible attendu une fois les tâches d'implémentation de `002-admin-authentication` réalisées. Les opérations privilégiées ci-dessous visent uniquement la pile Supabase locale ; aucune production n'est modifiée par ce workflow.

## Prerequisites

- Node.js 22 LTS actif ;
- Docker Desktop démarré ;
- dépendances du dépôt installées ;
- pile Supabase non liée à un projet distant ;
- aucun secret Supabase hébergé nécessaire.

```bash
node --version
npm --version
npx supabase --version
npx supabase status --help
```

Les versions attendues pour la stack existante sont Next.js 16.3.0, React 19.2.8, Supabase JS/CLI 2.112.2/2.112.0 et `@supabase/ssr` 0.12.4.

### Référence publique avant déplacement des routes (SC-010)

Référence consignée avant T005 à partir du frontend existant et de `doc/design.md` :

| Entrée | URL/comportement | Header/Footer | Titres et ordre des sections | Destinations de liens |
| --- | --- | --- | --- | --- |
| `/` | redirection vers `/services` | présents sur la destination | même contenu que Services | navigation de marque vers `/services` |
| `/services` | URL inchangée | Header fixe puis Footer quatre colonnes | « Nos Prestations » ; Onglerie & Manucure ; Soins du Corps ; Esthétique & Visage | Services `/services`, Galerie `/galerie`, Contact/Réserver `/contact` |
| `/galerie` | URL inchangée | Header fixe puis Footer quatre colonnes | « L'Art Sublimé » ; sélection de créations ; « Journal Social » | navigation publique inchangée ; profil/cartes vers `https://www.instagram.com` |
| `/contact` | URL inchangée | Header fixe puis Footer quatre colonnes | « Contact & Rendez-vous » ; « Envoyez-nous un message » ; « Informations pratiques » ; carte | navigation publique inchangée ; téléphone `tel:+33123456789` |

Le Header conserve la marque « K'nails Beauty Institut », les liens Services/Galerie/Contact et l'action « Réserver ». Le Footer conserve, dans cet ordre, marque, Explorer, Nous contacter, Horaires puis copyright, avec les mêmes textes et liens. La référence responsive est l'absence de débordement horizontal documentée pour les compositions existantes à 320, 768 et 1 024 px ; elle sera contrôlée automatiquement et manuellement après le déplacement sans modifier les breakpoints 760/1 080 px.

## 1. Install the browser test dependencies

Lors de l'implémentation, ajouter uniquement les dépendances de développement ciblées :

```bash
npm install --save-dev --save-exact @playwright/test@1.62.1 @axe-core/playwright@4.12.1
npx playwright install chromium webkit
```

Dans ce même Setup, ajouter `test:unit` fondé sur `node:test` de Node 22 et `test:e2e:auth` fondé sur `playwright test` dans `package.json`. Ne pas attendre la phase de finition pour créer ces scripts : les baselines rouges des stories les utilisent. Ne pas ajouter Vitest/Jest. Firefox et Safari mobile réel restent des gates manuels pour ce MVP.

Avant tout déplacement de route publique, consigner la baseline SC-010 dans le compte rendu d'exécution de ce guide. Pour `/`, `/services`, `/galerie` et `/contact`, relever depuis l'interface existante et `doc/design.md` : URL, présence du Header/Footer, titres et textes visibles, cibles des liens, ordre des sections et absence de débordement horizontal à 320, 768 et 1 024 px. Cette fiche pré-déplacement, et non une appréciation mémorielle, est la référence des tests et de la comparaison manuelle après T005.

## 2. Create the authorization migration with the CLI

Découvrir puis utiliser la commande installée, sans inventer de timestamp :

```bash
npx supabase migration new --help
npx supabase migration new admin_authentication
```

Le fichier généré fait relire à `private.is_current_admin()` le rôle protégé courant dans `auth.users`, puis ajoute `public.is_current_admin()` comme wrapper `security invoker`, fixe son `search_path`, ferme ses privilèges et accorde l'exécution à `authenticated` uniquement. Il ne modifie aucune ligne de `auth.users`/`auth.sessions` ni table métier.

Ajouter le test pgTAP `07_admin_authentication.sql`, puis inclure ce fichier dans la commande `supabase:test:db` existante et dans le rapport fondation. Le test vérifie définition, privilèges et matrice current/non-admin/user-metadata-only/wrong-owner/expired/deleted session.

## 3. Rebuild the local foundation

```bash
npx supabase stop
npx supabase start
npm run supabase:reset
npm run supabase:types:generate
npm run supabase:types:check
```

Résultat attendu : la migration est appliquée, `lib/supabase/database.types.ts` contient le RPC sans argument et aucun compte produit permanent n'est seedé.

## 4. Configure the public local environment

Le fichier `.env.local`, ignoré par Git, contient uniquement les deux valeurs publiques de la pile loopback :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
```

Ne jamais ajouter de `service_role`, clé secrète, JWT ou mot de passe fixture dans `.env.local`, `.env.example`, une variable `NEXT_PUBLIC_*` ou un rapport. Le setup Playwright lit la capacité administrative depuis `supabase status --output json` seulement en mémoire après vérification loopback/non-liée. La fixture `expirable-admin` peut faire expirer sa ligne de session courante uniquement sur cette pile locale après ces gardes ; aucun identifiant de session n'est imprimé et aucune opération équivalente n'est permise sur un projet hébergé.

## 5. Implement the Next.js boundaries

L'implémentation suit cet ordre :

1. déplacer les pages publiques sous `(public)` et mettre Header/Footer dans son layout, sans modifier les URLs ni le rendu ;
2. garder le root layout pour `<html lang="fr">`, les polices, le body et `globals.css` ;
3. ajouter le client Supabase response-aware de Proxy, puis `proxy.ts` avec matcher `/admin/:path*` ;
4. ajouter la DAL `server-only`, le validateur de retour, les DTO et le schéma Zod ;
5. ajouter les deux Server Actions ;
6. ajouter `/admin/connexion` et le formulaire client minimal ;
7. ajouter le layout protégé et l'accueil `/admin` minimal ;
8. ajouter les tokens/styles d'administration déjà définis dans `doc/design.md` ;
9. ajouter les tests purs, Playwright et le lanceur catégorisé.

Le Proxy appelle `getClaims()` immédiatement, transfère cookies et en-têtes, et ne décide jamais du rôle. Chaque page protégée et chaque action qui lit ou modifie des données administratives appelle le contrôle RPC fort. `logoutAction()` est l'exception explicite : elle nettoie seulement la session courante et reste disponible après retrait du rôle. Aucun `use cache`, `unstable_cache`, ancien `middleware.ts`, Route Handler Auth ou nouvelle clé privilégiée n'est ajouté par défaut.

## 6. Run database and pure contract tests

```bash
npm run supabase:test:db
npm run test:unit
```

Résultat attendu :

- `anon` ne peut pas exécuter le wrapper ;
- non-admin, faux rôle `user_metadata`, ancien claim après retrait du rôle courant, session expirée/supprimée ou mauvais propriétaire retournent faux ;
- seul l'administrateur avec session courante retourne vrai ;
- `tests/unit/auth/admin-session.test.ts` appelle directement `requireAdminAction()` et prouve le refus fermé sans exécution de travail protégé, puis l'autorisation uniquement pour claims valides + RPC strictement vrai ;
- email, erreurs fournisseur, redirections et diagnostics respectent leurs contrats ;
- aucun état retourné ne contient de password, cookie, token ou session.

## 7. Start the production-like application locally

Construire puis servir l'artefact de production, au lieu de limiter les tests à `next dev` :

```bash
npm run build
npm run start
```

Dans un second terminal, lancer :

```bash
npm run test:e2e:auth
```

La configuration Playwright doit pouvoir démarrer `npm run start` via `webServer` lorsqu'aucun serveur n'est déjà disponible. Utiliser `workers: 1` afin d'éviter collisions de fixtures et limitations Auth artificielles.

## 8. Required automated matrix

### Identity and access

- visiteur ouvrant `/admin` ou une adresse admin profonde : redirect login, aucune donnée admin ;
- admin valide : accueil minimal, session conservée sur 20 cycles comprenant chacun une navigation protégée vers `/admin`, la vérification du contexte, une actualisation complète et une seconde vérification, soit 40 contrôles protégés ;
- identifiants invalides : refus générique ;
- compte valide non-admin : même refus et contexte nettoyé ;
- admin connecté par l'interface puis session courante expirée localement tout en conservant l'ancien contexte navigateur : toute première requête `/admin` refusée sans contenu administratif ;
- JWT admin dont `auth.sessions` a été supprimée : prochaine requête refusée ;
- admin déjà courant ouvrant login : redirection obligatoire vers `/admin`, en ignorant tout `returnTo` fourni à cette visite ;
- `returnTo` validé n'est consommé qu'après une nouvelle connexion réussie ;
- URL absolue, protocol-relative, encodage ambigu, `/admin/connexion`, `/admin/connexion/` ou descendant de la connexion : fallback `/admin`.

### Form behavior

- email vide/mal formé/de plus de 254 caractères et password vide : erreurs sous champs avant Auth ;
- email avec espaces/casse : normalisé ;
- POST de Server Action délibérément retardé : attente visible et annoncée dans les 1 000 ms suivant la première activation, bouton désactivé et exactement un POST malgré les activations répétées ; le contrat unitaire prouve séparément un seul appel `signInWithPassword` pour cette soumission ;
- adresse inconnue, mauvais mot de passe et compte non-admin : texte visible, catégorie publique, structure d'état et contenu annoncé par la région accessible strictement identiques ; les différences temporelles intrinsèques au fournisseur ne font pas partie de cette mesure ;
- refus récupérable : email conservé, password vide ;
- 429 et panne : messages distincts testés par mapping contrôlé, sans épuiser les quotas.

### Logout

- `scope: local` confirmé ;
- succès puis accès direct, refresh et historique : refus ;
- après Retour : aucune donnée privée, aucun marqueur de contenu protégé, aucune commande administrative active et aucune réponse privée restaurée depuis le cache ; toute interaction ou demande protégée suivante est refusée ;
- autre onglet : prochaine demande protégée refusée ;
- erreur distante : aucun faux succès et action réessayable.

### UI/accessibility/regression

- Chromium et WebKit à 320, 768 et 1 024 px ;
- pas de débordement horizontal ;
- ordre clavier, focus visible, noms accessibles, relations erreur/champ et annonces ;
- cibles de 44 × 44 px ;
- Axe sans violation pertinente sur connexion/accueil/états d'erreur ;
- `/`, `/services`, `/galerie` et `/contact` comparés à la fiche pré-déplacement : URLs, titres/textes visibles, cibles de liens et ordre des sections inchangés, sans débordement aux trois largeurs ;
- Header/Footer publics conformes à cette fiche et absents de l'administration.

## 9. Inspect cache and cookie behavior

Avec les outils réseau du navigateur et Playwright, vérifier sur `/admin/connexion`, le POST de login, le redirect, `/admin` et le logout :

- présence des `Set-Cookie` attendus, y compris sur redirect ;
- `Cache-Control: private, no-store` sur toute réponse admin ;
- conservation des en-têtes plus stricts fournis par `@supabase/ssr` ;
- absence de token/cookie/session dans HTML, props client, console ou logs ;
- aucune donnée privée, commande administrative active ou réponse privée en cache restituée via navigation historique après logout, puis refus de la première interaction ou demande protégée suivante.

## 10. Run the full local gate

```bash
npm run foundation:check
npm run auth:check
```

Si aucun agrégat `auth:check` n'est encore créé, exécuter explicitement :

```bash
npm run supabase:test:db
npm run test:unit
npm run build
npm run test:e2e:auth
npm run lint
npm run typecheck
npm run scan:build-secrets
```

Tout échec donne un code non nul. Le rapport partageable ne contient aucune clé, JWT, cookie, session, password, email fixture complet, trace serveur ou réponse brute Supabase.

### Résultats locaux observés le 10 août 2026

- `npm run foundation:check` : réussi, y compris signup fermé, Storage/RLS, types, lint, TypeScript, build et scans ;
- `npm run auth:check` : réussi avec ses huit catégories de contrôle expurgées ;
- pgTAP : 245 assertions réussies, dont 17 pour le RPC Auth et le retrait de rôle courant ;
- contrats Node 22 : 29 tests réussis, dont la preuve directe de `requireAdminAction()` ;
- Playwright : 42 scénarios réussis sous Chromium et WebKit, incluant Axe, 320/768/1 024 px, 40 demandes protégées par série de 20 cycles, révocation/expiration/retrait de rôle, panne Auth locale, logout multi-onglets et non-régression publique ;
- lint, `tsc --noEmit`, build Next.js de production et scan du bundle : réussis ;
- aucune mutation de projet Supabase hébergé et aucun déploiement Netlify n'ont été effectués.

Les contrôles manuels Safari mobile réel, Firefox, technologie d'assistance, le chronométrage humain SC-002 et la comparaison visuelle humaine SC-010 n'ont pas été exécutés dans cet environnement. Ils restent explicitement ouverts, tout comme le gate de preview Netlify décrit plus bas.

## 11. Manual acceptance

Ces contrôles ne sont pas remplacés par WebKit/Axe :

1. réaliser connexion, erreur et logout sur Safari mobile réel à 320/375 px ;
2. répéter un smoke sur Firefox moderne ;
3. parcourir le formulaire au clavier et vérifier la visibilité du focus ;
4. écouter l'annonce attente/refus/indisponibilité avec la technologie d'assistance disponible ;
5. sur un navigateur moderne supporté et une connexion stable, faire chronométrer par une personne familière des formulaires web le parcours avec pour seule instruction « accéder à l'administration » : départ lorsque le formulaire est entièrement affiché et utilisable, fin lorsque le contexte « Administration » est visible, résultat attendu sous 60 secondes ;
6. comparer visuellement les pages publiques à la fiche pré-déplacement—Header/Footer, titres/textes, liens et ordre des sections—aux largeurs 320, 768 et 1 024 px ;
7. vérifier qu'aucun lien Prestations/Galerie factice n'apparaît dans l'accueil 002.

## 12. Netlify deploy-preview gate

Avant une mise en production ultérieure, sur une preview Netlify reliée à un projet Supabase de test autorisé :

- confirmer que le signup reste fermé ;
- vérifier Origin/Host des Server Actions sans ajouter d'origine large ;
- inspecter `Set-Cookie` et `Cache-Control` derrière le CDN ;
- tester login, refresh, logout et session révoquée ;
- surveiller les 429 Auth éventuels liés à une adresse de sortie Netlify partagée, sans introduire de clé secrète pour transférer l'IP finale ;
- laisser un onglet ouvert, déployer une nouvelle version, puis soumettre/recharger et vérifier un état récupérable ;
- consulter les logs en confirmant l'absence d'email complet, token, cookie, password et trace publique.

Ne pas appliquer la migration ni créer un utilisateur sur un projet hébergé sans autorisation distincte, cible vérifiée et procédure de sauvegarde appropriée.

## 13. Audit de périmètre observé

L'implémentation locale ne contient aucun parcours d'inscription, invitation, récupération ou modification de mot de passe, connexion sociale, MFA, compte client, multi-rôles, CRUD Prestations/Galerie, Route Handler Auth ou cache partagé de session. Elle n'ajoute ni clé `service_role`/secrète au client, ni `middleware.ts`, ni mutation de projet hébergé. L'accueil `/admin` reste volontairement minimal et ne présente aucune commande CRUD factice.

## 14. Documentation review before delivery

Comparer l'implémentation finale à :

- `doc/spec.md` pour le besoin et les limites ;
- `doc/design.md` pour tous les pixels, états et interactions ;
- `doc/architecture.md` pour Proxy/DAL/layouts/flux ;
- `doc/infra.md` pour Netlify, Supabase et variables.

Mettre à jour ces documents dans le même changement seulement si l'implémentation prend une décision qui n'y est pas déjà décrite. La feature n'est terminée que lorsque documents, migration, types, tests et comportement restent cohérents.
