# Implementation Plan: Préparation complète à la production

**Branch**: `006-production-readiness` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-production-readiness/spec.md`

## Summary

Transformer les contrôles déjà livrés par les fonctionnalités 001 à 005 en une chaîne de livraison Netlify reproductible et fermée. Le code ajoutera, après confirmation explicite du domaine, une configuration canonique publique versionnée, les métadonnées SEO/robots/sitemap/données structurées, des en-têtes de sécurité compatibles avec le runtime actuel, une matrice accessibilité automatisée et manuelle, puis un orchestrateur qui consolide les contrôles existants dans un rapport expurgé lié à une seule révision. La chaîne distingue `approved_for_promotion` après les gates de préproduction de `ready` après le smoke production ; le rapport final expurgé et son résumé sont archivés comme assets durables d'une GitHub Release liée au SHA candidat. La Deploy Preview utilise une cible Supabase isolée et reste `noindex, nofollow`; aucun contrôle destructif ne s'exécute contre une cible ambiguë ou la production.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Next.js 16.3.0, React 19.2.8, Node.js 22.x, scripts ESM `.mjs`, SQL PostgreSQL existant

**Primary Dependencies**: Next.js App Router Metadata/robots/sitemap/headers APIs, Supabase JS 2.112.2 et SSR 0.12.4, Supabase CLI 2.112.0, Zod 4.4.3, Netlify/OpenNext et Netlify CLI 27.1.2, Playwright 1.62.1, `@axe-core/playwright` 4.12.1

**Storage**: Supabase PostgreSQL/Auth/Storage existants sans nouvelle table ni nouveau bucket ; configuration Netlify par contexte ; preuves brutes JSON/Markdown/Playwright sous `test-results/production-readiness/` non versionnées ; rapport final expurgé archivé comme asset de GitHub Release lié au SHA, jamais de valeur secrète

**Testing**: orchestrateurs existants `foundation:check`, `auth:check`, `services:check`, `gallery:check`, `contact:check`; suite dédiée `test:e2e:production-readiness`; `node:test`, pgTAP/Supabase CLI, Playwright Chromium/Firefox/WebKit, double audit Axe (WCAG 2.1 A/AA tous impacts puis scan général serious/critical), validation publique Schema.org, revue visuelle signée contre `doc/design.md`, contrôles manuels Safari mobile/Firefox/technologie d'assistance, recette complète sur Deploy Preview puis smoke test sur la production

**Target Platform**: Netlify Free relié à GitHub, production HTTPS canonique sur `knailsbeauty.fr`, redirection de `knailsbeauty.com`, Deploy Previews Netlify, navigateurs modernes dont Safari mobile réel et Firefox moderne

**Project Type**: application web unique Next.js App Router

**Performance Goals**: visibilité publique des mutations en moins de 5 secondes ; galerie limitée à 2 requêtes/2 Mio avant défilement puis 9 requêtes/9 Mio pour les neuf fixtures ; aucun décalage attribuable aux dimensions d'image ; recette déterministe sur une seule révision

**Constraints**: `cacheComponents: true`; origine canonique fixe `https://knailsbeauty.fr` sans `www`; redirections permanentes depuis HTTP, `www`, `.com` et l'hôte technique avec chemin et paramètres conservés ; trois variables runtime applicatives seulement ; aucune clé privilégiée dans le client ; variables ponctuelles du bucket absentes de Netlify ; cible preview distincte de production ; admin et octets privés en `no-store`; pas de test destructif de production ; CSP statique sans nonce pour préserver le rendu statique et le cache ; WCAG 2.1 AA plus cibles projet 44 × 44 px ; tous les diagnostics et archives expurgés ; immutabilité des releases GitHub activée avant l'archive finale

**Scale/Scope**: environ 40 prestations, trois catégories fermées, une administratrice, dizaines à centaines de photos, trois pages publiques canoniques, huit parcours critiques, consolidation des fonctionnalités 001 à 005

## Constitution Check

*GATE: Passed before Phase 0 and re-checked after Phase 1 design.*

