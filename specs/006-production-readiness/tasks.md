# Tasks: Préparation complète à la production

**Input**: Design documents from `/specs/006-production-readiness/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: La spécification exige explicitement des tests automatisés, manuels, locaux, Deploy Preview et production. Les tâches de test précèdent donc l'implémentation correspondante et doivent échouer pour la capacité encore absente avant d'être rendues vertes.

**Organization**: Les tâches sont regroupées par user story afin que déploiement, sécurité, SEO, accessibilité et décision de lancement puissent être vérifiés séparément.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : exécutable en parallèle car fichiers distincts et aucune dépendance sur une tâche inachevée.
- **[Story]** : user story couverte.
- Chaque tâche indique les chemins exacts à modifier ou à produire.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Préparer les conventions et artefacts communs sans changer le comportement du MVP.

- [X] T001 Créer la convention des suites Production Readiness dans `tests/production-readiness/README.md` et ignorer uniquement leurs sorties générées dans `.gitignore`
- [X] T002 [P] Créer les modèles expurgés de preuve automatisée, preuve manuelle, preuve visuelle, acceptation de risque, inventaire de critère et archive finale avec ID/tag/noms d'assets dans le rapport et digests SHA-256 dans les métadonnées de release dans `specs/006-production-readiness/evidence-templates.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fournir les modèles fermés, la traçabilité et les gardes de cible dont dépendent toutes les user stories.

**⚠️ CRITICAL**: aucune phase de user story ne commence avant la validation de cette fondation.

### Tests fondamentaux

- [X] T003 [P] Écrire les tests des schémas ReleaseCandidate/OriginRedirectCase/RequirementRecord/VerificationEvidence/VisualEvidence/ArchiveReference/ReadinessReport, des quatre statuts et des décisions distinctes `approved_for_promotion` puis `ready` dans `tests/unit/production-readiness/evidence-schema.test.ts`
- [X] T004 [P] Écrire les tests de la garde local/preview/branch/production, des origines HTTPS et du refus des cibles ambiguës dans `tests/unit/production-readiness/target-guard.test.ts`
- [X] T005 [P] Écrire les tests de redaction des clés, JWT, cookies, e-mails, contenus Contact, chemins Storage et variables interdites dans `tests/unit/production-readiness/redaction.test.ts`

### Implémentation fondamentale

- [X] T006 Implémenter les types `ReleaseCandidate`, `EnvironmentConfiguration`, `DeploymentTarget`, `OriginRedirectCase`, `RequirementRecord`, `VerificationEvidence`, `AccessibilityEvidence`, `VisualEvidence`, `RiskAcceptance`, `ArchiveReference`, `ArchiveVerification` et `ReadinessReport` dans `lib/production-readiness/types.ts`
- [X] T007 Implémenter la validation fermée, les invariants de SHA/couverture, `approved_for_promotion | not_approved` puis `ready | not_ready` dans `lib/production-readiness/evidence.ts`
- [X] T008 Implémenter la garde de contexte, d'origine, de projet Supabase et d'autorisation de mutation dans `lib/production-readiness/target-guard.ts`
- [X] T009 [P] Créer le manifeste fermé des FR-001..FR-056, SC-001..SC-016, critères d'acceptation de `doc/spec.md` et gates des fonctionnalités 001..005 avec type, source, ancrage et SHA stables dans `lib/production-readiness/requirements.ts`
- [X] T010 Implémenter le runner de commandes expurgé, le writer atomique des artefacts bruts sous `test-results/production-readiness/<sha>/` et la validation de l'ID/tag/SHA/immutabilité/digests d'archive lus côté fournisseur dans `scripts/lib/production-readiness.mjs`, puis ajouter le glob unitaire dans `package.json`

**Checkpoint**: les modèles, la redaction et la garde de cible sont testés et réutilisables par toutes les phases suivantes.

---

## Phase 3: User Story 1 - Mettre en ligne une version maîtrisée (Priority: P1) 🎯 MVP opérationnel

**Goal**: Produire sur Deploy Preview un candidat identifié par SHA avec trois variables valides, des cibles isolées, un domaine HTTPS prêt, Forms séparé et un rollback documenté ; la promotion réelle reste en Phase 8.

**Independent Test**: Construire une Deploy Preview du SHA candidat, prouver qu'elle utilise Supabase et Forms non-production, puis démontrer que les variantes HTTP/HTTPS de `knailsbeauty.fr`, `www.knailsbeauty.fr`, `knailsbeauty.com`, `www.knailsbeauty.com` et l'hôte technique convergent définitivement vers `https://knailsbeauty.fr` avec certificats valides, chemin et paramètres conservés, avant de vérifier la possibilité de restaurer un deploy antérieur sans modifier les données.

### Tests for User Story 1

