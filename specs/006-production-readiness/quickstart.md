# Quickstart: Validation de la préparation à la production

Ce guide décrit la recette après implémentation. Il ne vaut pas preuve de lancement tant que le rapport d'une révision candidate n'a pas été généré et que les gates manuels/distants ne sont pas signés.

## Prérequis

- Node.js 22.x et dépendances installées depuis le lockfile ;
- Docker et Supabase CLI 2.112.0 pour la pile locale ;
- Netlify CLI authentifié sur le site vérifié, dépôt GitHub relié ;
- GitHub CLI authentifié, droits de création de release et immutabilité des releases activée sur le dépôt GitHub ;
- projet Supabase preview distinct du projet production ;
- accès read-only aux réglages Netlify/Supabase de production ;
- domaine canonique, adresse de notification et responsable de lancement confirmés ;
- Safari sur iPhone/iPad physique, Firefox moderne et technologie d'assistance disponible ;
- aucun secret imprimé dans le terminal, le rapport ou une capture.

Avant tout contrôle mutable distant, vérifier le contrat [deployment-configuration.md](./contracts/deployment-configuration.md). Une cible ambiguë doit produire `blocked`, jamais un test « pour voir ».

## 1. Préparer le candidat local

Vérifier l'état du dépôt et les versions :

```bash
git status --short --branch
git rev-parse HEAD
node --version
npm --version
npx supabase --version
npx netlify --version
```

Le candidat de promotion exige que toutes les modifications de code et de documentation soient terminées et que l'arbre soit propre. Installer les dépendances avec la méthode verrouillée du projet, puis préparer l'environnement local à partir de `.env.example`. Ne copier aucune valeur réelle dans un fichier versionné.

Vérifier l'inventaire documentaire avant le gel :

```bash
npm run documentation:check
```

Cette commande refuse une source requise absente, les inventaires FR/SC/critères/gates divergents, les tâches dupliquées et tout document de vérité encore modifié dans l'arbre. `KN_DOCUMENTATION_ALLOW_DIRTY=true` est réservé au développement du checker et ne constitue jamais une preuve de gel.

Lancer le gate complet :

```bash
npm run production:check
```

Résultat attendu :

- un seul SHA capturé avant et après ;
- les orchestrateurs Foundation, Auth, Services, Galerie et Contact appelés une seule fois ;
- lint, TypeScript, build, unitaires, migrations/RLS, advisors, E2E, SEO, en-têtes, accessibilité et secrets réussis ;
- `test-results/production-readiness/<sha>/report.json` valide ;
- `promotionDecision=not_approved` tant que les preuves de préproduction distantes/manuelles manquent ;
- `launchDecision=not_ready` tant que la production, son smoke et l'archive finale n'existent pas.

Le profil local positionne en interne `KN_PLAYWRIGHT_LOCAL_GATE=true` pour exécuter les navigateurs hôte Chromium/WebKit sans rester bloqué par un Firefox Playwright natif incompatible avec macOS 27. Cela ne constitue aucune dérogation au candidat : la preuve Firefox automatisée est produite dans l'image officielle Playwright, et `production:preview-check` n'active jamais ce filtre et exige les trois moteurs aux trois largeurs.

Le succès de ce gate capture et fige le SHA candidat. Tout commit ou changement documentaire ultérieur invalide les preuves et impose de reprendre à cette étape. Ne pas relancer manuellement les sous-suites pour masquer un résultat : corriger la cause, produire un nouveau candidat propre, puis rejouer la chaîne complète.

## 2. Vérifier l'inventaire des variables

Comparer les noms et contextes sans afficher les valeurs. La recette doit prouver :

- les trois variables applicatives obligatoires dans chaque contexte utile ;
- des valeurs preview et production distinctes ;
- l'absence de toutes les variables `SUPABASE_GALLERY_CONFIG_*` ;
- aucun `service_role`, `sb_secret_...` ou secret public ;
- un secret flash serveur d'au moins 32 caractères ;
- l'URL et la clé publiable cohérentes avec le projet attendu ;
- la clé ponctuelle du bucket révoquée.

Toute modification de variable Netlify exige un nouveau déploiement avant vérification.

## 3. Valider la Deploy Preview

Créer la preview depuis le SHA du candidat. Consigner SHA, deploy ID, permalink et version de l'adaptateur Next/OpenNext sans capturer les variables.

Exécuter d'abord la garde de cible :

```bash
npm run production:target-check -- --context deploy-preview
```

Le résultat doit confirmer :

