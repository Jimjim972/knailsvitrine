# Phase 0 Research: Préparation complète à la production

Toutes les inconnues techniques du plan sont résolues ci-dessous. Les valeurs opérationnelles encore absentes — domaine officiel, accès fournisseur, appareils physiques et adresse de notification — sont des preuves externes obligatoires : elles bloquent le lancement mais ne changent pas l'architecture retenue.

## 1. Déploiement Netlify et identité du candidat

**Decision**: définir explicitement la branche de production dans Netlify, utiliser une Deploy Preview pour chaque candidat, puis ne promouvoir qu'un SHA Git ayant passé tous les gates. Conserver SHA, deploy ID, permalink immuable et build log expurgé. Les branch deploys restent désactivés sauf besoin explicite.

**Rationale**: Netlify distingue les contextes et reconstruit une preview et une production séparément. Le contrat vérifie donc la même révision et la même configuration attendue, sans prétendre promouvoir un artefact binaire identique. Les deploys atomiques et permalinks rendent le rollback et la preuve traçables.

**Alternatives considered**: publication manuelle hors Git rejetée ; validation d'une branche sans SHA rejetée ; activation générale des branch deploys rejetée pour réduire la surface et le risque d'indexation.

## 2. Variables par contexte et garde de cible

**Decision**: conserver exactement les trois variables applicatives prévues : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` et `SERVICE_SUCCESS_FLASH_SECRET`. Configurer des valeurs distinctes pour production, Deploy Preview, branch deploy et local. `CONTEXT`, `URL`, `DEPLOY_PRIME_URL`, `COMMIT_REF` et les identifiants de déploiement sont des variables système Netlify, pas de nouvelles variables applicatives. Toute mutation distante passe par une garde qui confirme contexte, origine, projet Supabase non-production et autorisation explicite.

**Rationale**: une variable Netlify non ciblée partage par défaut sa valeur entre contextes. Les deux valeurs Supabase publiques sont exposables, tandis que le secret flash reste serveur et distinct. Sur le plan Free, la séparation doit reposer sur les valeurs contextuelles disponibles plutôt que sur des scopes fins potentiellement payants.

**Alternatives considered**: secrets dans `netlify.toml` rejetés car versionnés ; préfixe `NEXT_PUBLIC_` pour le secret rejeté ; fallback preview vers production rejeté ; ajout d'une variable publique de site rejeté comme redondant.

## 3. Origine canonique et contexte d'indexation

**Decision**: stocker l'origine HTTPS officielle confirmée comme constante publique versionnée et l'utiliser pour `metadataBase`, canonicals, Open Graph, sitemap, robots et JSON-LD. En production, `URL` doit lui correspondre exactement. Seul `CONTEXT=production` avec cette cohérence autorise l'indexation ; toute valeur absente ou différente produit `noindex, nofollow` et bloque la promotion. `DEPLOY_PRIME_URL`, l'en-tête `Host` et le domaine technique Netlify ne deviennent jamais canoniques.

**Rationale**: le domaine public n'est pas un secret. Une source versionnée évite qu'une preview ou un alias empoisonne les canonicals, tandis que la variable réservée Netlify apporte une preuve externe. Le domaine final n'étant pas encore confirmé dans les sources du projet, son ajout exact est un prérequis bloquant de l'implémentation, jamais une valeur de démonstration.

**Alternatives considered**: `headers()` rejeté car dépendant de la requête et dynamique ; `DEPLOY_PRIME_URL` rejeté car propre au deploy ; `URL` comme seule vérité rejeté car il peut encore désigner `*.netlify.app` avant configuration du domaine.

## 4. Sitemap, robots, métadonnées et partage social

**Decision**: utiliser les API Metadata statiques Next.js 16.3, `app/sitemap.ts`, `app/robots.ts` et un asset Open Graph final validé. Le sitemap de production contient exactement `/services`, `/galerie` et `/contact`; hors production, il est vide et robots interdit `/`. Le layout `/admin` applique `index:false, follow:false` à la connexion comme aux pages protégées. Chaque page publique possède titre, description, canonical et Open Graph complets.

**Rationale**: les fichiers spéciaux produisent des réponses serveur lisibles sans JavaScript. Les objets imbriqués `openGraph`/`robots` sont remplacés et non fusionnés profondément ; un constructeur partagé évite des métadonnées partielles. Le `X-Robots-Tag` automatique des previews Netlify complète la protection mais ne couvre pas nécessairement le dernier branch deploy et ne fournit pas `nofollow`.

**Alternatives considered**: sitemap incluant `/` rejeté car la racine redirige ; robots seul pour `/admin` rejeté car ce n'est ni une directive page ni une autorisation ; image sociale de démonstration rejetée.

## 5. Données structurées locales

**Decision**: publier un JSON-LD `BeautySalon`/`LocalBusiness` serveur avec seulement le nom, l'origine canonique, l'adresse et les horaires confirmés visibles. Ajouter téléphone, image ou réseau social uniquement après confirmation et affichage cohérent. Retirer avant production le téléphone de démonstration actuellement présent dans `/contact`.

**Rationale**: les données structurées doivent représenter le contenu visible et réel. L'adresse et les horaires sont centralisés dans `lib/contact-details.ts`; le téléphone actuel `+33 1 23 45 67 89` est manifestement fictif et constitue un gate bloquant.

**Alternatives considered**: inventer ou conserver une coordonnée temporaire rejeté ; données JSON-LD client rejetées ; type trop spécifique non confirmé rejeté au profit du type décrivant réellement l'institut.

## 6. Domaine, HTTPS et redirections

**Decision**: déclarer `knailsbeauty.fr` domaine principal et unique origine canonique, sans `www`. Rattacher au même site `www.knailsbeauty.fr`, `knailsbeauty.com` et `www.knailsbeauty.com`, utiliser les certificats gérés Netlify et ajouter des redirections permanentes forcées depuis ces variantes, HTTP et le sous-domaine de production `netlify.app` vers `https://knailsbeauty.fr`. Tester chaque source en conservant chemin et paramètres, avec certificat valide et sans boucle depuis l'extérieur.