- [X] T011 [P] [US1] Écrire la matrice de validation des trois variables runtime, variables Netlify réservées et variables `SUPABASE_GALLERY_CONFIG_*` interdites dans `tests/unit/production-readiness/deployment-configuration.test.ts`
- [X] T012 [P] [US1] Écrire les tests de sélection `contact | contact-preview` et de refus du mauvais formulaire par contexte dans `tests/unit/contact/form-blueprint.test.ts` et `tests/unit/contact/edge-validation.test.ts`
- [X] T013 [P] [US1] Écrire les tests du script fail-closed pour SHA, contexte, origine, projet Supabase et autorisation mutable dans `tests/unit/production-readiness/deploy-target-script.test.ts`
- [X] T014 [P] [US1] Écrire les scénarios HTTP/HTTPS de certificat et redirection permanente pour `knailsbeauty.fr`, `www.knailsbeauty.fr`, `knailsbeauty.com`, `www.knailsbeauty.com` et l'hôte technique, avec destination exacte `https://knailsbeauty.fr`, chemin et paramètres conservés, pages publiques, refus `/admin` sans session, cache privé et absence de boucle dans `tests/production-readiness/deployment.spec.ts`

### Implementation for User Story 1

- [X] T015 [US1] Obtenir et consigner la confirmation explicite de l'origine dans `test-results/production-readiness/<sha>/manual/canonical-origin.md`, puis seulement implémenter cette origine publique sans placeholder, les valeurs Netlify `CONTEXT/URL/DEPLOY_PRIME_URL/COMMIT_REF` et l'indexabilité fermée dans `lib/site/deployment-context.ts`
- [X] T016 [US1] Étendre la validation des trois variables runtime, du secret flash et des variables interdites sans exposer leurs valeurs dans `lib/production-readiness/environment.ts`, `lib/supabase/env.ts`, `.env.example` et `.env.gallery-config.example`
- [X] T017 [US1] Implémenter la sélection serveur du formulaire autorisé par contexte dans `lib/contact/constants.ts`, `lib/contact/contact-action-core.ts` et `lib/validations/contact.ts`
- [X] T018 [US1] Déclarer les blueprints `contact` et `contact-preview` et refuser leur usage croisé dans `public/__forms.html` et `netlify/edge-functions/validate-contact.ts`
- [X] T019 [US1] Transmettre uniquement le nom de formulaire autorisé jusqu'au POST same-origin sans cookies dans `app/(public)/contact/_actions/contact-actions.ts`, `components/contact-form.tsx` et `lib/contact/netlify-forms-client.ts`
- [X] T020 [US1] Configurer commande de build, contextes non secrets, Edge Function existante et redirection du sous-domaine technique sans casser Forms dans `netlify.toml`
- [X] T021 [US1] Implémenter le contrôle CLI expurgé de cible et de contexte dans `scripts/check-deploy-target.mjs` et exposer `production:target-check` dans `package.json`
- [X] T022 [US1] Configurer dans Netlify le dépôt GitHub, la branche de production, les valeurs distinctes des trois variables et le formulaire/notification preview, vérifier l'absence des variables ponctuelles et la révocation de leur clé, puis consigner uniquement IDs/SHA/statuts/Reply-To dans `test-results/production-readiness/<sha>/manual/netlify-preview.md` et synchroniser besoins/procédures dans `doc/spec.md` et `doc/infra.md` dans le même changement
- [X] T023 [US1] Déclarer dans `netlify.toml` puis configurer côté Netlify/DNS `knailsbeauty.fr` comme domaine principal, rattacher `www.knailsbeauty.fr`, `knailsbeauty.com` et `www.knailsbeauty.com`, activer leurs certificats et les redirections permanentes HTTP/HTTPS ainsi que celle du sous-domaine technique vers `https://knailsbeauty.fr` avec chemin et paramètres conservés, puis consigner la preuve externe dans `test-results/production-readiness/<sha>/manual/domain-https.md`
- [X] T024 [US1] Documenter et exercer sans destruction le rollback Netlify versus restauration Supabase dans `doc/infra.md` et `test-results/production-readiness/<sha>/manual/rollback-drill.md`

**Checkpoint**: US1 est déployable et testable indépendamment. Cette étape seule ne suffit pas encore à déclarer le MVP prêt pour la production.

---

## Phase 4: User Story 2 - Refuser une production insuffisamment sécurisée (Priority: P1)

**Goal**: Prouver avec les rôles réels que GRANT, RLS, Auth, Storage, entrées, réponses et artefacts restent protégés en preview et en production non destructive.

**Independent Test**: Exécuter la matrice anon/non-admin/admin sur données et fichiers, révoquer rôle/session sur une cible isolée, vérifier signup refusé, scanner les artefacts et contrôler les en-têtes/advisors sans clé privilégiée.

### Tests for User Story 2

