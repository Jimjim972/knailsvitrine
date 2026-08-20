# Quickstart: Validation du formulaire de contact

## Prérequis

- Node.js 22.x et dépendances installées avec le lockfile ;
- Netlify CLI pour la chaîne locale ;
- Deploy Preview publique et accessible ;
- détection Netlify Forms activée puis redéploiement ;
- adresse opérationnelle de l'institut explicitement confirmée avant la configuration distante.

Aucun secret, compte Supabase ou variable d'origine n'est requis. Le transport cible uniquement le chemin relatif `/__forms.html` et omet les credentials. L'adresse destinataire reste exclusivement dans Netlify et ne doit apparaître ni dans Git, ni dans une capture, ni dans un log.

## Contrôles locaux après implémentation

```bash
npm run contact:check
```

L'orchestrateur exécute une seule fois lint, TypeScript, tests unitaires Contact, build, E2E Contact Chromium/WebKit et contrôles statiques de confidentialité. Ne pas relancer chaque sous-commande dans une tâche distincte.

Les tests doivent notamment prouver la valeur unique `CONTACT_SUBMISSION_TIMEOUT_MS = 10_000`, la cible relative fermée, le verrou couvrant l'Action et le POST fournisseur, et la conservation des données après erreur.

### Résultat local du 19 août 2026

`npm run contact:check` a réussi après la révision hybride et la correction Edge avec le runtime Node.js 24 fourni par l'espace de travail : ESLint, TypeScript, 44 tests unitaires Contact, build Next.js, contrôle statique de confidentialité et 102 scénarios Chromium/WebKit. Aucun cas n'a échoué ou été ignoré. La matrice V01–V20, le passthrough multipart intact de `Next-Action`, les 18 parcours clavier, Axe, une Action et un POST pour 20 activations, le corps URL-encodé sans credentials, ainsi que les cycles succès/fournisseur/réseau/timeout navigateur sont couverts.

## Contrôle avec Netlify Dev

```bash
npx netlify dev
```

Utiliser `http://127.0.0.1:8888` afin que le POST AJAX relatif traverse la garde Edge. Vérifier l'autorisation de l'Action, le passthrough intact du POST Next.js sans `form-name`, les refus directs 415/422 sur deux chemins et l'absence de détail pour un honeypot rempli. La capture d'un POST valide n'est concluante qu'en Deploy Preview si Netlify Dev ne simule pas Forms.

Contrôle local du 19 août 2026 : la garde Edge chargée par Netlify Dev a renvoyé 415 pour un contact JSON détectable, 422 pour le même contact URL-encodé invalide sur `/__forms.html` et `/`, et 200 pour le passthrough d'un POST Next/non-contact. Un POST contact valide direct a atteint l'asset mais Netlify Dev a renvoyé 405 : l'émulateur local ne prouve donc pas la capture Forms. La réception valide reste volontairement un gate Deploy Preview.

## Contrôle Deploy Preview

1. Vérifier l'accessibilité publique de la preview et la détection du formulaire `contact`.
2. Envoyer depuis `/contact` et prouver Server Action d'autorisation → POST AJAX relatif → Edge → `/__forms.html` → Forms.
3. Vérifier deux POST directs invalides.
4. Effectuer dix envois humains réalistes et espacés ; corréler chaque 2xx au `submission-id` et à l'horodatage Netlify.
5. Contrôler séparément le honeypot, cinq demandes humaines réalistes classées Verified sur cinq, puis Akismet dans Spam.
6. Si, et seulement si, l'adresse opérationnelle a été confirmée, configurer la notification du formulaire `contact` ; sinon arrêter le gate.
7. Vérifier une notification pour un message vérifié, aucune pour spam/honeypot et le `Reply-To` exact, puis ne consigner qu'une preuve expurgée.
8. Tester le timeout à 10 000 ms, puis exécuter les six parcours neutre, validation invalide, envoi, succès, erreur et réessai au clavier à chacune des largeurs 320/768/1 024 px, ainsi que le lecteur d'écran et Safari mobile.
9. Vérifier `/services`, `/galerie`, `/contact` et le budget de crédits.

Un succès UI prouve uniquement l'autorisation serveur suivie de l'accusé HTTP 2xx reçu par le navigateur. Le classement Verified/Spam est vérifié séparément.

