# Contract: Rapport et preuves de préparation

## Sorties

L'orchestrateur écrit sous `test-results/production-readiness/<sha>/` :

- `report.json` : source structurée de décision ;
- `summary.md` : synthèse lisible générée depuis le JSON ;
- `commands/` : sorties expurgées et codes de retour ;
- `playwright/` : rapport, traces et captures selon la politique ;
- `manual/` : références aux checklists signées, sans secret.

Les artefacts bruts ne sont pas versionnés. Après le smoke réussi, les seules copies finales expurgées de `report.json` et `summary.md` sont rescannées puis publiées comme assets immuables d'une GitHub Release rattachée au SHA candidat. La release est créée en brouillon pour obtenir un ID stable ; le rapport conserve cet ID, le tag et les noms d'assets. Après upload, les digests SHA-256 complets sont vérifiés dans les métadonnées de la release publiée, jamais inscrits dans l'asset qu'ils décrivent. Cette publication ne crée aucun commit et ne change pas le SHA évalué.

## Statuts

Chaque preuve possède exactement un statut :

- `passed` : attendu démontré ;
- `failed` : attendu contredit ;
- `blocked` : dépendance externe empêche le contrôle ;
- `not_run` : contrôle non exécuté.

Seul `passed` satisfait un gate. Un contrôle bloqué/non exécuté n'est ni ignoré ni converti en réussite.

## Couverture

Le rapport contient une ligne pour :

- chaque FR-001 à FR-056 ;
- chaque SC-001 à SC-016 ;
- chaque critère d'acceptation final de `doc/spec.md` ;
- chaque gate des fonctionnalités 001 à 005 ;
- chaque contrôle manuel obligatoire ;
- chaque étape de déploiement, rollback et exploitation.

Chaque entrée possède un identifiant stable, un type, un document source, un ancrage source et le SHA de cette source. Une preuve peut couvrir plusieurs exigences, mais chaque exigence doit pointer vers au moins une preuve obligatoire. Un critère source absent du manifeste, un doublon ou un identifiant sans preuve fait échouer la couverture.

## Identité et cohérence

Après la dernière modification de code et de documentation et leur audit final, l'orchestrateur local capture SHA, branche, état de l'arbre, contexte, cible et versions d'outils, puis fige cette révision candidate. Il revalide SHA et contexte après les suites. La Deploy Preview finale et toutes les preuves distantes ou manuelles obligatoires doivent porter sur ce SHA exact. Une preuve antérieure ne peut être renommée ni simplement recopiée : elle est réexécutée ou re-signée après revalidation réelle. Les preuves humaines sont signées avant l'orchestrateur final de preview, qui exécute une seule fois les contrôles automatisés puis agrège l'ensemble. Tout changement force `promotionDecision=not_approved` avant promotion ou `launchDecision=not_ready` après promotion et recommence la chaîne au gate local.

Chaque preuve inclut ID, exigences, caractère obligatoire, date UTC, environnement expurgé, attendu, observé, statut, artefacts et action requise. Les preuves manuelles incluent testeur et approbation.

## Calcul en deux étapes

`promotionDecision=approved_for_promotion` uniquement si :

- arbre du candidat propre ;
- toutes les preuves portent le même SHA ;
- couverture obligatoire de préproduction égale 100 % ;
- tous les gates obligatoires de préproduction sont `passed` ;
- aucun défaut major/critical connu ;
- les preuves externes et manuelles de préproduction sont signées.
- l'orchestrateur a validé leurs SHA, dates, signatures et artefacts sans prétendre exécuter les manipulations humaines.

Sinon, `promotionDecision=not_approved` et aucune promotion n'est autorisée.

`launchDecision=ready` uniquement si :

- `promotionDecision=approved_for_promotion` ;
- la production sert le même SHA ;
- les 11 contrôles contractuels du smoke de production, dont `robots` et `noindex` admin séparés, sont réussis ;
- le rapport final est rescanné et expurgé, ses deux assets sont archivés, puis leurs digests SHA-256 sont vérifiés dans les métadonnées immuables de la release.

Sinon, `launchDecision=not_ready`, sortie processus non nulle et raisons/action de reprise présentes. La production peut être techniquement déployée pendant ce gate, mais le lancement ne peut pas être annoncé.

Une valeur locale `launchDecision=ready` générée avant téléversement reste provisoire. Elle devient la décision officielle uniquement lorsque ce même rapport est récupérable dans la release publiée immuable et que l'ID, le tag, le SHA, les deux noms d'assets et leurs digests ont été revérifiés côté fournisseur.

## Confidentialité

Une liste de clés autorisées et des règles de redaction s'appliquent avant écriture. Aucun artefact ne contient valeurs d'environnement, tokens, cookies, email admin, messages Contact, noms de fichiers utilisateur, URL signée ou corps de logs bruts. Les scans du rapport lui-même font partie du gate.

## Rejouabilité

Le rapport enregistre les commandes logiques et versions, pas des secrets de connexion. Les suites existantes sont invoquées une seule fois par l'orchestrateur. Les contrôles distants indiquent s'ils sont read-only ou mutables et leur garde de cible.

Un rerun crée un nouveau répertoire/rapport ; il ne réécrit pas la décision historique. Une nouvelle archive utilise une nouvelle release ou une version explicitement distincte et ne remplace jamais silencieusement les assets du SHA antérieur.
