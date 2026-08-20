# Implementation Plan: Formulaire de contact fonctionnel

**Branch**: `005-contact-form` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-contact-form/spec.md`

## Summary

Remplacer le faux succès de la page Contact par une mutation réelle, sans modifier la composition visuelle. Le composant client valide localement puis invoque une Server Action avec React `useActionState`. L'action revalide avec le schéma Zod partagé et retourne un instantané normalisé fermé ; le navigateur encode ensuite cet instantané et le POSTe vers le blueprint statique `public/__forms.html`, conformément au contrat AJAX documenté par Netlify/OpenNext. Une Netlify Edge Function revalide chaque POST `form-name=contact` avant Netlify Forms. Le fetch fournisseur est borné à 10 secondes côté navigateur et seul son HTTP 2xx produit le succès. Le honeypot et Akismet assurent l'anti-spam invisible ; Netlify notifie automatiquement l'adresse opérationnelle pour les soumissions vérifiées. Aucun message n'est stocké dans Supabase et aucune autoréponse n'est envoyée au visiteur.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Next.js 16.3.0, React 19.2.8, Node.js 22.x, HTML statique

**Primary Dependencies**: Next.js Server Actions, React `useActionState`, Zod 4.4.3, API navigateur Fetch/URLSearchParams/AbortController, runtime Netlify Edge/OpenNext

**Storage**: Netlify Forms uniquement pour les soumissions ; aucune nouvelle table, aucun objet Storage et aucun contenu de message dans Supabase

**Testing**: `node:test` pour validation/action/origine/garde, Playwright 1.62.1 sur Chromium et WebKit, Axe, Netlify Dev, étude d'utilisabilité SC-006 et contrôle manuel sur Deploy Preview

**Target Platform**: Netlify Free avec OpenNext, navigateurs modernes dont Safari mobile, runtime Functions et Edge Netlify

**Project Type**: Application web unique Next.js App Router

**Performance Goals**: état d'attente visible en moins d'une seconde, une seule autorisation Server Action et un seul POST fournisseur actifs, aucune donnée distante supplémentaire au rendu initial, appel fournisseur borné à 10 000 ms

**Constraints**: Server Action obligatoire avant la transmission du parcours applicatif ; POST AJAX même origine vers le blueprint statique ; encodage URL fournisseur ; validation Zod navigateur/action/Edge ; `redirect: "manual"` ; 2 000 caractères maximum ; aucune donnée sensible journalisée ; WCAG 2.1 AA ; cibles de 44 px ; responsive 320/768/1 024 px ; aucun captcha visible initial

**Scale/Scope**: une page publique, quatre champs visibles, un honeypot, un identifiant opaque de corrélation, une Server Action d'autorisation, un transport navigateur, une garde Edge et une boîte de réception Netlify

## Constitution Check

*GATE: Passed after the C1 architecture revision and re-checked after Phase 1 design.*

- **MVP et périmètre — PASS** : le changement rend fonctionnel un parcours déjà prévu, sans réservation, CRM, stockage Supabase ni nouvelle administration.
- **Documentation — PASS** : `doc/spec.md`, `doc/design.md`, `doc/architecture.md` et `doc/infra.md` sont lus dans l'ordre constitutionnel et restent synchronisés ; le design reste inchangé.
- **Design et accessibilité — PASS** : la structure 7/5, les tokens, le responsive et les libellés existants sont conservés ; les erreurs, focus et annonces sont explicités.
- **Mutations via Server Actions — PASS (C1 maintenu)** : le parcours applicatif invoque d'abord une Server Action publique qui revalide et autorise l'instantané. Le POST fournisseur suivant est le véritable contrat HTTP externe documenté de Netlify Forms ; la garde Edge revalide ce POST et tout contournement direct avant la mutation fournisseur.
- **Application Next.js unique — PASS** : aucun serveur séparé. La fonction Edge est une garde d'hébergement étroite imposée par l'endpoint statique Netlify Forms.
- **Validation serveur — PASS** : le même schéma Zod est utilisé dans la Server Action et par la garde Edge avant tout traitement d'un POST `contact`, y compris une soumission directe hors interface.
- **Données et secrets — PASS** : aucune mutation Supabase, aucun secret, aucune origine distante configurable et aucune journalisation des champs. Le transport navigateur cible uniquement le chemin relatif constant `/__forms.html`.
- **Vérification — PASS avec gate de déploiement** : les tests locaux couvrent validation, Action, transport, Edge et UI ; une Deploy Preview doit prouver le chemin Server Action d'autorisation → POST AJAX → Edge → Forms, la notification et le filtrage avant livraison.

Le contrôle distant du 19 août 2026 a invalidé l'ancien transport : le POST serveur-à-serveur depuis la Server Action expire après 10 secondes sans créer de soumission, alors qu'un POST AJAX externe identique traverse la garde, reçoit HTTP 200 et crée une soumission datée. L'utilisateur a explicitement approuvé la révision vers le contrat AJAX officiel. Si la capture du formulaire ou la garde Edge échoue, le fallback reste un fournisseur e-mail transactionnel via Server Action ou un stockage Supabase sécurisé.

## Project Structure

### Documentation (this feature)

```text
specs/005-contact-form/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── usability-test.md           # protocole et preuve agrégée SC-006
├── contracts/
│   ├── contact-submission.md
│   ├── contact-ui.md
│   └── verification.md
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── (public)/contact/
│   └── _actions/
│       └── contact-actions.ts
└── globals.css
components/
└── contact-form.tsx
lib/
├── contact/
│   ├── constants.ts
│   ├── contact-action-core.ts
│   └── netlify-forms-client.ts
└── validations/
    └── contact.ts