**Rationale**: le sous-domaine Netlify et le domaine `.com` restent des points d'entrée distincts tant qu'ils ne sont pas rattachés et redirigés. Une origine canonique unique exige une convergence réseau réelle de tous les hôtes confirmés, pas seulement une balise HTML.

**Alternatives considered**: rendre le `.com` canonique ou servir le même contenu sous deux domaines rejeté ; HSTS preload avant maîtrise de tous les sous-domaines rejeté ; DNS ou certificat supposés valides à partir du dashboard seul rejetés.

## 7. En-têtes de sécurité et CSP

**Decision**: générer dans `next.config.ts` un CSP statique fermé aux ressources du MVP, avec origine Supabase exacte pour `connect-src` et images, puis `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`. Ajouter `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` et une `Permissions-Policy` restrictive. Tester chaque route et les flux Auth, Storage, polices, images et formulaire avant promotion.

**Rationale**: Next.js 16.3 documente les headers statiques. Les nonces forcent le rendu dynamique, désactivent le rendu statique/PPR et renchérissent chaque requête ; aucune donnée métier ne l'exige. Les scripts/styles inline générés par Next imposent une politique de compatibilité explicitement testée plutôt qu'un nonce global.

**Alternatives considered**: CSP nonce rejeté pour ce MVP mis en cache ; hôtes génériques `https:` ou `*` rejetés ; `X-Frame-Options` seul rejeté au profit de `frame-ancestors` (un doublon cohérent peut rester en défense additionnelle).

## 8. Référentiel d'accessibilité et automatisation