- origine de preview et contexte Netlify ;
- projet Supabase non-production et distinct ;
- formulaire `contact-preview` ;
- mutation explicitement autorisée ;
- meta `noindex,nofollow`, robots bloquant tout et sitemap vide.

La garde validée autorise les contrôles hébergés et humains des sections suivantes. Ne pas lancer encore l'agrégation finale : `production:preview-check` exige que les preuves Safari physique, Firefox réel, VoiceOver/AT et visuelles soient déjà présentes et signées sur le SHA figé.

### Contact preview

Vérifier dans Netlify :

- détection de `contact-preview` ;
- soumission AJAX après autorisation de la Server Action ;
- POST invalide refusé par la garde ;
- honeypot absent des soumissions ;
- classification Verified/Spam contrôlée ;
- notification envoyée uniquement vers l'adresse de test ;
- aucun envoi vers la notification opérationnelle `contact`.

Si Forms ne peut pas être isolé logiquement sur le même site, arrêter et utiliser une propriété Netlify de preview séparée avant de continuer.

## 4. Préparer la matrice de sécurité hébergée

Sur preview, confirmer que la garde de cible, les comptes de test et les fixtures UUID permettront à `production:preview-check` d'exécuter une seule fois avec les rôles anon, authenticated non-admin et admin courant :

- lectures actives/masquées ;
- appels directs des Server Actions ;
- création, modification, ordre, masquage et suppression Services/Catégories ;
- upload, remplacement, masquage, réparation, pagination et suppression Galerie ;
- Storage GET/list/INSERT/SELECT/UPDATE/DELETE ;
- promotion/déclassement de rôle, falsification `user_metadata`, expiration/révocation ;
- inscription email/OTP, SMS et anonymous refusée ;
- échecs partiels ligne/fichier non publics et réparables.

Les fixtures utilisent des chemins UUID dédiés et sont nettoyées. Aucune clé privilégiée n'est utilisée pour prouver RLS. Ne pas lancer séparément cette matrice mutable sur le SHA figé : son exécution autoritative appartient à la commande unique de la section 6 ter.

Sur production, limiter le gate à :

- inspection des catalogues, GRANT, RLS et politiques ;
- lecture d'une donnée active connue et invisibilité d'une ligne déjà masquée ;
- GET d'une image publique connue, refus d'une image déjà non publique, refus de liste ;
- configuration Auth lue avant tout canari ;
- advisors et réglages plateforme en lecture seule.

Ne jamais créer, masquer ou supprimer une vraie donnée de production pour fabriquer une preuve de refus.

## 5. Exécuter les advisors et contrôles plateforme

Local :

```bash
npm run supabase:advisors
```

Cible liée vérifiée :

```bash
npx supabase db advisors --linked --type all --level warn --fail-on error
npx supabase ssl-enforcement get --project-ref <verified-ref>
npx supabase network-restrictions get --project-ref <verified-ref>
```

Capturer toutes les alertes, pas seulement le code retour. Chaque warning pertinent est corrigé ou associé à une acceptation de risque datée et bornée. Les commandes de modification SSL/réseau/config Auth ne font pas partie de cette recette read-only.

## 6. Accessibilité automatisée et manuelle

Ne pas lancer séparément `test:e2e:accessibility` sur le SHA figé : `production:preview-check` l'exécute une seule fois dans la section 6 ter. Pour chaque état, ce gate automatisé doit produire zéro violation WCAG 2.1 A/AA quel que soit l'impact, puis zéro violation serious/critical lors du scan général. Il attache les deux JSON Axe et vérifie overflow global — hors contenu réellement bidimensionnel identifié —, cibles, focus, annonces, clavier et réduction des mouvements.

Après le gel du SHA et sur sa Deploy Preview finale, exécuter ou re-signer après revalidation réelle :

1. Firefox réel : clavier intégral, zoom 200 %, reflow 400 %/320 CSS px, titres, contrastes et dialogues.
2. iPhone/iPad Safari physique : tactile, orientation, menu, galerie sans hover, formulaires, 44 × 44 px.
3. VoiceOver ou AT disponible : rotor, ordre de lecture, alt, erreurs, statuts, login et dialogues.
4. Revue humaine : sens des alt, couleur/icône/hover, contrastes complexes et focus perceptible.

Consigner les preuves selon [accessibility-verification.md](./contracts/accessibility-verification.md). WebKit automatisé ne remplace pas Safari réel.

## 6 bis. Revue visuelle

