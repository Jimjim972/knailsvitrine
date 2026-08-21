# Contract: Vérification visuelle

## Référence

`doc/design.md` est l'unique source de vérité. Une capture antérieure, une preview ou une préférence du testeur ne peut pas modifier cette référence. Toute évolution volontaire du design exige son approbation et la mise à jour du document dans le même changement que le frontend.

## Matrice obligatoire

La revue couvre `/services`, `/galerie` et `/contact` à 320, 768 et 1 024 CSS px. Pour chaque page, elle ouvre au minimum le contenu nominal, le chargement lorsqu'il est visible, l'état vide, l'erreur récupérable et les interactions publiques applicables.

## Règle de décision

Chaque cas vérifie séparément :

- composition et hiérarchie ;
- couleurs, typographies, espacements et autres tokens ;
- présence du contenu essentiel ;
- états focus, hover lorsque disponible, toucher, pending, erreur et succès applicables ;
- absence de débordement ou de masquage non prévu.

Une seule différence non approuvée produit `failed`. Une référence absente ou contradictoire produit `blocked`, jamais une approbation implicite.

## Preuve

La preuve contient route, état, largeur, SHA, navigateur/OS, date UTC, testeur, attendu, observé, statut et capture expurgée. Elle ne contient aucune identité d'administration, message Contact, cookie, clé ou URL signée.