- [X] T025 [P] [US2] Ajouter les cas distincts GRANT/Data API, RLS active/masquée et autorité admin courante dans `supabase/tests/database/11_production_security.sql`
- [X] T026 [P] [US2] Ajouter les cas signup email/OTP/SMS/anonymous, falsification `user_metadata`, déclassement et révocation de session dans `scripts/check-auth-signup.mjs` et `tests/unit/auth/admin-session.test.ts`
- [X] T027 [P] [US2] Ajouter les cas Storage GET versus list et `INSERT/SELECT/UPDATE/DELETE` séparés dans `supabase/tests/database/04_storage_policies.sql` et `scripts/check-supabase-storage.mjs`
- [X] T028 [P] [US2] Écrire les tests CSP, anti-frame, nosniff, Referrer-Policy, Permissions-Policy et cache admin/image dans `tests/production-readiness/security-headers.spec.ts`
- [X] T029 [P] [US2] Étendre les tests de fuite au dépôt, build, réponses et rapport généré dans `tests/unit/production-readiness/redaction.test.ts` et `tests/unit/production-readiness/secret-scan.test.ts`

### Implementation for User Story 2

- [X] T030 [US2] Si T025–T027 révèlent un delta, exécuter `supabase migration new production_security_hardening`, limiter le fichier retourné sous `supabase/migrations/` aux GRANT/RLS/fonctions/policies nécessaires sans nouvelle table ni bucket, puis régénérer `lib/supabase/database.types.ts`; sinon enregistrer explicitement « aucun delta, aucune migration » dans `test-results/production-readiness/<sha>/commands/security-migration.json`
- [X] T031 [US2] Ajouter une CSP statique compatible Next.js/Supabase/Netlify Forms et les en-têtes de sécurité dans `next.config.ts`
- [X] T032 [US2] Implémenter l'audit hébergé read-only des catalogues, policies, Auth, bucket, advisors, SSL et restrictions réseau dans `scripts/check-hosted-supabase-security.mjs`
- [X] T033 [US2] Étendre le scan pour couvrir historique candidat, artefacts, rapports et nouveaux motifs interdits sans imprimer les correspondances dans `scripts/scan-build-secrets.mjs`
- [X] T034 [US2] Implémenter l'orchestrateur sécurité local/preview/production non destructive dans `scripts/check-production-security.mjs`
- [X] T035 [US2] Ajouter `supabase:test:production-security`, `security:hosted-check` et `security:check` dans `package.json`
- [X] T036 [US2] Exécuter la matrice locale complète et enregistrer les résultats structurés expurgés dans `test-results/production-readiness/<sha>/commands/security-local.jsonl`
- [X] T037 [US2] Après validation de T021 et autorisation explicite, exécuter la matrice mutable avec fixtures UUID sur la preview isolée et consigner le nettoyage dans `test-results/production-readiness/<sha>/manual/security-preview.md`
- [X] T038 [US2] Vérifier puis, seulement après autorisation, fermer les modes d'inscription hébergés et prouver le refus canari sans compte résiduel dans `test-results/production-readiness/<sha>/manual/hosted-auth.md`
- [X] T039 [US2] Examiner advisors, SSL Enforcement et Network Restrictions de production en lecture seule et consigner chaque warning ou acceptation bornée dans `test-results/production-readiness/<sha>/manual/supabase-platform.md`
- [X] T040 [US2] Synchroniser dans le même changement les exigences, responsabilités de sécurité, gates local/preview/production et procédures de maintenance dans `doc/spec.md`, `doc/architecture.md` et `doc/infra.md`

**Checkpoint**: US2 prouve séparément qu'aucun rôle non autorisé ne peut lire ou muter les contenus protégés et qu'aucun secret n'est publié.

---

## Phase 5: User Story 3 - Rendre l’institut trouvable sans indexer l’administration (Priority: P2)

**Goal**: Publier des métadonnées françaises cohérentes, trois canonicals, Open Graph, JSON-LD confirmé, sitemap exact et robots/noindex adaptés au contexte.

**Independent Test**: Inspecter le HTML initial, `robots.txt`, `sitemap.xml`, JSON-LD et Open Graph sur un build local/CI en contexte production simulé et sur une Deploy Preview en contexte preview réel ; confirmer zéro URL admin/technique et zéro donnée de démonstration. La répétition sur le domaine final est une vérification intégrée de Phase 8, pas une dépendance de cette validation candidate.

### Tests for User Story 3

- [X] T041 [P] [US3] Écrire les tests purs d'origine, metadataBase, canonicals, Open Graph, sitemap et robots par contexte dans `tests/unit/production-readiness/metadata.test.ts`
- [X] T042 [P] [US3] Écrire les scénarios navigateur profil production/preview/admin, validation JSON-LD locale et résultat externe Schema.org réussi/bloqué dans `tests/production-readiness/seo.spec.ts`

### Implementation for User Story 3

