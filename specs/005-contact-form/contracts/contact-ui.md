# Contract: Contact Form UI

## Fields

L'ordre DOM et visuel reste : « Prénom & nom », « Téléphone », « E-mail », « Message », bouton pleine largeur. Le téléphone porte une indication visible « facultatif ». Chaque contrôle possède un `id`, un `label` associé et les métadonnées d'autocomplétion adaptées.

Le formulaire utilise `noValidate` pour éviter une divergence de messages entre navigateurs ; le schéma partagé reste l'autorité des textes français. Les champs ne sont jamais tronqués programmatiquement. Le `<form action>` est relié à `useActionState` et ne contient pas `form-name`.

## Validation feedback

- message visible directement sous chaque champ invalide ;
- `aria-invalid="true"` seulement pendant l'erreur ;
- `aria-describedby` compose aide, compteur éventuel et identifiant de l'erreur ;
- focus placé sur le premier champ invalide selon l'ordre DOM ;
- une correction retire l'erreur résolue sans effacer les autres valeurs.

Les erreurs de champ ne sont pas chacune des alertes. Une région live persistante annonce le résumé ou l'état global.

## State contract

| État | Bouton | Champs | Annonce |
| --- | --- | --- | --- |
| neutre | « Envoyer le message » | éditables | aucune |
| en cours | désactivé, libellé d'attente | en lecture seule pendant l'instantané | statut poli « Envoi du message en cours… » |
| réussi | disponible pour une nouvelle saisie | vidés | statut poli « Merci, votre message a bien été envoyé. » |
| erreur | disponible | valeurs brutes préservées | alerte générique actionnable |

Le timeout fournisseur survient exactement 10 000 ms après le début du `fetch` navigateur et emploie une formulation honnête : « Nous n'avons pas pu confirmer la réception de votre message. Vérifiez votre connexion avant de réessayer. » Les quatre valeurs et l'UUID restent disponibles.

## Concurrency

Le gestionnaire prend un verrou `ref` synchrone avant la remise à la Server Action et le conserve jusqu'à la fin du POST fournisseur. Un jeton monotone identifie l'essai courant. Les activations suivantes pendant `pending` sont ignorées ; les réponses tardives d'un token ancien ne modifient pas l'UI. Une tentative produit au maximum une invocation Action et un POST fournisseur concurrents.

## Accessibility and visual fidelity

- HTML sémantique avant ARIA ;
- focus `:focus-visible` fortement perceptible avec le token or existant ;
- messages succès/erreur avec texte et tokens de statut, jamais couleur seule ;
- contrôles de 44 px minimum ;
- structure 7/5 sur grand écran et une colonne aux seuils documentés ;
- aucun débordement à 320, 768 et 1 024 px ;
- comportement compatible réduction des animations ;
- honeypot dans un conteneur `hidden`, non focalisable, `autocomplete="off"`.

Aucun changement de token, de typographie, de libellé principal ou de composition n'est autorisé par ce plan.