netlify/
└── edge-functions/
    └── validate-contact.ts
public/
└── __forms.html
tests/
├── contact-form/
│   ├── submission.spec.ts
│   ├── validation.spec.ts
│   ├── recovery.spec.ts
│   ├── anti-spam-accessibility.spec.ts
│   └── public-regression.spec.ts
└── unit/contact/
    ├── validation.test.ts
    ├── edge-validation.test.ts
    ├── form-blueprint.test.ts
    ├── submission-action.test.ts
    ├── submission-client.test.ts
    └── anti-spam-contract.test.ts
scripts/
└── check-contact-form.mjs
netlify.toml
package.json
playwright.config.ts
```

**Structure Decision**: conserver l'application Next.js existante et limiter la frontière client au formulaire interactif. L'autorisation vit dans `_actions`, la validation pure sous `lib/validations`, le transport AJAX sans secret sous `lib/contact`, le blueprint Netlify sous `public`, et la garde fournisseur dans le répertoire conventionnel `netlify/edge-functions`. Les tests distinguent les contrats Action/transport/Edge des scénarios navigateur.

## Design Decisions

1. `public/__forms.html` déclare le formulaire `contact`, les quatre champs, `bot-field` et `submission-id`. Il reste un fichier statique exact, sans rewrite ni Function, pour la détection au build.
2. Le composant conserve les valeurs brutes contrôlées. Son `<form action>` remet les données à `useActionState`, sans champ `form-name`. Un verrou `ref` synchrone garantit qu'une seule tentative logique est active.
3. La Server Action revalide les quatre champs, le honeypot et l'UUID. Elle retourne soit des erreurs françaises fermées, soit un instantané fournisseur normalisé et autorisé ; elle ne contacte pas Netlify et ne journalise aucune valeur.
4. Après l'autorisation, le composant encode l'instantané avec `URLSearchParams`, ajoute `form-name=contact` et POSTe vers le chemin relatif constant `/__forms.html`. Le transport utilise `cache: "no-store"`, `redirect: "manual"` et interrompt le `fetch` exactement 10 000 ms après son démarrage. Seul `response.ok` produit le succès ; un 3xx, non-2xx, réseau ou timeout devient une erreur contrôlée et préserve les valeurs.
5. La garde Edge est configurée pour `/*` et POST. Elle évite la lecture des médias non pris en charge, analyse une copie URL-encodée ou multipart, laisse inchangées les requêtes sans `form-name=contact`, transmet sans explication un honeypot rempli, refuse en 422 les données visibles invalides, puis poursuit avec une nouvelle `Request` normalisée. `context.next()` ne reboucle pas sur la garde.
6. Tout HTTP 2xx reçu du POST fournisseur déclenche « Merci, votre message a bien été envoyé. ». Ce succès ne prétend pas connaître le classement ultérieur Verified/Spam.
8. Aucun réessai automatique n'est effectué. Le même `submission-id` est réutilisé après une issue ambiguë afin de corréler un doublon éventuel que Netlify ne sait pas empêcher contractuellement.

## Deployment Gate

La fonctionnalité ne peut pas être déclarée terminée avant qu'une Deploy Preview accessible démontre : appel `/contact` → Server Action d'autorisation → POST AJAX `/__forms.html` → Edge → Forms ; rejet 422 d'un POST `contact` invalide direct vers `/__forms.html` et un autre chemin ; transmission d'un POST valide ; réception datée dans Netlify ; absence d'une soumission honeypot dans Verified/Spam ; exactement cinq demandes humaines réalistes sur cinq classées Verified ; classement séparé d'un échantillon Akismet ; notification de l'institut uniquement pour la soumission vérifiée ; `Reply-To` égal à l'e-mail du visiteur. Les dix envois réalistes prévus par SC-001 doivent consigner date/heure et `submission-id`. Les six parcours neutre, validation invalide, envoi, succès, erreur et réessai doivent chacun être vérifiés au clavier à 320, 768 et 1 024 px, soit une matrice explicite de 18 cas.

SC-006 possède un gate distinct : dix adultes francophones représentatifs des visiteurs de l'institut et étrangers à la conception suivent le scénario fixé dans `usability-test.md`, sans assistance. Le chronomètre va du premier focus dans le formulaire au succès visible ; le participant doit d'abord corriger une adresse e-mail sans domaine puis envoyer une demande valide. Au moins neuf terminent en 120 secondes maximum. Seuls les résultats agrégés, les durées et les causes d'échec expurgées sont versionnés. Si dix participants ne sont pas disponibles, le critère reste explicitement non validé ; il n'est pas remplacé par un test automatisé.

Si le POST AJAX vers le blueprint, l'ordre Edge → Forms, la transmission du corps réécrit ou la notification échoue, l'implémentation s'arrête et le fallback est soumis à décision. Aucun faux succès n'est livré.

## Complexity Tracking

Aucune violation constitutionnelle restante. La Server Action reste le passage obligatoire du parcours applicatif avant le véritable contrat HTTP fournisseur, et la garde Edge impose la validation serveur à tout POST Netlify Forms, y compris un contournement direct.