- [X] T043 [US3] Implémenter le constructeur partagé des titres, descriptions, canonicals, Open Graph et robots de page dans `lib/site/metadata.ts`
- [X] T044 [US3] Ajouter `metadataBase`, métadonnées globales et canonicals uniques dans `app/layout.tsx`, `app/(public)/services/page.tsx`, `app/(public)/galerie/page.tsx` et `app/(public)/contact/page.tsx`
- [X] T045 [P] [US3] Publier le sitemap exact production et vide hors production dans `app/sitemap.ts`
- [X] T046 [P] [US3] Publier les directives production/preview et la référence de sitemap dans `app/robots.ts`
- [X] T047 [P] [US3] Ajouter `noindex, nofollow` à la connexion et aux pages protégées dans `app/(admin)/admin/layout.tsx`
- [X] T048 [US3] Centraliser les coordonnées confirmées, retirer le téléphone fictif visible et produire le JSON-LD BeautySalon/LocalBusiness dans `lib/contact-details.ts`, `lib/site/structured-data.ts`, `app/layout.tsx` et `app/(public)/contact/page.tsx`
- [X] T049 [US3] Créer l'asset social final 1 200 × 630 conforme aux tokens et assets validés dans `app/opengraph-image.png`, puis documenter son usage et son alt dans `doc/design.md`
- [X] T050 [US3] Implémenter le contrôle SEO local/preview/production, y compris la validation publique Schema.org fail-closed, dans `scripts/check-seo.mjs`, ajouter `seo:check` dans `package.json` et synchroniser exigences/modules dans `doc/spec.md` et `doc/architecture.md` dans le même changement
- [X] T051 [US3] Valider avant promotion les trois pages, robots, sitemap, JSON-LD, résultat Schema.org et aperçu social sur un build local/CI en contexte production simulé puis sur Deploy Preview en contexte preview réel, avec preuves expurgées dans `test-results/production-readiness/<sha>/manual/seo-preview.md`; réserver les assertions sur le domaine canonique à la finalisation production

**Checkpoint**: US3 est indépendamment validée au niveau candidat si les contextes simulé/réel sont conformes et si preview/admin restent non indexables ; Phase 8 répète ensuite ces assertions sur le domaine canonique sans modifier cette preuve candidate.

---

## Phase 6: User Story 4 - Utiliser tous les parcours sans barrière majeure (Priority: P2)

**Goal**: Rendre les parcours publics et admin utilisables au clavier, au toucher, au zoom/reflow et avec technologie d'assistance, puis confirmer leur fidélité à `doc/design.md`.

**Independent Test**: Exécuter tous les états critiques à 320/768/1 024 px avec les deux scans automatisés sur les trois moteurs, signer Firefox réel, Safari mobile physique et VoiceOver/AT, puis valider visuellement les trois pages publiques sur le même SHA.

### Tests for User Story 4

- [X] T052 [P] [US4] Écrire la matrice publique Services/Galerie/Contact/menu pour contenu, vide, erreur, pending, succès, retry, toucher, reduced motion et double scan Axe dans `tests/production-readiness/accessibility-public.spec.ts`
- [X] T053 [P] [US4] Écrire la matrice admin Auth/Prestations/Catégories/Galerie pour formulaires, listes, dialogues, refus, pagination, réparation et double scan Axe dans `tests/production-readiness/accessibility-admin.spec.ts`
- [X] T054 [P] [US4] Écrire les tests de contraste des tokens 4,5:1/3:1 et des cibles 44 × 44 hors liens inline dans `tests/unit/production-readiness/accessibility-contract.test.ts`

### Implementation for User Story 4

