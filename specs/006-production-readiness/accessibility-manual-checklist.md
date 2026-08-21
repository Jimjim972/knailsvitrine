# Checklist manuelle d’accessibilité

Cette checklist complète les scans Axe automatisés. Elle ne peut être validée que sur
le SHA candidat exact, avec les appareils, navigateurs et technologies d’assistance
réellement indiqués. WebKit Playwright ne vaut pas preuve de Safari réel.

## Préconditions et règle de décision

- [ ] La Deploy Preview correspond au SHA Git complet indiqué dans la preuve.
- [ ] Les comptes, messages Contact, cookies, clés, chemins Storage et URL signées
  utilisés pour le contrôle sont des fixtures ou sont masqués dans les captures.
- [ ] Les parcours publics et admin couvrent leurs états neutre, vide, erreur,
  attente, succès, réessai et dialogue lorsqu’ils s’appliquent.
- [ ] Chaque cas porte exactement un statut fermé : `passed`, `failed`, `blocked`
  ou `not_run`.
- [ ] Toute non-conformité WCAG 2.1 A/AA, tout `blocked` ou tout `not_run` obligatoire
  interdit la validation de FR-021..FR-029 et SC-005/SC-006.
- [ ] Une dérogation documentée n’est jamais transformée en réussite.

## A — Firefox réel sur ordinateur

Environnement à renseigner : Firefox `<version>`, OS `<version>`, écran `<résolution>`,
clavier `<type>`, date UTC `<date>`.

- [ ] `A11Y-FX-01` — Parcourir `/services`, `/galerie`, `/contact`,
  `/admin/connexion`, les listes/formulaires Prestations et Catégories et la Galerie
  admin avec `Tab`, `Shift+Tab`, `Entrée`, `Espace` et `Échap`. L’ordre est logique,
  toutes les actions sont atteignables, le focus est réellement perceptible et
  aucun piège n’est présent.
- [ ] `A11Y-FX-02` — Ouvrir chaque dialogue de suppression. Le titre est annoncé,
  le focus initial est placé sur « Annuler », reste dans le dialogue, `Échap` ferme
  sans mutation et le focus revient au déclencheur. Après réussite, le focus rejoint
  une cible logique encore présente.
- [ ] `A11Y-FX-03` — À 200 % de zoom, vérifier les parcours complets publics et admin :
  aucune perte de texte, contrôle, message, action ou focus.
- [ ] `A11Y-FX-04` — À 400 % depuis une fenêtre de 1 280 CSS px, soit une largeur
  disponible équivalente à 320 CSS px, vérifier le reflow : aucune perte ni
  défilement horizontal global hors contenu réellement bidimensionnel.
- [ ] `A11Y-FX-05` — Activer la réduction des mouvements au niveau du système et
  vérifier menu, galerie, focus et actions admin : aucun déplacement, zoom ou
  animation non essentiel ne subsiste.

## B — Safari sur iPhone et iPad physiques

Environnement à renseigner : appareil `<modèle>`, iOS/iPadOS `<version>`, Safari
`<version>`, orientation `<portrait|paysage>`, largeur CSS observée `<largeur>`, date
UTC `<date>`.

- [ ] `A11Y-SF-01` — Sur iPhone en portrait et paysage, ouvrir/fermer le menu au
  toucher, atteindre chaque page et confirmer que la fermeture par action ou Échap
  externe ne masque aucune fonction.
- [ ] `A11Y-SF-02` — Sur iPhone et iPad, toute légende, tout lien et toute action
  essentielle de la galerie sont disponibles sans survol.
- [ ] `A11Y-SF-03` — Les formulaires Contact, connexion et CRUD admin restent
  utilisables avec le clavier virtuel ; les erreurs, l’attente, le succès et la
  nouvelle tentative restent visibles sans déplacement imprévisible.
- [ ] `A11Y-SF-04` — Chaque contrôle tactile visible atteint au moins 44 × 44 CSS px,
  hors lien réellement inline, et les contrôles voisins peuvent être activés sans
  erreur de cible.
- [ ] `A11Y-SF-05` — Le reflow, le changement d’orientation, les images et les
  dialogues ne créent ni contenu masqué ni défilement horizontal global.

## C — VoiceOver et technologie d’assistance

Environnement à renseigner : VoiceOver/AT `<nom et version>`, appareil/OS/navigateur
`<versions>`, date UTC `<date>`.

- [ ] `A11Y-AT-01` — Le rotor expose une hiérarchie de titres cohérente, des régions
  principales uniques et des liens dont le nom décrit la destination.
- [ ] `A11Y-AT-02` — Les images informatives ont une alternative utile et concise ;
  les images décoratives sont ignorées ; aucune information essentielle ne dépend
  seulement de l’image, de l’icône, de la couleur ou du survol.
- [ ] `A11Y-AT-03` — Chaque champ est annoncé avec son libellé, son caractère requis,
  son aide et son erreur associée. Le premier champ invalide reçoit logiquement le
  focus sans effacer les valeurs récupérables.
- [ ] `A11Y-AT-04` — Attente, succès, échec, refus d’accès et reprise sont annoncés
  une seule fois, au bon moment, avec un niveau `status` ou `alert` adapté.
- [ ] `A11Y-AT-05` — Les dialogues sont annoncés comme modaux avec leur titre ; le
  contenu hors dialogue n’est pas parcouru et le retour de focus est cohérent.
- [ ] `A11Y-AT-06` — Compléter VoiceOver mobile par Firefox avec une AT réellement
  disponible lorsque possible ; documenter explicitement l’AT et les limites de la
  combinaison testée.

## D — Jugement humain sur contenu et contrastes

- [ ] `A11Y-HU-01` — Vérifier les contrastes sur photos, dégradés, transparences,
  hover, focus, états admin, erreurs et succès : 4,5:1 pour le texte normal et 3:1
  pour grand texte, composants, états et indicateurs de focus applicables.
- [ ] `A11Y-HU-02` — Vérifier la pertinence des alternatives textuelles, le sens et
  l’ordre de lecture, et l’absence d’information transmise uniquement par la couleur,
  l’icône, le mouvement ou la position.
- [ ] `A11Y-HU-03` — Vérifier la visibilité réelle du focus dans chaque contexte de
  fond, l’utilisabilité tactile et la cohérence des annonces asynchrones.

## Enregistrement obligatoire de chaque cas

```yaml
evidenceId: <identifiant-stable>
requirementIds: [FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, SC-005, SC-006]
category: a11y
mandatory: true
status: <passed|failed|blocked|not_run>
gitSha: <sha-git-complet>
environment: <deploy-preview-expurgee>
executedAt: <date-utc-iso-8601>
executor: manual
tester: <identifiant-du-testeur>
approvedBy: <responsable>
route: <route>
state: <etat-et-preconditions>
viewport: { width: <largeur>, height: <hauteur> }
zoom: <100%|200%|reflow-400%>
reducedMotion: <true|false>
browserDeviceOs: <navigateur-appareil-os-versions>
assistiveTechnology: <nom-version-ou-absent>
wcagCriteria: [<criteres-verifies>]
actions: <actions-reelles>
expected: <attendu>
observed: <observe-expurge>
artifactRefs: [<captures-ou-checklist-signee>]
actionRequired: <obligatoire-si-non-passed>
```

## Signature de validation

- Testeur : `<identifiant>`
- Responsable : `<identifiant>`
- SHA complet : `<sha>`
- Date UTC : `<date>`
- Résultat global : `<passed|failed|blocked|not_run>`
- Référence de la preuve finale :
  `test-results/production-readiness/<sha>/manual/accessibility.md`