Avant d'autoriser la promotion, comparer Services, Galerie et Contact à `doc/design.md` aux largeurs 320, 768 et 1 024 px. Couvrir les états listés dans [visual-verification.md](./contracts/visual-verification.md), signer chaque ligne et conserver uniquement des captures expurgées liées au SHA. Une différence non approuvée ou une référence contradictoire bloque la promotion.

## 6 ter. Consolider la Deploy Preview

Après les contrôles hébergés, l'accessibilité manuelle et la revue visuelle signée, exécuter une seule fois :

```bash
PLAYWRIGHT_BASE_URL="https://<deploy-preview>" \
npm run production:preview-check -- \
  --candidate-started-at "<gel-UTC>" \
  --evidence "test-results/production-readiness/<sha>/manual/hosted-evidence.json"
```

La commande ne doit accepter qu'une URL HTTPS de preview vérifiée construite depuis le SHA figé. `--candidate-started-at` reprend l'horodatage UTC du gel T080 ; chaque `--evidence` peut désigner un objet ou un tableau JSON de preuves manuelles/distantes expurgées. L'orchestrateur exécute `test:e2e:production-readiness`, Schema.org et les doubles scans automatisés sur les trois moteurs, puis agrège les preuves humaines déjà produites en validant leur SHA, leur date, leurs artefacts et leur signature. Il ne prétend pas exécuter les manipulations sur appareil réel ou avec technologie d'assistance.

Le processus Playwright reçoit `AUTH_E2E_ADMIN_EMAIL` et `AUTH_E2E_ADMIN_PASSWORD` pour un compte administrateur jetable dédié à la preview. Sa création, son périmètre et sa suppression après le gate sont consignés dans la preuve hébergée. Le profil hébergé désactive volontairement le `globalSetup` local : il ne lance jamais Supabase CLI/Docker et ne crée aucune identité par une clé locale. Ces deux valeurs restent injectées hors ligne de commande et sont absentes des traces, rapports et captures partagés.

## 7. Confirmer l'origine puis préparer la production

L'origine confirmée est `https://knailsbeauty.fr`, sans `www`. `knailsbeauty.com` et `www.knailsbeauty.com` sont uniquement des entrées de redirection. Ne jamais utiliser l'hôte de la requête ou une URL de preview comme canonical.

Avant promotion, vérifier :

- domaine canonique exact `https://knailsbeauty.fr` inscrit dans la configuration publique versionnée ;
- domaine principal Netlify identique ;
- domaines `.fr` et `.com` rattachés, DNS propagés et certificats HTTPS valides ;
- redirections permanentes HTTP, `www`, `.com` et sous-domaine Netlify vers `https://knailsbeauty.fr`, avec chemin et paramètres conservés, sans boucle ;
- trois variables production valides ;
- formulaire `contact`, notification opérationnelle et `Reply-To` confirmés ;
- téléphone de démonstration absent ;
- sauvegarde logique chiffrée hors dépôt et originaux d'images disponibles ;
- compatibilité de rollback avec les migrations appliquées ;
- 100 % des preuves preview/manuelles obligatoires `passed`.
- 100 % des documents de vérité synchronisés avec le candidat et aucune modification documentaire requise reportée après promotion.

L'orchestrateur doit alors produire `promotionDecision=approved_for_promotion` et conserver `launchDecision=not_ready`. Cette première décision autorise le déploiement du SHA, pas encore l'annonce du lancement.

La sauvegarde PostgreSQL ne contient pas les octets Storage. Tester sa restauration uniquement sur une cible jetable.

## 8. Promouvoir et exécuter le smoke test

Publier depuis la branche de production autorisée et vérifier que `COMMIT_REF` égale le SHA approuvé.

Exécuter :

Injecter d'abord `KN_PRODUCTION_CONTACT_SMOKE_EMAIL`, `KN_PRODUCTION_ADMIN_EMAIL` et `KN_PRODUCTION_ADMIN_PASSWORD` dans la session depuis le gestionnaire de secrets approuvé, sans les placer dans la ligne de commande ni dans l'historique. Puis exécuter les paramètres non secrets :

```bash
PRODUCTION_BASE_URL="https://knailsbeauty.fr" \
KN_PRODUCTION_EXPECTED_SHA="<sha-complet-approuvé>" \
KN_PRODUCTION_DEPLOY_ID="<deploy-id-publié>" \
KN_PRODUCTION_TECHNICAL_ORIGIN="https://friendly-cactus-227b77.netlify.app" \
KN_PRODUCTION_CONTACT_SMOKE_AUTHORIZED="true" \
npm run production:smoke
```