- [X] T055 [US4] Implémenter dans `tests/helpers/accessibility.ts` le scan WCAG 2.1 A/AA à zéro violation tous impacts, le scan général à zéro serious/critical, overflow, cibles, focus, clavier et les deux artefacts JSON, puis synchroniser le contrat de test dans `doc/spec.md` et `doc/architecture.md`
- [X] T056 [US4] Remplacer les seuils Axe hétérogènes par les deux scans communs dans `tests/admin-auth/accessibility.spec.ts`, `tests/services-management/accessibility.spec.ts`, `tests/gallery-management/accessibility.spec.ts` et `tests/contact-form/anti-spam-accessibility.spec.ts`
- [X] T057 [US4] Ajouter Firefox et les profils 320 × 760, 768 × 900, 1 024 × 900 sans casser les suites existantes dans `playwright.config.ts`, sélectionner explicitement `tests/production-readiness/accessibility-public.spec.ts` et `tests/production-readiness/accessibility-admin.spec.ts`, puis exposer `test:e2e:accessibility` dans `package.json`
- [X] T058 [US4] Corriger les écarts publics révélés par T052/T054 sans modifier la composition visuelle dans `components/header.tsx`, `components/gallery-grid.tsx`, `components/gallery-image.tsx`, `components/service-section.tsx` et `app/globals.css`, puis synchroniser tout comportement effectivement changé dans `doc/design.md` dans le même changement
- [X] T059 [US4] Corriger les écarts Contact et annonces asynchrones révélés par T052 dans `components/contact-form.tsx` et `app/(public)/contact/page.tsx`, puis synchroniser les états effectivement changés dans `doc/design.md` dans le même changement
- [X] T060 [US4] Corriger les écarts de connexion, validation, annonces et focus révélés par T053 dans `app/(admin)/admin/_components/login-form.tsx`, puis synchroniser les interactions effectivement changées dans `doc/design.md` dans le même changement
- [X] T061 [US4] Corriger les écarts prestations/catégories, focus initial/restauré, confirmations et annonces révélés par T053 dans `app/(admin)/admin/(protected)/prestations/_components/delete-service-category-dialog.tsx`, `app/(admin)/admin/(protected)/prestations/_components/delete-service-dialog.tsx`, `app/(admin)/admin/(protected)/prestations/_components/service-category-form.tsx`, `app/(admin)/admin/(protected)/prestations/_components/service-category-list.tsx`, `app/(admin)/admin/(protected)/prestations/_components/service-form.tsx`, `app/(admin)/admin/(protected)/prestations/_components/service-list.tsx`, `app/(admin)/admin/(protected)/prestations/_components/service-success-message.tsx` et `app/(admin)/admin/(protected)/prestations/_components/service-visibility-form.tsx`, puis synchroniser les interactions effectivement changées dans `doc/design.md` dans le même changement
- [X] T062 [US4] Corriger les écarts galerie admin, dialogues, remplacement, réparation et annonces asynchrones révélés par T053 dans `app/(admin)/admin/(protected)/galerie/_components/delete-gallery-photo-dialog.tsx`, `app/(admin)/admin/(protected)/galerie/_components/gallery-form.tsx`, `app/(admin)/admin/(protected)/galerie/_components/gallery-list.tsx`, `app/(admin)/admin/(protected)/galerie/_components/gallery-replacement-form.tsx`, `app/(admin)/admin/(protected)/galerie/_components/gallery-success-message.tsx`, `app/(admin)/admin/(protected)/galerie/_components/gallery-visibility-form.tsx`, `app/(admin)/admin/(protected)/galerie/_components/image-preparation.tsx`, `app/(admin)/admin/(protected)/galerie/_components/pending-operation-reconciler.tsx` et `app/(admin)/admin/(protected)/galerie/_components/repair-gallery-photo-form.tsx`, puis synchroniser les interactions effectivement changées dans `doc/design.md` dans le même changement
- [X] T063 [US4] Créer la checklist signable Firefox/Safari mobile/VoiceOver avec reflow 400 %, zoom 200 %, contrastes complexes, alt et ordre de lecture dans `specs/006-production-readiness/accessibility-manual-checklist.md`
- [ ] T064 [US4] Exécuter la matrice automatisée complète à titre de validation de story et conserver pour chaque état les deux JSON Axe et rapports Playwright expurgés dans `test-results/production-readiness/<sha>/playwright/`; ces artefacts doivent être régénérés après le gel final si le SHA change encore
- [ ] T065 [US4] Exécuter à titre de validation de story les contrôles Firefox réel, iPhone/iPad Safari et VoiceOver/AT puis consigner le résultat signé dans `test-results/production-readiness/<sha>/manual/accessibility.md`; toute preuve antérieure au gel final doit être réellement revalidée et re-signée en T082
- [X] T066 [US4] Créer la checklist visuelle Services/Galerie/Contact pour états de référence à 320/768/1 024 px conformément à `specs/006-production-readiness/contracts/visual-verification.md` dans `specs/006-production-readiness/visual-manual-checklist.md`
- [ ] T067 [US4] Exécuter à titre de validation de story la revue contre `doc/design.md` sur le SHA courant et consigner cas signés et captures expurgées dans `test-results/production-readiness/<sha>/manual/visual.md`; toute preuve antérieure au gel final doit être réellement revalidée et re-signée en T082

**Checkpoint**: US4 est conforme uniquement si les deux scans automatisés, la revue accessibilité manuelle et la revue visuelle sont tous `passed`.

---

## Phase 7: User Story 5 - Prononcer une décision de lancement traçable (Priority: P3)

**Goal**: Consolider les FR/SC, chaque critère d'acceptation de `doc/spec.md` et les fonctionnalités 001–005 dans un rapport unique, puis autoriser la promotion sans faux `ready`.

**Independent Test**: Simuler succès, échec, blocage, non-exécution, critère source omis/dupliqué, SHA divergent, preuve manquante et archive invalide ; seul le cas préproduction intégral devient `approved_for_promotion`, tandis que `ready` reste réservé à la finalisation production.

