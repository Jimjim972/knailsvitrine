# Contract: Vérification accessibilité

## Référentiel

Les processus Services, Galerie, Contact, Auth et CRUD admin visent WCAG 2.1 niveau A et AA. Le projet impose en plus des cibles visibles de 44 × 44 CSS px et la neutralisation des mouvements non essentiels.

## Gate automatisé

La fixture commune exécute deux analyses et conserve leurs résultats séparément :

1. scan normatif avec les tags `wcag2a,wcag2aa,wcag21a,wcag21aa`, exigeant zéro violation quel que soit l'impact ;
2. scan général sans filtre WCAG, exigeant zéro violation `serious` ou `critical`.

Aucun scan ne remplace l'autre et les deux JSON complets sont attachés à l'état testé.

Aucune violation normative n'est acceptée, quel que soit son impact Axe. Aucun `exclude`, règle désactivée ou dérogation silencieuse. Le JSON complet est attaché à la preuve.

Pour les états représentatifs, la matrice couvre :

- 320 × 760, 768 × 900 et 1 024 × 900 ;
- contenu, vide, chargement/pending, validation, succès, erreur, retry ;
- menus, légendes sans hover, formulaires, listes, pagination, dialogues, refus et réparation ;
- noms/rôles/valeurs, labels, descriptions et annonces ;
- absence d'overflow global à 320 px, hors contenu exigeant réellement une disposition bidimensionnelle identifié et justifié dans la preuve ;
- cibles 44 × 44 hors liens réellement inline ;
- focus visible et ordre clavier réel ;
- `prefers-reduced-motion`;
- alt et dimensions d'images.

Chromium exécute la matrice complète. Firefox et WebKit couvrent au minimum les parcours critiques, focus/dialogues/reflow/réduction des mouvements ; le candidat final élargit la matrice aux trois moteurs.

## Clavier et dialogues

Les scénarios utilisent Tab, Shift+Tab, Enter, Espace et Escape, pas `.focus()` comme preuve. Ils vérifient absence de piège, activation, ordre logique, focus perceptible et restauration.

Un dialogue possède un titre accessible, place initialement le focus sur l'action la moins destructive, contient Tab/Shift+Tab, se ferme avec Escape et restaure le focus au déclencheur. Après suppression, le focus rejoint une cible logique existante.

## États asynchrones

Les changements importants ont un texte non vide et un rôle adapté (`status`/polite ou `alert`/assertive). Les erreurs sont associées au champ, la double soumission est empêchée et le focus reste logique. Une assertion DOM ne remplace pas l'écoute réelle avec technologie d'assistance.

## Gate manuel obligatoire

Sur la même révision :

- Firefox moderne réel : clavier, focus, 200 %, reflow 400 %/320 CSS px, titres et contrastes ;
- iPhone/iPad physique sous Safari : toucher, orientation, menu, galerie sans hover, formulaires et cibles ;
- VoiceOver sur Safari mobile ou technologie d'assistance réellement disponible : rotor, titres, liens, formulaires, images, erreurs, statuts et dialogues ;
- revue humaine des alt, ordre de lecture, couleur/icône/hover, focus réel et contrastes sur photos/gradients.

Playwright WebKit est une pré-alerte, jamais une preuve Safari de marque.

## Preuve

Chaque cas indique exigences/WCAG, SHA, environnement, route/état, date UTC, navigateur/device/OS/version, viewport/zoom/reduced-motion/AT, actions, attendu, observé, statut, testeur, artefacts et action requise. Les captures masquent comptes, messages, cookies et secrets.

Le gate échoue si une preuve obligatoire est `failed`, `blocked` ou `not_run`.
