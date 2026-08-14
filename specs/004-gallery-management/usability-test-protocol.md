# Protocole de test utilisateur — Galerie

## Objectif et participant

Valider avec une personne cible non technique, n’ayant pas contribué au projet, que les cinq opérations principales sont réalisables dès la première tentative sans explication du testeur. Utiliser une preview reliée uniquement au projet Supabase de test autorisé.

## Données de départ

- neuf photos bootstrap actives ;
- une photo de test masquée ;
- une photo de test en état `repair_required` ;
- un JPEG portrait provenant d’un téléphone, un PNG transparent et un WebP statique de moins de 8 Mio ;
- aucun compte, jeton ou chemin Storage visible dans les consignes.

## Consignes sans indice

1. « Ajoutez cette photo à la galerie avec un texte alternatif pertinent, puis vérifiez qu’elle est visible sur le site. »
2. « Corrigez son texte, classez-la avant une autre photo et masquez-la. »
3. « Réactivez-la et remplacez son image en conservant la même fiche. »
4. « Une opération interrompue est signalée dans la liste. Remettez-la dans un état cohérent. »
5. « Supprimez définitivement la photo ajoutée, puis vérifiez qu’elle n’est plus visible. »

## Mesure

Pour chaque consigne, démarrer le chronomètre à la fin de la lecture et l’arrêter au résultat visible. Noter anonymement : réussite à la première tentative, durée, aide demandée, erreur récupérée, abandon et commentaire spontané. Le testeur ne donne aucun indice avant que le participant déclare être bloqué.

| Tâche | Réussite 1re tentative | Durée | Aide | Incident | Observation |
| --- | --- | --- | --- | --- | --- |
| Ajouter et vérifier |  |  |  |  |  |
| Modifier, classer, masquer |  |  |  |  |  |
| Réactiver et remplacer |  |  |  |  |  |
| Réparer |  |  |  |  |  |
| Supprimer et vérifier |  |  |  |  |  |

## Critères de réussite

- les cinq tâches réussissent à la première tentative sans aide ;
- aucune confirmation n’est interprétée comme un succès avant convergence réelle ;
- le participant distingue clairement Active, Masquée, En attente et À réparer ;
- aucune suppression involontaire et aucune double soumission ;
- tout incident reproductible est consigné dans `validation-report.md` avant livraison.
