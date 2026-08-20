# Tasks: Formulaire de contact fonctionnel

**Input**: documents de conception dans `specs/005-contact-form/`

**Tests**: obligatoires selon FR-020, SC-001 à SC-010 et `contracts/verification.md`.

## Phase 1: Révision approuvée et socle conservé

**Purpose**: synchroniser les sources de vérité avec le flux Action d'autorisation → POST AJAX relatif → Edge → Forms.

- [X] T001 Réviser `specs/005-contact-form/spec.md`, `plan.md`, `research.md`, `data-model.md`, les contrats, `quickstart.md`, `doc/spec.md`, `doc/architecture.md` et `doc/infra.md` pour retirer le self-fetch et documenter l'approbation du flux hybride
- [X] T002 [P] Conserver et vérifier la matrice Zod V01–V20, l'UUID, la normalisation et les diagnostics expurgés dans `lib/validations/contact.ts` et `tests/unit/contact/validation.test.ts`
- [X] T003 [P] Conserver et vérifier le blueprint à sept champs et le honeypot dans `public/__forms.html` et `tests/unit/contact/form-blueprint.test.ts`
- [X] T004 [P] Conserver et vérifier la revalidation URL-encoded/multipart, les refus 415/422, le honeypot silencieux et le passthrough non-contact dans `netlify/edge-functions/validate-contact.ts`, `netlify.toml`, `tests/unit/contact/edge-validation.test.ts` et `tests/unit/contact/anti-spam-contract.test.ts`

**Checkpoint**: la validation métier, la définition statique et la garde directe restent valides.

---

## Phase 2: User Story 1 - Envoyer une demande réellement reçue (Priority: P1) 🎯 MVP

**Goal**: autoriser la demande côté serveur puis effectuer un seul POST navigateur vers Netlify Forms et n'afficher le succès qu'après HTTP 2xx.

**Independent Test**: un message valide passe par une Action, produit un POST relatif sans credentials, apparaît une seule fois dans Netlify et vide le formulaire après le 2xx.

### Tests for User Story 1

- [X] T005 [P] [US1] Remplacer les contrats de self-fetch par des tests en échec d'une Action qui retourne uniquement un instantané normalisé `authorized` dans `tests/unit/contact/submission-action.test.ts`
- [X] T006 [P] [US1] Écrire les tests en échec du transport navigateur : cible constante `/__forms.html`, sept champs URL-encodés, `credentials: "omit"`, `redirect: "manual"`, `cache: "no-store"` et succès 2xx uniquement dans `tests/unit/contact/submission-client.test.ts`
- [X] T007 [US1] Réécrire les scénarios navigateur en échec pour Action autorisée, pending continu entre Action et POST, vingt activations donnant une Action/un UUID/un POST, succès, reset et seconde demande dans `tests/contact-form/submission.spec.ts`

### Implementation for User Story 1

- [X] T008 [US1] Ajouter l'état fermé `authorized` et l'instantané sérialisable aux types Contact dans `lib/validations/contact.ts` jusqu'à réussite de T005
- [X] T009 [US1] Transformer `lib/contact/contact-action-core.ts` et `app/(public)/contact/_actions/contact-actions.ts` en autorisation pure validée sans appel fournisseur jusqu'à réussite de T005
- [X] T010 [US1] Créer le transport navigateur borné dans `lib/contact/netlify-forms-client.ts` et retirer `lib/contact/netlify-forms.ts` ainsi que `lib/contact/provider-origin.ts` jusqu'à réussite de T006
- [X] T011 [US1] Retirer `CONTACT_PROVIDER_ORIGIN` de `next.config.ts` et `.env.example`, sans introduire de nouvelle variable ou origine configurable
- [X] T012 [US1] Relier `components/contact-form.tsx` à l'Action d'autorisation puis au transport AJAX, avec verrou synchrone couvrant les deux étapes, token de tentative et succès après 2xx uniquement, jusqu'à réussite de T007

**Checkpoint**: US1 fonctionne indépendamment sans self-fetch et sans faux succès.

---

## Phase 3: User Story 2 - Corriger une saisie invalide sans perdre son message (Priority: P2)

**Goal**: conserver les erreurs françaises cohérentes entre navigateur, Action et Edge ainsi que le focus et les valeurs brutes.

**Independent Test**: V01–V20 passe aux trois frontières ; la première erreur reçoit le focus et aucun POST fournisseur ne part après une validation refusée.

### Tests for User Story 2

- [X] T013 [US2] Adapter `tests/contact-form/validation.spec.ts` et `tests/unit/contact/submission-action.test.ts` pour prouver l'absence de POST fournisseur sur erreur, la conservation, le focus et les associations ARIA dans le nouveau flux

### Implementation for User Story 2

- [X] T014 [US2] Ajuster la consommation des erreurs Action et la correction incrémentale dans `components/contact-form.tsx` sans modifier la composition visuelle de `doc/design.md`, jusqu'à réussite de T013

**Checkpoint**: les données invalides restent corrigeables et ne touchent pas Forms.

---

## Phase 4: User Story 3 - Comprendre un échec et réessayer sûrement (Priority: P3)