### État du gate distant au 19 août 2026

La détection Netlify Forms a été activée sur le projet vérifié, puis un déploiement non-production isolé `contact-form-check` a été construit avec succès après configuration du contexte `deploy-preview`. Les deux valeurs Supabase publiques ont été reprises pour ce contexte et un `SERVICE_SUCCESS_FLASH_SECRET` distinct, non affiché, a été généré pour la preview. L'API Netlify détecte le formulaire `contact` et ses sept champs.

La visibilité personnalisée du projet a ensuite été réglée sur « Public » pour la production et les previews, après approbation explicite. La preview répond sans session en HTTP 200. Le domaine configuré est `dev.knailsbeauty.fr` ; le nom `dev.knailsIntutiue.fr` fourni initialement ne résout pas. Le sous-domaine configuré pointe vers Netlify mais son HTTPS reste invalide : Netlify refuse de provisionner le certificat tant que `knailsbeauty.fr` pointe vers OVH. Aucun DNS du domaine racine n'a été modifié.

Un POST direct valide et expurgé vers le blueprint public a traversé la garde Edge, reçu HTTP 200 et produit exactement une soumission datée dans le formulaire `contact`. En revanche, le POST serveur-à-serveur de la Server Action vers le même blueprint a atteint le timeout exact de 10 000 ms sans créer de soumission. Ce résultat a motivé la révision explicitement approuvée vers le contrat AJAX documenté : l'Action autorise désormais l'instantané, puis le navigateur effectue le POST relatif.

La première preview hybride a révélé que la lecture Edge du clone multipart tronquait la Server Action avant Next.js (`Unexpected end of form`). La garde a été corrigée pour laisser les requêtes portant `Next-Action` entièrement intactes avant toute lecture, puis le déploiement `6a861a675b6201b2755af5bc` a été publié sur [l'alias public de contrôle](https://contact-form-check--friendly-cactus-227b77.netlify.app). Un envoi explicitement autorisé depuis `/contact` a ensuite affiché le succès, vidé les champs et créé exactement une nouvelle soumission datée le 19 août 2026 à 21:35:55 UTC, corrélée par l'identifiant opaque `5f72f983-979f-4ab6-b3ac-0bbb7eca97fa`. Le handler Action a terminé sans erreur fournisseur dans les journaux expurgés.

Après cet envoi, deux charges directes invalides vers `/__forms.html` et `/` ont chacune reçu 422 sans nouvelle entrée. Une charge synthétique au honeypot a reçu le 200 silencieux attendu et le compteur Netlify est resté à deux soumissions : elle n'a donc rejoint ni la liste des soumissions reçues ni déclenché de faux succès observable dans le dashboard. Aucun DNS, domaine OVH ou mécanisme de redirection n'a été modifié.

L'adresse opérationnelle a été confirmée explicitement et une notification e-mail a été enregistrée dans Netlify pour les nouvelles soumissions du seul formulaire `contact`. L'institut a confirmé avoir reçu la notification correspondant à l'envoi hybride daté du 19 août 2026. Le `Reply-To`, le classement Akismet, cinq humains sur cinq et l'absence de notification pour spam/honeypot restent à vérifier dans la boîte de réception ou le dashboard ; T025 demeure donc ouvert.

## Validation SC-006

Créer `usability-test.md` avant l'exécution. Faire suivre le même scénario à dix adultes francophones du public cible, sans participation antérieure au projet et sans assistance. Le chronomètre part du premier focus et s'arrête au succès visible après correction obligatoire d'un e-mail sans domaine. Le gate exige au moins 9/10 en 120 secondes maximum. Versionner uniquement les durées, le résultat agrégé et les causes d'échec expurgées.

Si dix participants ne sont pas disponibles ou si le seuil échoue, SC-006 reste non validé et la fonctionnalité n'est pas déclarée terminée.

## Critère d'arrêt

Arrêter si le formulaire n'est pas détecté, si l'autorisation Action n'est pas suivie d'un POST AJAX capturé, si un POST direct invalide atteint Forms, si la garde altère la Server Action, si la notification n'est pas vérifiable ou si SC-006 échoue. Documenter le gate manquant et ne pas simuler de succès.
