# Contract: Contact Submission

## Static form definition

`public/__forms.html` contient un formulaire non destiné à la navigation :

- `name="contact"`, `method="POST"`, attribut Netlify de détection et `netlify-honeypot="bot-field"` ;
- champs nommés `form-name`, `submission-id`, `name`, `phone`, `email`, `message`, `bot-field` ;
- aucun secret, script, texte métier ou stockage secondaire ;
- chemin statique exact `/__forms.html`, sans rewrite ni Function intermédiaire.

## Browser-to-action contract

Le `<form action>` invoque la Server Action React avec `submission-id`, `name`, `phone`, `email`, `message` et `bot-field`. Il n'envoie jamais `form-name` ni une URL d'origine. Le formulaire emploie `useActionState` et un verrou synchrone ; l'état `pending` ne suffit pas seul à empêcher la mise en file de deux actions.

La Server Action est publique et non authentifiée par conception. Elle :

1. traite toutes les entrées comme non fiables ;
2. revalide et normalise avec le schéma Zod partagé ;
3. retourne soit des erreurs fermées, soit un instantané normalisé autorisé ;
4. conserve le honeypot dans l'instantané sans révéler la détection ;
5. ne journalise ni valeurs, ni e-mail, ni message.

## Browser-to-provider request

```http
POST /__forms.html
Content-Type: application/x-www-form-urlencoded;charset=UTF-8

form-name=contact&submission-id=<uuid>&name=<...>&phone=<...>&email=<...>&message=<...>&bot-field=
```

Après `phase: authorized`, le navigateur construit ce corps uniquement depuis l'instantané retourné avec `URLSearchParams`. La cible est le chemin relatif constant `/__forms.html` ; aucune origine de formulaire ou d'en-tête n'est acceptée. Le transport utilise :

```text
cache: no-store
redirect: manual
credentials: omit
deadline: CONTACT_SUBMISSION_TIMEOUT_MS = 10_000
```

Le délai commence immédiatement avant le `fetch` fournisseur. À 10 000 ms sans HTTP 2xx, le client produit `error(timeout)`. Aucun réessai automatique n'est lancé.

## Edge guard

La fonction est attachée à `/*` pour la méthode POST :

1. si l'en-tête interne `Next-Action` est présent, poursuivre la requête originale intacte sans lire ni cloner son corps multipart ; cette route appartient au framework et non à Netlify Forms ;
2. si le média n'est ni URL-encoded ni multipart, poursuivre sans lecture sauf si un contact est détectable, auquel cas répondre 415 ;
3. analyser `request.clone()` ;
4. si `form-name` n'est pas `contact`, poursuivre la requête originale intacte ;
5. si `bot-field` n'est pas vide, transmettre sans révéler la détection ;
6. si les champs visibles ou l'UUID sont invalides, répondre 422 sans transmettre à Forms ;
7. si la charge est valide, reconstruire le corps normalisé, retirer `content-length`, fixer le type URL-encoded et appeler `context.next()` avec une nouvelle `Request`.

Le POST navigateur démarre une chaîne Edge ; `context.next()` poursuit ensuite vers l'asset/Forms sans relancer la garde, donc sans boucle.

## Closed responses

- action valide : `{ phase: "authorized", submissionId, submission }` ;
- action invalide : `{ phase: "error", errorKind: "validation", ... }` ;
- HTTP 2xx fournisseur : succès UI ;
- HTTP 3xx manuel ou non-2xx : `error(provider)` ;
- exception réseau navigateur : `error(network)` ;
- échéance exacte de 10 000 ms : `error(timeout)` ;
- incident non classé : `error(unexpected)`.

Les erreurs conservent les quatre valeurs brutes et l'UUID. Le succès vide les champs. Le corps, les en-têtes, les redirections et les diagnostics bruts du fournisseur ne sont jamais affichés ni journalisés.

## Success semantics and privacy

Un 2xx confirme uniquement la prise en charge HTTP par Netlify. Il ne prouve pas le classement final `verified`, puisque le honeypot peut être rejeté silencieusement et Akismet classer la soumission ensuite. Le contrat ne promet pas l'absence de doublon après une échéance ambiguë.

Aucune clé Netlify ou Supabase, aucune donnée Contact dans les logs, aucune origine client et aucune autorisation CORS supplémentaire ne sont introduites.