### Tests for User Story 5

- [ ] T068 [P] [US5] Écrire les tests de couverture FR-001..056, SC-001..016, critères d'acceptation `doc/spec.md`, gates 001–005, risques, statuts et décisions fail-closed dans `tests/unit/production-readiness/report.test.ts`
- [ ] T069 [P] [US5] Écrire les tests de l'orchestrateur avec source omise/dupliquée, commandes simulées, SHA changeant, preuve distante ou manuelle antérieure au gel, signature absente, sorties invalides, artefacts sensibles, publication d'archive échouée et digest divergent dans `tests/unit/production-readiness/orchestrator.test.ts`
- [ ] T070 [P] [US5] Écrire les onze scénarios smoke HTTPS/Services/Galerie/Contact/soumission/admin/donnée/image/sitemap/robots/noindex admin dans `tests/production-readiness/smoke.spec.ts`

### Implementation for User Story 5

- [ ] T071 [US5] Implémenter l'agrégation par type/source, le refus des critères omis ou dupliqués, les risques, `promotionDecision`, `launchDecision` et références d'archive dans `lib/production-readiness/report.ts`, puis synchroniser exigences et modèle dans `doc/spec.md` et `doc/architecture.md`
- [ ] T072 [US5] Implémenter dans `scripts/check-production-readiness.mjs` l'orchestrateur à profils fermés qui appelle une seule fois Foundation/Auth/Services/Galerie/Contact/SEO/A11y/Sécurité, exécute en local seulement les contrôles compatibles avec le serveur candidat, exécute sur Deploy Preview les cinq specs préproduction en excluant `smoke.spec.ts`, refuse toute preuve d'un autre SHA, valide date/signature/artefacts des revues humaines sans les simuler et contrôle la synchronisation documentaire, puis synchroniser ce flux dans `doc/architecture.md`
- [ ] T073 [US5] Implémenter le smoke non destructif avec garde stricte de `https://knailsbeauty.fr`, matrice des variantes `.fr`/`.com`/`www`/HTTP/technique avec chemin et paramètres conservés, et onze contrôles explicites dont `robots` et soumission Contact contrôlée dans `scripts/smoke-production.mjs`
- [ ] T074 [US5] Ajouter dans `package.json` `test:e2e:production-readiness` avec les cinq specs préproduction, `production:smoke` avec seulement `tests/production-readiness/smoke.spec.ts`, `production:check` avec le profil local et `production:preview-check` avec le profil Deploy Preview
- [ ] T075 [US5] Implémenter le contrôle des exports, originaux d'images, compatibilité de rollback et restauration jetable dans `scripts/check-recovery-readiness.mjs`, puis synchroniser la procédure dans `doc/infra.md`
- [ ] T076 [US5] Exécuter un export logique chiffré hors dépôt et une restauration locale/jetable, puis consigner seulement les digests/statuts dans `test-results/production-readiness/<sha>/manual/recovery.md`
- [ ] T077 [US5] Documenter avant promotion surveillance des quotas, journaux expurgés, sauvegarde, originaux, restauration, rollback, archive GitHub Release et responsables des deux décisions dans `doc/infra.md`
- [ ] T078 [US5] Mettre à jour le déroulé exécutable, les commandes par étape et les critères d'arrêt pré/post-promotion dans `specs/006-production-readiness/quickstart.md`
- [ ] T079 [US5] Vérifier avant le gel que `doc/spec.md`, `doc/design.md`, `doc/architecture.md`, `doc/infra.md`, `specs/006-production-readiness/spec.md`, `specs/006-production-readiness/plan.md`, `specs/006-production-readiness/research.md`, `specs/006-production-readiness/data-model.md`, `specs/006-production-readiness/contracts/`, `specs/006-production-readiness/quickstart.md` et `specs/006-production-readiness/tasks.md` sont synchronisés, puis faire échouer le manifeste si une mise à jour reste requise dans `test-results/production-readiness/<sha>/commands/documentation.json`
- [ ] T080 [US5] Après toutes les modifications de code et de documentation, exécuter sur arbre propre `npm run lint`, `npm run typecheck`, `npm run build` et `npm run production:check` en profil local, valider le format de `specs/006-production-readiness/tasks.md`, scanner dépôt/build/rapport avec `scripts/scan-build-secrets.mjs`, capturer et figer le SHA candidat et conserver `promotionDecision=not_approved` ainsi que `launchDecision=not_ready` dans `test-results/production-readiness/<sha>/report.json`; tout commit ultérieur impose de recommencer à T080
- [ ] T081 [US5] Construire la Deploy Preview depuis le SHA figé en T080, puis réexécuter ou réellement revalider et re-signer sur ce SHA les contrôles humains d'origine/déploiement/rollback T015 et T022–T024, la configuration Auth et la revue plateforme T038–T039 ainsi que la reprise T076 dans `test-results/production-readiness/<sha>/manual/`; la matrice mutable T037, les contrôles SEO/Schema.org et les autres contrôles automatisés restent réservés à l'exécution unique T083
- [ ] T082 [US5] Exécuter réellement sur la Deploy Preview du SHA figé et signer les contrôles Firefox/Safari/AT T065 ainsi que la revue visuelle T067 dans `test-results/production-readiness/<sha>/manual/accessibility.md` et `test-results/production-readiness/<sha>/manual/visual.md`
- [ ] T083 [US5] Exécuter une seule fois `npm run production:preview-check` sur la Deploy Preview du SHA figé avec les cinq specs hébergées, Schema.org et les doubles scans automatisés, faire agréger sans les simuler les SHA, dates, artefacts et signatures produits par T081–T082, puis consolider `promotionDecision=approved_for_promotion` et `launchDecision=not_ready` dans `test-results/production-readiness/<sha>/report.json`