- **MVP strict — PASS** : le plan finalise l'hébergement, la sécurité, le SEO, l'accessibilité et la recette du périmètre existant sans réservation, paiement, compte client, analytics ni backend supplémentaire.
- **Documentation d'abord — PASS** : `doc/spec.md`, `doc/design.md`, `doc/architecture.md` et `doc/infra.md` ont été relus dans l'ordre prescrit ; les guides locaux Next.js 16.3 et la documentation/changelog Supabase actuels fondent les décisions. Chaque tâche qui change un besoin, un comportement, une architecture ou une procédure met à jour sa source de vérité dans le même groupe logique, avant toute promotion ; la phase finale ne fait qu'en vérifier la cohérence.
- **Design et accessibilité — PASS** : aucune refonte. Les corrections éventuelles restent bornées aux écarts WCAG et aux règles déjà fixées, avec synchronisation de `doc/design.md` lorsqu'un token ou comportement change.
- **Application Next.js unique — PASS** : Metadata API, fichiers spéciaux, en-têtes et scripts de vérification restent dans l'application et l'outillage existants ; aucun service applicatif parallèle.
- **Frontières serveur/client — PASS** : l'origine canonique est une donnée publique validée et les décisions de contexte restent serveur/build ; aucun secret n'entre dans un composant client et les métadonnées restent rendues sans JavaScript navigateur.
- **Supabase et autorisation — PASS** : les tests distinguent GRANT/Data API et RLS, les rôles `anon`, non-admin et admin, Auth hébergé et Storage privé ; ni `service_role` ni contournement RLS ne sont introduits.
- **Infrastructure reproductible — PASS** : GitHub/Netlify, contextes, variables, domaine, rollback et cible preview sont documentés ; les mutations fournisseur ne sont pas automatisées sans garde ni confirmation.
- **Vérification — PASS** : le rapport impose quatre statuts fermés et refuse `approved_for_promotion` ou `ready` selon l'étape si un contrôle obligatoire échoue, est bloqué ou non exécuté ; les preuves portent sur un SHA unique.

La revue post-Phase 1 ne révèle aucune violation constitutionnelle. Les validations réelles dépendantes du domaine, de Netlify, de Supabase hébergé, de Safari physique et de la boîte de réception demeurent des gates d'exécution, pas des hypothèses du plan.

## Project Structure

### Documentation (this feature)

```text
specs/006-production-readiness/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── evidence-templates.md             # modèles créés par T002
├── accessibility-manual-checklist.md # checklist signable créée par T063
├── visual-manual-checklist.md        # référence visuelle signable des pages publiques
├── contracts/
│   ├── accessibility-verification.md
│   ├── deployment-configuration.md
│   ├── release-evidence.md
│   ├── security-readiness.md
│   ├── seo-discovery.md
│   └── visual-verification.md
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── layout.tsx                    # metadataBase, Open Graph global, JSON-LD confirmé
├── robots.ts                     # production indexable, previews noindex
├── sitemap.ts                    # exactement /services, /galerie, /contact
├── opengraph-image.*             # asset social final validé
├── (public)/
│   ├── services/page.tsx
│   ├── galerie/page.tsx
│   └── contact/page.tsx
└── (admin)/admin/layout.tsx      # noindex/nofollow pour login et pages protégées
lib/
├── production-readiness/
│   ├── environment.ts             # validation des noms/portées sans valeurs
│   ├── evidence.ts                # schéma fermé et décisions en deux étapes
│   ├── report.ts                  # agrégation, couverture et archive
│   ├── requirements.ts            # manifeste FR/SC/AC doc/spec/001–005
│   ├── target-guard.ts            # garde local/preview/production
│   └── types.ts
├── site/
│   ├── deployment-context.ts     # contexte Netlify validé et indexabilité fermée
│   ├── metadata.ts               # descriptions, canonicals et Open Graph partagés
│   └── structured-data.ts        # LocalBusiness avec données confirmées seulement
├── supabase/env.ts                # validation de la cible publique
├── contact/                       # sélection du formulaire par contexte
└── contact-details.ts             # retrait des coordonnées de démonstration
tests/
├── production-readiness/
│   ├── accessibility-admin.spec.ts
│   ├── accessibility-public.spec.ts
│   ├── deployment.spec.ts
│   ├── security-headers.spec.ts
│   ├── seo.spec.ts
│   └── smoke.spec.ts
├── unit/production-readiness/
│   ├── accessibility-contract.test.ts
│   ├── deploy-target-script.test.ts
│   ├── deployment-configuration.test.ts
│   ├── evidence-schema.test.ts
│   ├── metadata.test.ts
│   ├── orchestrator.test.ts
│   ├── redaction.test.ts
│   ├── report.test.ts
│   ├── secret-scan.test.ts
│   └── target-guard.test.ts
└── helpers/
    └── accessibility.ts          # fixture Axe et contrôles partagés
scripts/
├── lib/production-readiness.mjs
├── check-hosted-supabase-security.mjs
├── check-production-security.mjs
├── check-production-readiness.mjs
├── check-deploy-target.mjs
├── check-recovery-readiness.mjs
├── check-seo.mjs
└── smoke-production.mjs
next.config.ts                    # en-têtes de sécurité et CSP statique
netlify.toml                      # commande/build/contextes explicites, Edge existante préservée
playwright.config.ts              # projet Firefox et profils de recette
package.json                      # suites dédiées, production:check et production:smoke
.env.example
.env.gallery-config.example
doc/
├── spec.md
├── design.md
├── architecture.md
└── infra.md
```

