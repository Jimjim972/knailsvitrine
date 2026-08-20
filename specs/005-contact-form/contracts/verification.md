# Contract: Verification

## Unit gate

- matrice V01–V20 exacte du `spec.md`, espaces, accents, ponctuation téléphone, normalisation sans troncature et diagnostics expurgés ;
- UUID accepté/refusé ;
- Server Action publique : validation répétée, absence de `form-name` dans son entrée, instantané autorisé fermé et aucune valeur dans les diagnostics ;
- transport navigateur : cible relative constante, `cache: no-store`, `redirect: manual`, `credentials: omit`, 2xx seul accepté, 3xx/non-2xx/réseau distingués ;
- `CONTACT_SUBMISSION_TIMEOUT_MS = 10_000` : pending avant l'échéance et `error(timeout)` à l'échéance sans réessai ;
- garde Edge : passthrough non-contact intact, 415/422 expurgés, nouvelle `Request` normalisée et branche honeypot silencieuse ;
- blueprint statique avec les sept noms attendus.

## Browser gate

- première erreur focalisée et associations ARIA valides ;
- correction incrémentale ;
- `pending` visible en moins d'une seconde ;
- 20 activations rapides donnent une seule invocation active de la Server Action, un UUID et un seul POST fournisseur ;
- autorisation de l'action suivie du succès fournisseur vide les champs ;
- erreurs validation, fournisseur, réseau et timeout préservent les quatre valeurs ;
- retry ambigu réutilise l'UUID tant que la saisie ne change pas ;
- réponse tardive ignorée ;
- honeypot absent du parcours clavier et remis vide à l'action ;
- matrice explicite de 18 cas : les parcours neutre, validation invalide, envoi, succès, erreur et réessai sont chacun réalisables au clavier à 320, 768 et 1 024 px, sans débordement, contrôle non nommé ou information portée par la seule couleur ;
- Axe et cibles de 44 px sur Chromium/WebKit aux trois largeurs.

## Netlify Dev gate

Depuis `http://127.0.0.1:8888` :

- l'Action autorise la charge avant le POST AJAX relatif `/__forms.html` ;
- la garde laisse intact le POST Next.js sans `form-name` ;
- elle intercepte un POST direct `contact` invalide vers `/__forms.html` et vers une autre route ;
- elle retourne 415/422 sans valeurs brutes ;
- une charge valide est normalisée et transmise ;
- un honeypot rempli n'expose aucune raison de rejet.

Netlify Dev ne prouve ni la réception, ni le classement ou la notification.

## Deploy Preview gate

1. Confirmer l'accessibilité publique de la preview, l'absence de cookies sur le POST fournisseur et la détection du formulaire `contact` après redéploiement.
2. Soumettre depuis `/contact` et prouver la chaîne Server Action d'autorisation → POST AJAX relatif → Edge → `/__forms.html` → Forms.
3. Envoyer un POST invalide direct sur `/__forms.html`, puis sur `/`, et obtenir 422 sans entrée Netlify.
4. Envoyer dix messages humains réalistes, espacés et distincts ; relier chaque 2xx au `submission-id` et à l'horodatage de réception fourni par Netlify.
5. Vérifier qu'un honeypot rempli est silencieusement absent des listes Verified et Spam, puis que cinq demandes humaines réalistes distinctes sur cinq apparaissent dans Verified.
6. Utiliser le contenu de test Akismet recommandé par Netlify et contrôler son apparition dans Spam plutôt que Verified.
7. Avant toute configuration distante, obtenir la confirmation explicite de l'adresse opérationnelle. Si elle manque, arrêter le gate. Configurer la notification du seul formulaire `contact`, vérifier une notification pour la soumission vérifiée, aucune pour spam/honeypot et un `Reply-To` exactement égal à l'e-mail du visiteur. Ne conserver qu'une preuve expurgée.
8. Simuler un non-2xx et l'expiration exacte de 10 000 ms sans faux succès ; vérifier la corrélation du retry ambigu.
9. Exécuter la matrice des six parcours à 320, 768 et 1 024 px, puis contrôler `/services`, `/galerie`, le contenu hors formulaire de `/contact` et Safari mobile.

## SC-006 usability gate

Le protocole est fixé avant exécution dans `usability-test.md` : dix adultes francophones représentatifs des visiteurs de l'institut et n'ayant pas participé à la conception ou à l'implémentation partent d'un formulaire vierge sur Deploy Preview. Chacun saisit d'abord une adresse e-mail sans domaine, corrige l'erreur indiquée puis envoie une demande valide sans aide verbale ou physique. Le chronomètre démarre au premier focus et s'arrête au succès visible. Au moins 9 participants sur 10 doivent terminer en 120 secondes maximum. Seuls le résultat agrégé, les durées et les causes d'échec expurgées sont conservés.

Si la chaîne hybride, la garde, la notification ou le seuil SC-006 n'est pas prouvé, la fonctionnalité n'est pas déclarée terminée. Un test automatisé ne remplace pas les dix participants.