**Checkpoint**: US5 autorise la promotion seulement après couverture intégrale, documentation synchronisée et 100 % des gates préproduction `passed`; il ne déclare pas encore la production prête.

---

## Phase 8: Production Finalization & Handoff

**Purpose**: Promouvoir le SHA approuvé, vérifier le domaine final et publier une décision immuable sans régénérer de gate local après coup.

- [ ] T084 Promouvoir uniquement le SHA `approved_for_promotion`, exécuter `npm run production:smoke` avec la convergence permanente de toutes les variantes `.fr`/`.com`/`www`/HTTP/technique vers `https://knailsbeauty.fr`, certificats, chemin et paramètres conservés, les onze contrôles HTTPS/Services/Galerie/Contact/soumission/admin/donnée/image/sitemap/robots/noindex admin ainsi que les assertions réelles canonicals/JSON-LD/Open Graph et la validation Schema.org du domaine final, puis consigner le smoke signé tout en conservant `launchDecision=not_ready` dans `test-results/production-readiness/<sha>/report.json`
- [ ] T085 Vérifier l'immutabilité GitHub, créer la release brouillon liée au SHA, inscrire son ID/tag/noms d'assets et la déclaration conditionnelle signée `launchDecision=ready` dans `test-results/production-readiness/<sha>/report.json` et `test-results/production-readiness/<sha>/summary.md`, rescanner puis téléverser ces deux assets sans les publier ni les modifier ensuite
- [ ] T086 Publier la release immuable, relire ID/tag/SHA/état/digests fournisseur, vérifier localement `test-results/production-readiness/<sha>/report.json` et `test-results/production-readiness/<sha>/summary.md`, puis rendre `launchDecision=ready` officiel sans réécrire aucun asset

**Checkpoint**: la livraison est `ready` uniquement après T086 ; aucune commande locale génératrice de rapport ni synchronisation documentaire ne s'exécute ensuite.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup** : aucune dépendance.
- **Phase 2 — Foundational** : dépend de Phase 1 et bloque toutes les user stories.
- **US1 — Déploiement candidat** : dépend de Phase 2 et se valide indépendamment sur Deploy Preview.
- **US2 — Sécurité** : les contrôles locaux dépendent de Phase 2 ; T037–T039 dépendent de la preview isolée US1/T021–T023.
- **US3 — SEO candidat** : dépend de Phase 2 ; T051 dépend de la preview US1 mais pas de la production réelle.
- **US4 — Accessibilité et visuel** : dépend de Phase 2 ; T064–T067 valident la story sur la preview courante et leurs preuves finales sont régénérées ou réellement re-signées sur le SHA figé en T082.
- **US5 — Go promotion** : agrège US1–US4 ; T080 fige le SHA après toutes les modifications, T081–T082 produisent les preuves finales et T083 les agrège ; aucun contrôle local final ne peut être repoussé après le gel.
- **Phase 8 — Finalisation production** : T084 dépend de `approved_for_promotion` en T083 ; T085 dépend du smoke T084 ; T086 dépend de l'upload brouillon T085.

### User Story Dependencies

- **US1 (P1)** : tranche candidat autonome et prérequis des contrôles hébergés.
- **US2 (P1)** : autonome localement ; son gate distant requiert la preview US1.
- **US3 (P2)** : validée indépendamment par build profil production et preview réelle ; le domaine final est une vérification intégrée de Phase 8.
- **US4 (P2)** : tests locaux autonomes ; les preuves appareil/AT/visuelles portent sur la preview candidate.
- **US5 (P3)** : produit l'autorisation de promotion après agrégation des quatre stories ; Phase 8 seule peut rendre `ready` officiel.

### Within Each User Story

