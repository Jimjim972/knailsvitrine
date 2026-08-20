# Checklist de vérification visuelle

La référence unique est `doc/design.md`. Une capture antérieure ou une préférence du
testeur ne remplace pas cette référence. Une seule différence non approuvée de
composition, token, contenu essentiel ou état interactif produit `failed` ; une
référence absente ou contradictoire produit `blocked`.

## Préconditions

- [ ] La Deploy Preview et `doc/design.md` correspondent au même SHA Git complet.
- [ ] Le navigateur, l’OS, le ratio de pixels et le zoom 100 % sont consignés.
- [ ] Les captures utilisent des fixtures et ne montrent aucune identité admin,
  demande Contact, clé, cookie, chemin Storage ou URL signée.
- [ ] Chaque largeur est la largeur CSS réelle du viewport : 320, 768 ou 1 024 px.
- [ ] Chaque cas porte exactement `passed`, `failed`, `blocked` ou `not_run`.

## Contrôles communs à chaque cas

- [ ] Composition, grille, hiérarchie et ordre des sections conformes.
- [ ] Couleurs, typographies, tailles, rayons, ombres et espacements conformes aux
  tokens documentés.
- [ ] Contenu essentiel présent, lisible et non tronqué.
- [ ] Aucun débordement, chevauchement ou masquage non prévu.
- [ ] Focus, hover lorsque disponible, toucher, attente, erreur et succès conformes.
- [ ] Images nettes, correctement cadrées, sans décalage de mise en page attribuable
  à des dimensions manquantes.

## Matrice Services

| ID | État de référence | 320 | 768 | 1 024 | Points spécifiques |
|---|---|---|---|---|---|
| VIS-SVC-01 | Chargement visible | [ ] | [ ] | [ ] | Hiérarchie conservée, espace réservé stable |
| VIS-SVC-02 | Contenu nominal | [ ] | [ ] | [ ] | Sections, cartes, prix, ordre et CTA conformes |
| VIS-SVC-03 | Vide | [ ] | [ ] | [ ] | Message et action de reprise cohérents |
| VIS-SVC-04 | Erreur récupérable | [ ] | [ ] | [ ] | Erreur explicite, bouton Réessayer visible |
| VIS-SVC-05 | Focus/hover/toucher | [ ] | [ ] | [ ] | Focus visible, aucune information au seul hover |

## Matrice Galerie

| ID | État de référence | 320 | 768 | 1 024 | Points spécifiques |
|---|---|---|---|---|---|
| VIS-GAL-01 | Chargement visible | [ ] | [ ] | [ ] | Grille stable et réservations d’images cohérentes |
| VIS-GAL-02 | Contenu nominal | [ ] | [ ] | [ ] | Variantes, cadrages, titres et légendes conformes |
| VIS-GAL-03 | Vide | [ ] | [ ] | [ ] | « Galerie en préparation » conforme |
| VIS-GAL-04 | Erreur récupérable | [ ] | [ ] | [ ] | Erreur et reprise sans rupture de composition |
| VIS-GAL-05 | Focus/hover/toucher | [ ] | [ ] | [ ] | Légendes et liens accessibles sans survol |

## Matrice Contact

| ID | État de référence | 320 | 768 | 1 024 | Points spécifiques |
|---|---|---|---|---|---|
| VIS-CON-01 | Neutre | [ ] | [ ] | [ ] | Formulaire, informations pratiques et plan conformes |
| VIS-CON-02 | Validation invalide | [ ] | [ ] | [ ] | Erreurs proches des champs, valeurs conservées |
| VIS-CON-03 | Attente | [ ] | [ ] | [ ] | Bouton désactivé et message visible sans saut |
| VIS-CON-04 | Succès | [ ] | [ ] | [ ] | Confirmation conforme et hiérarchie stable |
| VIS-CON-05 | Erreur/réessai | [ ] | [ ] | [ ] | Message, valeurs et nouvelle tentative conformes |
| VIS-CON-06 | Focus/hover/toucher | [ ] | [ ] | [ ] | Focus visible, cibles utilisables, aucun masquage |

## Menu et responsive transversal

- [ ] À 320 px, le bouton menu, le panneau ouvert, sa fermeture et la restitution du
  focus correspondent à `doc/design.md`.
- [ ] À 768 et 1 024 px, la navigation principale, les alignements de contenu et le
  footer correspondent à la composition documentée.
- [ ] Aucun état ne crée de défilement horizontal global ni ne masque une action.
- [ ] La réduction des mouvements ne modifie pas la composition finale.

## Enregistrement obligatoire de chaque case

```yaml
evidenceId: <identifiant-stable>
gitSha: <sha-git-complet>
route: </services|/galerie|/contact>
state: <etat-reference>
viewportWidth: <320|768|1024>
designReference: doc/design.md
compositionMatch: <true|false>
tokenMatch: <true|false>
essentialContentMatch: <true|false>
interactionStateMatch: <true|false>
screenshotRef: <capture-expurgee>
reviewer: <signature>
executedAt: <date-utc-iso-8601>
status: <passed|failed|blocked|not_run>
actionRequired: <obligatoire-si-non-passed>
```

## Signature de validation

- Relecteur : `<identifiant>`
- Responsable : `<identifiant>`
- SHA complet : `<sha>`
- Date UTC : `<date>`
- Résultat global : `<passed|failed|blocked|not_run>`
- Référence de la preuve finale :
  `test-results/production-readiness/<sha>/manual/visual.md`

