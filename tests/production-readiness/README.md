# Suites Production Readiness

Ce dossier contient les scénarios Playwright de préparation à la production de la
fonctionnalité 006. Ces scénarios complètent les suites métier existantes sans les
remplacer.

## Conventions

- Chaque exécution porte sur un seul SHA Git complet et un contexte fermé parmi
  `local`, `deploy_preview`, `branch_deploy` et `production`.
- `PLAYWRIGHT_BASE_URL` doit désigner l'origine exacte contrôlée. Une cible distante
  utilise HTTPS ; une cible locale utilise un hôte loopback exact.
- Les tests mutables sont interdits en production et restent bloqués tant que la
  cible Supabase non-production et l'autorisation explicite ne sont pas prouvées.
- Les scénarios de préproduction sont distincts du smoke de production. Le smoke
  reste non destructif, à l'exception de la soumission Contact expressément prévue
  par son contrat fournisseur.
- Un contrôle obligatoire possède exactement un statut : `passed`, `failed`,
  `blocked` ou `not_run`. Seul `passed` satisfait un gate.
- Les artefacts générés sont écrits sous
  `test-results/production-readiness/<sha>/` et ne sont jamais versionnés.
- Les sorties, traces et captures sont expurgées : aucune clé, valeur
  d'environnement, cookie, JWT, adresse d'administration, contenu Contact, chemin
  Storage ou URL signée ne doit apparaître.

## Répertoires de sortie

```text
test-results/production-readiness/<sha>/
├── commands/    # résultats structurés et sorties expurgées
├── playwright/  # rapports et artefacts d'échec
├── manual/      # checklists réellement signées
├── report.json
└── summary.md
```

Les deux fichiers finaux ne deviennent une archive officielle qu'après leur
publication comme assets d'une GitHub Release immuable liée au même SHA et la
vérification de leurs digests côté fournisseur.

## Règles d'exécution

1. Exécuter les contrôles locaux avant toute cible distante.
2. Vérifier la garde de cible avant chaque suite hébergée ou mutable.
3. Ne jamais réutiliser une preuve d'un SHA antérieur.
4. Ne pas relancer `smoke.spec.ts` dans une recette de Deploy Preview.
5. Conserver `launchDecision=not_ready` jusqu'au smoke production et à l'archive
   immuable vérifiée.

Les contrats détaillés sont dans
`specs/006-production-readiness/contracts/` et la séquence exécutable dans
`specs/006-production-readiness/quickstart.md`.