**Decision**: viser toute la WCAG 2.1 A/AA sur les pages et processus complets. Centraliser une fixture Axe qui exécute deux analyses distinctes : tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` avec zéro violation quel que soit l'impact, puis scan général avec zéro violation `serious` ou `critical`, sans exclusion silencieuse. Scanner chaque état réel aux largeurs 320 × 760, 768 × 900 et 1 024 × 900 sur Chromium, avec couverture critique Firefox/WebKit, et attacher les deux JSON Axe complets. Conserver les règles projet plus strictes de cibles 44 × 44 px et réduction des mouvements.

**Rationale**: Axe ne prouve pas une conformité complète et une violation `moderate` peut rester normative. Les suites existantes utilisent des seuils hétérogènes ; une fixture commune évite qu'Auth/Contact exigent zéro violation alors que Services/Galerie ignorent certains impacts. Les 44 × 44 px relèvent de WCAG 2.1 AAA mais sont rendus obligatoires par le design du projet.

**Alternatives considered**: Axe serious/critical seul rejeté ; scan WCAG seul sans contrôle complémentaire rejeté ; page neutre seule rejetée ; suite accessibilité sans réutilisation des états métier rejetée.

## 9. Reflow, zoom, clavier et vérifications manuelles

**Decision**: séparer le test à 200 % de texte/zoom et le reflow équivalent à 320 CSS px/400 % depuis 1 280 px. Automatiser Tab, Shift+Tab, Enter, Espace et Escape, focus visible/restauré, dialogues, annonces, overflow, cibles et `prefers-reduced-motion`. Exiger en plus Firefox réel, iPhone/iPad Safari physique et VoiceOver ou une technologie d'assistance réellement disponible, avec revue humaine des alt, contrastes complexes, ordre de lecture et dépendances au survol/couleur.

**Rationale**: Playwright WebKit suit WebKit mais ne pilote pas Safari de marque. Axe ne juge ni la pertinence d'un alt, ni la perception du focus, ni une annonce effective par lecteur d'écran. 320 px seul ne simule pas tout le zoom/reflow.

**Alternatives considered**: `.focus()` comme preuve clavier rejeté ; WebKit comme substitut Safari rejeté ; automatisation du contraste sur image comme preuve finale rejetée.

## 10. GRANT, RLS et Data API Supabase

**Decision**: conserver la Data API requise par `supabase-js`, mais imposer révocation des privilèges par défaut, GRANT explicites minimaux et RLS sur chaque table exposée. Tester séparément catalogue/GRANT, succès d'une lecture publique autorisée et invisibilité d'une ligne masquée. La production n'exécute que des inspections et lectures non destructives.

**Rationale**: le changement Supabase du 28 avril 2026 rend l'auto-exposition des nouvelles tables variable selon l'âge/configuration du projet jusqu'à son application générale. GRANT et RLS sont deux protections indépendantes ; le projet possède déjà le modèle explicite approprié.

**Alternatives considered**: dépendre des défauts du projet rejeté ; RLS seule ou GRANT seul rejeté ; `service_role` pour tester rejeté car il contourne RLS.

## 11. Auth, rôle courant et inscription

**Decision**: vérifier que toutes les inscriptions email/OTP, SMS et anonymes sont désactivées. Autoriser l'admin uniquement depuis `raw_app_meta_data` courant, avec `session_id` encore présent dans `auth.sessions` pour le même utilisateur et `not_after` valide. Tester promotion, déclassement, falsification `user_metadata`, révocation et expiration localement/preview. En production, inspecter d'abord la configuration ; toute tentative canari potentiellement mutatrice exige autorisation et nettoyage documenté.

**Rationale**: `raw_user_meta_data` est contrôlable par l'utilisateur et le claim JWT peut être ancien. La vérification de la session et du rôle courants garantit le refus au prochain contrôle sensible, même avant expiration cryptographique du jeton.

**Alternatives considered**: rôle JWT seul, layout, Proxy ou cache d'autorisation rejetés ; `supabase config push` automatique contre production rejeté.

## 12. Storage privé et échecs partiels

**Decision**: maintenir le bucket privé, le téléchargement same-origin et les politiques sensibles à l'opération. Tester séparément `INSERT`, `SELECT`, `UPDATE` et `DELETE`; l'upsert exige `INSERT + SELECT + UPDATE`. La liste anonyme reste refusée et un objet cesse d'être livré dès que sa ligne est masquée, non prête ou supprimée. Les mutations complètes utilisent des UUID jetables uniquement en local/preview ; production se limite à une image publique connue, une image déjà masquée et un refus de liste.

**Rationale**: un `SELECT` Storage générique peut autoriser listing et téléchargement. Une URL signée ne permet pas la révocation immédiate. La suppression applicative doit traiter ligne et objet avec état `repair_required` en cas d'échec partiel.

**Alternatives considered**: bucket public, URLs signées, suppression SQL de `storage.objects` et service role rejetés.

## 13. Advisors, SSL, réseau et sauvegarde

**Decision**: exécuter les advisors localement puis sur la cible liée, capturer toutes les alertes et traiter chaque warning par correction ou acceptation de risque datée ; le code retour `--fail-on error` ne suffit pas. Vérifier SSL Enforcement et Network Restrictions en lecture seule avant lancement. Sur l'offre Free, planifier un `db dump` chiffré hors dépôt et conserver séparément les originaux Storage ; tester la restauration seulement sur une cible locale/jetable.

**Rationale**: les sauvegardes PostgreSQL ne contiennent pas les octets Storage et l'offre Free ne doit pas être présentée comme fournissant PITR/sauvegarde automatique garantie. Activer SSL ou changer les CIDR peut interrompre ou verrouiller l'accès et exige une fenêtre autorisée.

**Alternatives considered**: ignorer les warnings rejeté ; CIDR mondial rejeté ; restauration de production comme test rejetée ; prétendre qu'un rollback Netlify restaure les données rejeté.

## 14. Isolation Netlify Forms

**Decision**: traiter Netlify Forms comme une ressource au niveau du site. Les contextes non-production utilisent un formulaire `contact-preview` et une notification de test distincte ; la garde Edge refuse `contact` hors production et `contact-preview` en production. Si cette isolation logique n'est pas démontrable, utiliser une propriété Netlify de preview séparée ou laisser le gate bloqué.

**Rationale**: une Deploy Preview isole code et URL, pas automatiquement formulaires, soumissions et notifications. Réutiliser `form-name=contact` en preview pourrait polluer le formulaire ou déclencher la notification opérationnelle de production.

**Alternatives considered**: prétendre à l'isolation par contexte rejeté ; deuxième site Netlify choisi seulement si l'isolation logique échoue, car il alourdit l'exploitation du MVP.

## 15. Rapport de préparation et stratégie de tests

**Decision**: créer un orchestrateur unique qui capture SHA et contexte avant exécution, appelle les suites spécialisées existantes, normalise chaque preuve vers `passed | failed | blocked | not_run`, puis calcule d'abord `approved_for_promotion | not_approved` sur les gates de préproduction et ensuite `ready | not_ready` après le smoke production. Les tests mutables s'arrêtent si la cible n'est pas explicitement preview/local et distincte de production. Les artefacts comportent résultats, versions et références, jamais cookies, clés, contenu Contact ou identifiants personnels. Les preuves brutes restent locales/CI ; après succès final, les deux fichiers expurgés et rescannés sont attachés à une GitHub Release créée en brouillon puis publiée avec l'immutabilité des releases activée. L'API expose alors l'état `immutable`, la révision ciblée et le digest SHA-256 de chaque asset, qui sont relus avant de rendre la décision officielle.

**Rationale**: relancer des commandes isolées peut mélanger des révisions et masquer des absences. Un état bloqué/non exécuté n'est pas un succès. La séparation des décisions supprime le paradoxe d'un smoke obligatoire qui ne peut exister avant la promotion. L'archive de release conserve une preuve durable sans créer un commit qui changerait le SHA évalué. Les tests de refus destructifs sont dangereux en production précisément si la protection régresse.

**Alternatives considered**: simple checklist manuelle rejetée ; décision `ready` unique avant et après déploiement rejetée comme circulaire ; commit du rapport final rejeté car il changerait le SHA candidat ; preuves de plusieurs SHA rejetées ; scan des logs bruts rejeté ; tests CRUD de production rejetés.

## 16. Rollback et opérations

**Decision**: distinguer le rollback atomique Netlify et la restauration Supabase. Avant de publier un ancien deploy, vérifier sa compatibilité avec le schéma courant et les variables capturées ; sinon effectuer un roll-forward. Verrouiller temporairement l'auto-publication si nécessaire, puis rejouer le smoke test. Sauvegarder prestations et base avant opération importante, conserver les originaux d'image et documenter les quotas/contacts d'escalade.

**Rationale**: un rollback applicatif ne restaure ni migrations, ni données, ni fichiers. Un déploiement Git plus récent peut aussi remplacer immédiatement une version restaurée.

**Alternatives considered**: rollback aveugle rejeté ; mutation destructive de production pour prouver la reprise rejetée.

## 17. Inventaire stable des critères d'acceptation

**Decision**: inventorier séparément les FR, SC, critères d'acceptation de `doc/spec.md` et gates des fonctionnalités 001 à 005. Chaque critère reçoit un identifiant stable composé de sa source versionnée et de son identifiant ou numéro de scénario. Le rapport échoue si une source attendue disparaît, si un identifiant est dupliqué ou si une entrée obligatoire ne pointe vers aucune preuve.

**Rationale**: compter uniquement FR/SC et fonctionnalités permettrait d'annoncer une couverture complète tout en omettant un scénario métier détaillé dans `doc/spec.md`. Un inventaire fermé rend cette omission détectable par test.

**Alternatives considered**: déduire la couverture depuis les titres de tests rejeté car instable ; stocker seulement un pourcentage rejeté car non auditable ; recopier librement les critères dans le rapport rejeté car sujet à dérive.

## 18. Validation visuelle et données structurées

**Decision**: utiliser `doc/design.md` comme unique référence visuelle et signer une comparaison des états publics à 320, 768 et 1 024 px. Les captures sont des preuves datées liées au SHA, jamais une référence parallèle. Pour les données structurées, exiger une validation publique par le Schema.org Validator ; son indisponibilité produit `blocked`, même si la syntaxe locale est valide.

**Rationale**: « absence de régression visuelle connue » et « validateur reconnu » ne fournissent aucune règle de décision reproductible. La référence du projet et un validateur nommé rendent les gates observables sans introduire une refonte ni une tolérance arbitraire.

**Alternatives considered**: snapshots pixels comme seule preuve rejetés car fragiles entre moteurs ; revue visuelle sans routes/largeurs rejetée ; validation JSON syntaxique seule rejetée car elle ne contrôle pas le vocabulaire.

## 19. Ordre documentaire et finalisation

**Decision**: synchroniser chaque document de vérité dans le même groupe logique que le changement concerné, terminer toutes les modifications puis lint, types, build, tests, scans et revue documentaire, et seulement alors capturer et figer le SHA candidat. Construire ensuite la Deploy Preview finale depuis ce SHA, exécuter ou re-signer sur cette révision exacte toutes les preuves hébergées, visuelles et manuelles, puis lancer une seule fois l'orchestrateur final de preview : il automatise les contrôles exécutables et valide les métadonnées/signatures déjà produites par les revues humaines. Après promotion, scinder la finalisation en trois opérations reprenables : smoke production, préparation/téléversement de l'archive brouillon, puis publication immuable et vérification fournisseur.

**Rationale**: une phase documentaire postérieure à la promotion contredit la constitution. Une revue distante exécutée avant le dernier commit ne prouve pas le candidat final, et un script ne peut pas remplacer une manipulation sur appareil réel ou avec technologie d'assistance. Relancer le gate local après avoir publié une décision `ready` peut aussi produire un nouveau rapport négatif ou divergent. Des étapes finales séparées rendent les échecs partiels explicites et récupérables.

**Alternatives considered**: mise à jour documentaire en fin de projet rejetée ; audit documentaire précédant une modification de guide rejeté ; réutilisation de preuves d'un SHA antérieur rejetée ; simulation de revues humaines par l'orchestrateur rejetée ; double exécution des scans avant puis pendant l'agrégation rejetée ; régénération du rapport après publication immuable rejetée ; tâche unique promotion-à-archive rejetée car non reprenable proprement.

## Sources officielles

### Next.js et Netlify

- [Next.js 16.3 — Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js — generateMetadata et metadataBase](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js — sitemap.xml](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Next.js — robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Next.js — Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)
- [Next.js — Headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
- [Netlify — Deploy overview](https://docs.netlify.com/deploy/deploy-overview/)
- [Netlify — Deploy Previews](https://docs.netlify.com/deploy/deploy-types/deploy-previews/)
- [Netlify — Environment variables](https://docs.netlify.com/build/environment-variables/overview/)
- [Netlify — HTTPS/SSL](https://docs.netlify.com/manage/domains/secure-domains-with-https/https-ssl/)
- [Netlify — Add a domain redirect](https://docs.netlify.com/manage/domains/manage-domains/add-domain-redirect/)
- [Netlify — Redirect options and domain-level redirects](https://docs.netlify.com/manage/routing/redirects/redirect-options/)
- [Netlify — Manage deploys and rollbacks](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/)
- [Netlify — Forms setup](https://docs.netlify.com/manage/forms/setup/)
- [OpenNext — Netlify Forms](https://opennext.js.org/netlify/forms)

### Accessibilité

- [WCAG 2.1](https://www.w3.org/TR/WCAG21/)
- [W3C — Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow)
- [W3C — Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [WAI-ARIA APG — Modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Playwright — Accessibility testing](https://playwright.dev/docs/accessibility-testing)
- [Playwright — Browsers](https://playwright.dev/docs/browsers)
- [Apple — VoiceOver on iPhone](https://support.apple.com/guide/iphone/iphe4ee74be8/ios)

### Supabase

- [Supabase changelog — tables not auto-exposed](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Supabase — Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase — Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase — Database advisors](https://supabase.com/docs/guides/database/database-advisors)
- [Supabase — Going into production](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase — Backups](https://supabase.com/docs/guides/platform/backups)

### GitHub

- [GitHub — Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
- [GitHub — Verify release integrity](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/verify-release-integrity)
- [GitHub REST — Release assets et digest SHA-256](https://docs.github.com/en/rest/releases/assets)