**Structure Decision**: conserver l'application unique et réutiliser les contrôles spécialisés existants. Le dossier `lib/site` fournit des fonctions pures et testables à Metadata API ; les routes spéciales Next.js publient les contrats robots/sitemap. L'orchestrateur possède un profil local limité aux contrôles compatibles avec le serveur candidat et un profil Deploy Preview qui sélectionne explicitement les cinq scénarios hébergés ; `smoke.spec.ts` reste réservé au domaine final. Il appelle les suites 001–005 au lieu de les dupliquer. Les preuves brutes restent sous `test-results/`, séparées du code ; seuls le rapport final scanné et son résumé expurgé sont archivés durablement comme assets de release sans modifier le SHA candidat.

## Design Decisions

1. L'origine canonique confirmée `https://knailsbeauty.fr` devient une constante publique versionnée et serveur-compatible. La variable système Netlify `URL` doit lui correspondre exactement en production ; `DEPLOY_PRIME_URL`, `www.knailsbeauty.fr`, `knailsbeauty.com`, `www.knailsbeauty.com` et l'hôte technique ne sont jamais canoniques. Ces variantes redirigent définitivement vers l'origine officielle en conservant chemin et paramètres. L'indexation est autorisée uniquement quand `CONTEXT=production` et que `URL` correspond exactement à cette constante ; en preview, les canonicals restent sur l'origine officielle et toutes les pages reçoivent `noindex, nofollow`.
2. Les trois variables applicatives existantes restent l'inventaire runtime. Leurs valeurs Netlify sont affectées par contexte ; la preview doit utiliser un projet Supabase isolé. Le contrôle compare des identifiants non sensibles dérivés de l'URL/projet et refuse toute égalité preview-production avant une mutation.
3. Le SEO utilise des objets `Metadata` serveur, `app/sitemap.ts` et `app/robots.ts`. Le sitemap de production contient exactement `/services`, `/galerie` et `/contact`. Un layout `/admin` ajoute sa propre directive de non-indexation. Les données structurées et l'asset social omettent toute coordonnée non confirmée.
4. La politique de sécurité est un CSP statique compatible avec Next.js et les ressources réelles : origines fermées, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, plus `nosniff`, politique de référent et permissions minimales. Le nonce dynamique est rejeté car il forcerait le rendu dynamique et neutraliserait le bénéfice du cache sans exigence métier correspondante.
5. L'accessibilité exécute pour chaque état une analyse Axe limitée aux règles WCAG 2.1 A/AA, sans aucune violation quel que soit l'impact, puis une analyse générale distincte dont aucune anomalie serious/critical n'est admise. La matrice couvre 320, 768 et 1 024 px. Le reflow/zoom, le clavier, les dialogues, les annonces, le contraste complexe, Safari mobile réel, Firefox réel et une technologie d'assistance conservent des gates manuels distincts.
6. Après toutes les modifications de code et de documentation, `production:check` capture puis fige le SHA, exige un arbre propre, appelle chaque orchestrateur existant, agrège sans secrets et calcule deux décisions. La Deploy Preview finale et chaque preuve distante, visuelle ou manuelle obligatoire sont ensuite exécutées ou re-signées sur ce SHA figé ; une preuve d'une révision antérieure est invalide. Les revues humaines sont produites avant l'agrégation finale, puis `production:preview-check` exécute une seule fois les contrôles automatisés de preview et valide les références, signatures et SHA des preuves humaines sans prétendre automatiser Safari, Firefox réel ou une technologie d'assistance. `approved_for_promotion` exige tous les gates obligatoires de préproduction ; `ready` exige en plus le smoke de la même révision en production et l'archive durable du rapport. Un statut `failed`, `blocked` ou `not_run` sur une preuve exigée à l'étape courante produit la décision négative correspondante et un code de sortie non nul.
7. Les tests CRUD complets s'exécutent localement ou sur la preview isolée après garde de cible. La production reçoit uniquement une recette de fumée non destructive, sauf le message Contact explicitement contrôlé requis par son contrat fournisseur.
8. Netlify Forms est une ressource du site, pas du contexte de déploiement. La preview doit donc utiliser un nom de formulaire et une notification de test distincts, refusés dans le mauvais contexte par la garde Edge ; si cette isolation logique ne peut être prouvée, une propriété Netlify séparée est requise ou le gate reste bloqué.
9. Un déploiement n'est pas une preuve suffisante : le gate vérifie révision, build/deploy IDs, certificats et redirections de chaque variante `.fr`/`.com`/`www`/HTTP/technique, conservation du chemin et des paramètres, Auth/Storage hébergés, advisors, formulaire Netlify et smoke test final. Le rollback applicatif Netlify est autorisé seulement après contrôle de compatibilité avec les migrations déjà appliquées.
10. US1 et US3 possèdent une validation indépendante au niveau du candidat : build avec profil production simulé et Deploy Preview réelle. Les assertions réseau et SEO sur la production réelle appartiennent au parcours intégré post-promotion afin d'éviter toute dépendance circulaire.
11. Les preuves brutes et captures restent locales/CI. Après le smoke réussi, une GitHub Release est créée en brouillon pour obtenir un ID stable, puis `report.json` et `summary.md` rescannés et expurgés y sont publiés comme assets immuables rattachés au SHA candidat. Le rapport référence l'ID, le tag et les noms d'assets ; les digests SHA-256 complets sont vérifiés dans les métadonnées de release afin d'éviter qu'un asset contienne son propre checksum. Cette archive vérifiée constitue la dernière preuve de la décision `ready`.
12. Le manifeste de couverture distingue `functional_requirement`, `success_criterion`, `acceptance_criterion` et `feature_gate`. Chaque critère de `doc/spec.md` reçoit un identifiant stable dérivé de sa source et de son numéro ; le gate refuse toute source non inventoriée, tout doublon et toute entrée sans preuve.
13. La validation visuelle est une revue humaine datée, effectuée sur Services, Galerie et Contact dans leurs états de référence à 320, 768 et 1 024 px. Elle compare composition, tokens, contenu essentiel et états interactifs à `doc/design.md`; aucune divergence non approuvée n'est acceptée. Les captures servent de preuve, pas de nouvelle source de vérité.
14. Les mises à jour de `doc/spec.md`, `doc/design.md`, `doc/architecture.md` et `doc/infra.md` sont intégrées aux tâches qui prennent ou appliquent la décision concernée. Tous les changements puis les contrôles locaux et documentaires finaux s'achèvent avant le gel du SHA ; les preuves preview, hébergées et humaines finales sont ensuite produites sur ce SHA exact avant `approved_for_promotion`. Après promotion, seules la recette production, la préparation de l'archive, sa publication immuable et sa vérification sont autorisées à faire évoluer la décision de lancement.