Injecter ces valeurs dans le processus ou un gestionnaire de secrets, jamais en historique shell partagé, fichier versionné, rapport, trace, capture ou vidéo. La commande désactive les artefacts navigateur susceptibles de capturer les identifiants. Elle refuse toute autre origine, tout SHA divergent, un hôte technique hors Netlify ou une soumission Contact non explicitement autorisée.

Le smoke test reste non destructif, à l'exception du message Contact contrôlé autorisé par son contrat. Il réussit les 11 contrôles contractuels sur 11 — les trois pages comptent séparément et `robots` reste distinct de `noindex` admin — puis vérifie également :

- HTTPS, certificat, redirections et canonical ;
- `/services`, `/galerie`, `/contact` ;
- une lecture de prestation et une image ;
- contact réel, Verified/notification/`Reply-To` ;
- login admin, refus sans session et cache privé ;
- sitemap exact, robots production et noindex admin ;
- CSP/en-têtes sans ressource légitime bloquée ;
- absence de secret dans réponses et journaux autorisés ;
- SHA/deploy identiques au candidat.

Le rapport final doit passer de `not_ready` à `ready` seulement après ce smoke test, l'approbation datée du responsable, un nouveau scan de confidentialité et l'archivage de `report.json` et `summary.md` comme assets d'une GitHub Release liée au SHA candidat. Vérifier d'abord que l'immutabilité des releases est activée, créer la release en brouillon afin d'inscrire son ID, son tag et les noms d'assets dans le rapport, puis téléverser les assets et publier. Relire l'état `immutable`, le SHA ciblé et les digests SHA-256 fournis par les métadonnées, puis vérifier les copies locales :

```bash
gh release verify-asset "<release-tag>" "test-results/production-readiness/<sha>/report.json"
gh release verify-asset "<release-tag>" "test-results/production-readiness/<sha>/summary.md"
```

Ne jamais inscrire un asset dans son propre checksum ni créer un commit de preuve qui changerait le SHA évalué.

## 8 bis. Vérifier la capacité de reprise

Après avoir créé hors dépôt un export logique chiffré, conservé les originaux et réellement restauré sur une cible locale/jetable, exécuter :

```bash
KN_RECOVERY_CANDIDATE_SHA="<sha-complet>" \
KN_RECOVERY_ENCRYPTED_EXPORT_PATH="<chemin-hors-dépôt>.age" \
KN_RECOVERY_ORIGINALS_DIRECTORY="<répertoire-hors-dépôt>" \
KN_RECOVERY_RESTORE_EVIDENCE_PATH="<preuve-restore.json>" \
KN_RECOVERY_ROLLBACK_EVIDENCE_PATH="<preuve-rollback.json>" \
npm run recovery:check
```

Le checker ne fabrique ni export ni restauration. Il refuse les ressources dans le dépôt, un export non chiffré ou lisible par d'autres utilisateurs, l'absence d'originaux, une restauration non `passed`, un SHA différent ou un deploy de rollback non déclaré compatible. Le rapport ne conserve que digests, statuts, compte d'originaux et identifiant de deploy non secret.

## 9. Retour arrière

Si le smoke révèle une régression critique :

1. marquer le rapport `not_ready` et `rollback_pending` ;
2. comparer le schéma actuel aux attentes du dernier deploy validé ;
3. publier l'ancien deploy atomique seulement s'il reste compatible, sinon corriger en roll-forward ;
4. empêcher un nouveau deploy automatique de remplacer la reprise si nécessaire ;
5. rejouer le smoke complet ;
6. documenter l'incident et la décision.

Le rollback Netlify ne restaure jamais Supabase. Une restauration de production requiert une autorisation distincte, une sauvegarde préalable et une fenêtre planifiée.

## Critères d'arrêt

Arrêter immédiatement et conserver `not_ready` si :

- SHA, contexte, origine ou cible de données ne correspondent pas ;
- une preview touche Forms ou Supabase de production ;
- un secret apparaît dans un artefact ;
- un gate obligatoire échoue, est bloqué ou non exécuté ;
- le domaine/certificat n'est pas confirmé ;
- Safari réel, Firefox ou AT ne peut pas être vérifié ;
- une alerte sécurité pertinente reste sans décision ;
- une preuve appartient à une autre révision ;
- le rapport final n'est pas archivé durablement, la release n'est pas immuable ou les digests fournisseur ne correspondent pas ;
- le téléphone fictif ou une autre donnée temporaire reste visible.

Les formats et règles de décision sont définis dans [release-evidence.md](./contracts/release-evidence.md).