- Écrire d'abord les tests et confirmer qu'ils détectent la capacité absente.
- Implémenter les modèles/helpers avant les scripts et interfaces.
- Exécuter les contrôles locaux avant toute cible distante.
- Valider la garde de cible avant chaque test mutable.
- Ne jamais remplacer `blocked` ou `not_run` par `passed`.
- Synchroniser chaque source de vérité dans la tâche qui change la décision ou le comportement concerné.
- Ne lancer aucune production avant T083 et ne réécrire aucun artefact après T086.

### Dependency Graph

```text
Phase 1 Setup
      |
Phase 2 Foundation
      |
      +--> US1 candidate -----+------> hosted US2
      |                       +------> preview US3
      |                       +------> preview/manual US4
      +--> local US2 ---------+
      +--> local US3 ---------+-----> US5 preproduction report
      +--> local US4 ---------+              |
                                     approved_for_promotion
                                               |
                                 Phase 8 smoke -> draft -> immutable ready
```

---

## Parallel Opportunities

### Setup and foundation

```text
T002 evidence templates
T003 evidence schema tests
T004 target guard tests
T005 redaction tests
T009 requirements manifest
```

### User Story 1

```text
T011 deployment configuration tests
T012 Forms isolation tests
T013 target script tests
T014 domain/HTTPS tests
```

### User Story 2

```text
T025 GRANT/RLS tests
T026 Auth/session tests
T027 Storage operation tests
T028 security header tests
T029 leak/redaction tests
```

### User Story 3

```text
T041 metadata unit tests
T042 SEO/Schema.org browser tests
T045 sitemap route
T046 robots route
T047 admin noindex layout
```

### User Story 4

```text
T052 public accessibility matrix
T053 admin accessibility matrix
T054 contrast/touch contract
```

### User Story 5

```text
T068 report coverage tests
T069 orchestrator failure tests
T070 smoke contract tests
```

---

## Implementation Strategy

### MVP First

La première tranche recommandée est **Phase 1 + Phase 2 + US1**. Elle fournit un candidat Netlify maîtrisé et une preview isolée, sans effectuer de promotion production.

1. Terminer Setup.
2. Terminer Foundation.
3. Implémenter US1.
4. Tester US1 indépendamment sur Deploy Preview.
5. Arrêter si domaine, contexte, Supabase ou Forms ne sont pas isolés.

### Incremental Delivery

1. **US1** : candidat Git/Netlify, variables, domaine, Forms et rollback.
2. **US2** : sécurité locale puis hébergée.
3. **US3** : SEO profil production simulé et preview.
4. **US4** : accessibilité automatisée/manuelle et revue visuelle.
5. **US5** : couverture complète, documentation vérifiée et autorisation de promotion.
6. **Phase 8** : smoke production, archive brouillon, publication immuable et `ready`.

### Parallel Team Strategy

Après Foundation :

- un flux peut implémenter US1 et préparer la preview ;
- un flux peut traiter les tests locaux US2 ;
- un flux peut traiter US3 ou US4 ;
- les validations distantes attendent la preview US1 ;
- les tests de rapport US5 peuvent commencer en parallèle, mais T080–T083 attendent tous les résultats.

---

## Notes

- Les tâches [P] modifient des fichiers distincts ou des sections indépendantes.
- Les chemins sous `test-results/` sont des artefacts bruts générés et non versionnés ; seules les copies finales expurgées `report.json` et `summary.md` sont conservées comme assets immuables d'une GitHub Release liée au SHA candidat.
- Toute mutation Netlify/Supabase distante exige une cible exacte, une autorisation explicite et une preuve expurgée.
- Le domaine, Schema.org, l'adresse de notification et les appareils physiques sont des gates externes ; leur indisponibilité produit `blocked`.
- Aucun test de refus destructif n'est lancé en production.
- Une correction frontend met à jour `doc/design.md` dans le même groupe logique si elle change un comportement documenté.
- Tous les commits et synchronisations documentaires sont terminés avant T080 ; le SHA est alors figé, toutes les preuves finales distantes et humaines sont produites sur cette révision en T081–T082, agrégées en T083, et aucun artefact officiel n'est modifié après T086.

---

## Phase 9: Convergence

- [X] T087 CRITICAL Synchroniser dans `doc/architecture.md`, dans le même changement que T022, la sélection serveur `contact | contact-preview`, les deux blueprints Netlify, leur séparation de notification et le refus Edge fondé sur le contexte Netlify de confiance per Constitution II / plan: décision 8 (contradicts)

## Phase 10: Convergence

- [X] T088 CRITICAL Synchroniser dans `doc/spec.md` et `doc/infra.md`, dans le même changement que T023, l'origine canonique unique `https://knailsbeauty.fr` sans `www`, le rôle exclusivement redirecteur de `knailsbeauty.com` et `www.knailsbeauty.com`, la matrice HTTP/HTTPS incluant l'hôte technique, les certificats, l'absence de boucle et la conservation du chemin et des paramètres per Constitution II / FR-009 / plan: décision 1 (contradicts)