## Delivery Gates

- **Local candidate** : toutes les modifications de code et de documentation terminées, arbre propre, SHA capturé puis figé, lint, TypeScript, build, unitaires, migrations/RLS, Auth, Services, Galerie, Contact, SEO, en-têtes, accessibilité automatisée et scan de secrets réussis. Tout commit ultérieur invalide ce gate et impose de recommencer à ce stade.
- **Deploy Preview** : déploiement du SHA figé, contexte non indexable, cible Supabase isolée, tests destructifs explicitement autorisés, formulaire de test isolé, matrice navigateurs, double audit accessibilité, validation Schema.org, revue visuelle signée, contrôles Safari/Firefox/AT signés, contact Netlify réel et rapport sans preuve manquante. L'orchestrateur exécute l'automatisable et vérifie le SHA ainsi que les signatures des preuves humaines.
- **Production promotion — `approved_for_promotion`** : branche et SHA approuvés, canonique `knailsbeauty.fr`, rattachement de `knailsbeauty.com`, certificats et redirections confirmés, variables contextuelles vérifiées, advisors traités, contrôles manuels signés, documentation synchronisée, sauvegarde préalable documentée et tous les gates locaux/preview réussis. Cette décision autorise le déploiement mais pas encore l'annonce du lancement.
- **Post-deployment — `ready`** : smoke test HTTPS/redirects/pages/contact/admin/image/sitemap/robots réussi sur le même SHA, rapport final rescanné, archive brouillon préparée, assets publiés sans modification puis release immuable et digests vérifiés. Aucun nouveau gate local ni aucune réécriture du rapport n'intervient après cette vérification. Toute anomalie critique maintient `not_ready` et déclenche la reprise documentée.

## Complexity Tracking

Aucune violation constitutionnelle à justifier.