**Goal**: traiter non-2xx, réseau et timeout navigateur exact de 10 000 ms sans réessai automatique ni perte de saisie.

**Independent Test**: chaque panne conserve les quatre valeurs ; un timeout est produit à 10 000 ms, le retry ambigu réutilise l'UUID et une réponse tardive est ignorée.

### Tests for User Story 3

- [X] T015 [P] [US3] Ajouter les tests en échec de non-2xx, réseau, expiration exacte, AbortController, aucun retry et résultat fermé dans `tests/unit/contact/submission-client.test.ts`
- [X] T016 [US3] Adapter les scénarios interceptant `/__forms.html` pour fournisseur, réseau, timeout, retry, UUID et réponse tardive dans `tests/contact-form/recovery.spec.ts`

### Implementation for User Story 3

- [X] T017 [US3] Déplacer `CONTACT_SUBMISSION_TIMEOUT_MS = 10_000` dans le transport client, implémenter l'annulation sans retry et les résultats fermés dans `lib/contact/constants.ts` et `lib/contact/netlify-forms-client.ts` jusqu'à réussite de T015
- [X] T018 [US3] Implémenter la conservation, le cycle UUID et l'ignorance des réponses obsolètes dans `components/contact-form.tsx` jusqu'à réussite de T016

**Checkpoint**: toutes les pannes sont honnêtes, bornées et récupérables.

---

## Phase 5: User Story 4 - Écarter les soumissions automatisées évidentes (Priority: P4)

**Goal**: préserver le honeypot et Akismet sans obstacle visible ni fuite de la règle anti-spam.

**Independent Test**: `bot-field` est absent du clavier mais inclus dans le POST ; la garde transmet silencieusement un honeypot rempli à Netlify.

### Tests for User Story 4

- [X] T019 [US4] Adapter `tests/contact-form/anti-spam-accessibility.spec.ts` pour intercepter le POST AJAX et vérifier `bot-field`, Axe et l'absence du honeypot dans l'arbre accessible

### Implementation for User Story 4

- [X] T020 [US4] Vérifier et corriger au besoin le passage fermé du honeypot de `components/contact-form.tsx` vers `lib/contact/netlify-forms-client.ts` puis `netlify/edge-functions/validate-contact.ts` jusqu'à réussite de T019

**Checkpoint**: l'anti-spam invisible reste actif dans le flux révisé.

---

## Phase 6: Vérifications transversales et livraison

**Purpose**: retirer les traces de l'architecture abandonnée, valider localement puis prouver le flux réel sans toucher aux DNS OVH.

- [X] T021 [P] Adapter `tests/contact-form/public-regression.spec.ts`, `playwright.config.ts`, `scripts/run-contact-scenario-tests.mjs` et `scripts/check-contact-form.mjs` afin que les scénarios mockent le POST AJAX sans comportement fournisseur injecté dans la Server Action
- [X] T022 [P] Remplacer les assertions de transport serveur/origine dans les contrôles de confidentialité et scripts `package.json`, puis supprimer le test obsolète `tests/unit/contact/provider-origin.test.ts`
- [X] T023 Exécuter `npm run contact:check`, corriger uniquement les régressions de 005 et consigner le résultat dans `specs/005-contact-form/quickstart.md`
- [X] T024 Déployer la révision sur la preview Netlify publique existante, sans changement DNS ni redirection OVH, puis prouver `/contact` → Action autorisée → POST AJAX → Edge → Forms et consigner une preuve expurgée dans `specs/005-contact-form/quickstart.md`
- [ ] T025 [US4] Vérifier à distance la notification du seul formulaire `contact`, le `Reply-To`, le honeypot absent de Verified/Spam, cinq messages humains sur cinq dans Verified et l'échantillon Akismet dans Spam, sans versionner l'adresse ni le contenu
- [ ] T026 Exécuter les dix sessions de `specs/005-contact-form/usability-test.md`, consigner uniquement les résultats agrégés et laisser SC-006 ouvert si 9/10 en 120 secondes n'est pas démontré
- [ ] T027 Exécuter le gate final de `specs/005-contact-form/contracts/verification.md`, incluant les dix réceptions datées, Safari mobile et la matrice clavier 18 cas, puis consigner les limites restantes dans `specs/005-contact-form/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 précède toutes les stories.
- US1 suit T005 → T008/T009, T006 → T010/T011 et T007 → T012.
- US2 dépend de l'Action et du composant US1.
- US3 dépend du transport et du composant US1.
- US4 dépend du transport US1 et de la garde conservée.
- T021/T022 suivent les stories ; T023 suit tous les tests et le code ; T024 suit T023 ; T025–T027 sont les derniers gates distants ou humains.

## Stop Conditions

- ne jamais réintroduire un self-fetch vers une origine absolue ;
- ne jamais afficher un succès avant le 2xx fournisseur ;
- arrêter le gate distant si un POST invalide traverse la garde ;
- conserver SC-006 ouvert sans dix participants ;
- ne modifier aucun DNS et ne créer aucune redirection : les domaines restent gérés chez OVH.
