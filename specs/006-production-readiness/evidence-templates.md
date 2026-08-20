# Modèles de preuves Production Readiness

Ces modèles décrivent uniquement des preuves expurgées. Les valeurs entre chevrons
sont obligatoires lorsqu'elles s'appliquent et ne doivent jamais être remplacées par
un secret, une donnée personnelle ou un contenu de demande Contact.

## Règles communes

- Statut fermé : `passed | failed | blocked | not_run`.
- Date : UTC au format ISO 8601.
- Révision : SHA Git complet identique au candidat.
- Artefacts : chemins relatifs sous le répertoire du SHA ou identifiants fournisseur
  non sensibles.
- Une preuve manuelle comporte un testeur et une approbation datée.
- `actionRequired` est absent uniquement pour `passed`.
- Les captures utilisent des fixtures et masquent comptes, cookies, e-mails,
  messages, chemins Storage et URLs signées.

## Preuve automatisée

```json
{
  "evidenceId": "<identifiant-stable>",
  "requirementIds": ["<exigence>"],
  "category": "<deploy|env|seo|a11y|auth|db|storage|contact|performance|recovery|operations>",
  "mandatory": true,
  "status": "<passed|failed|blocked|not_run>",
  "gitSha": "<sha-complet>",
  "environment": "<contexte-expurge>",
  "executedAt": "<date-utc>",
  "executor": "automated",
  "toolVersions": { "<outil>": "<version>" },
  "expected": "<attendu-expurge>",
  "observed": "<observe-expurge>",
  "artifactRefs": ["<reference-relative>"],
  "actionRequired": "<action-si-non-passed>"
}
```

## Preuve manuelle

```yaml
evidenceId: <identifiant-stable>
requirementIds: [<exigence>]
category: <categorie>
mandatory: true
status: <passed|failed|blocked|not_run>
gitSha: <sha-complet>
environment: <contexte-et-cible-expurges>
executedAt: <date-utc>
executor: manual
tester: <nom-ou-identifiant-approuve>
approvedBy: <responsable>
preconditions: <preconditions>
actions: <actions-reelles>
expected: <attendu>
observed: <observe-expurge>
artifactRefs: [<references>]
actionRequired: <action-si-non-passed>
```

## Preuve accessibilité

Étendre la preuve manuelle ou automatisée avec :

```yaml
route: <route>
state: <etat>
viewport: { width: <largeur>, height: <hauteur> }
zoom: <100%|200%|reflow-400%>
reducedMotion: <true|false>
browserDeviceOs: <navigateur-appareil-os-versions>
assistiveTechnology: <technologie-et-version-ou-absent>
wcagCriteria: [<criteres>]
axeReportRefs:
  wcag21Aa: <json-ou-absent>
  generalSeriousCritical: <json-ou-absent>
```

WebKit automatisé ne doit jamais être décrit comme Safari réel.

## Preuve visuelle

```yaml
evidenceId: <identifiant-stable>
gitSha: <sha-complet>
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
executedAt: <date-utc>
status: <passed|failed|blocked|not_run>
actionRequired: <action-si-non-passed>
```

## Acceptation de risque

```yaml
riskId: <identifiant-stable>
description: <risque-expurge>
severity: <low|moderate|major|critical>
scope: <perimetre-borne>
expiresAt: <date-utc>
mitigation: <mesure-active>
owner: <responsable>
approvedAt: <date-utc>
```

Une acceptation ne transforme jamais un gate obligatoire non réussi en réussite.
Un risque `major` ou `critical` interdit la décision `ready`.

## Entrée d'inventaire de critère

```json
{
  "requirementId": "<identifiant-stable>",
  "kind": "<functional_requirement|success_criterion|acceptance_criterion|feature_gate>",
  "sourceDocument": "<chemin-versionne>",
  "sourceRevision": "<sha-complet>",
  "sourceAnchor": "<ancre-stable>",
  "mandatory": true,
  "evidenceIds": ["<preuve-obligatoire>"]
}
```

## Référence d'archive finale

Le rapport contient seulement la référence stable suivante ; les digests ne sont pas
auto-référencés dans les assets.

```json
{
  "provider": "github_release",
  "releaseId": "<id-fournisseur>",
  "releaseTag": "production-readiness-<sha-court>",
  "candidateSha": "<sha-complet>",
  "reportAssetName": "report.json",
  "summaryAssetName": "summary.md",
  "expectedImmutable": true
}
```

Après publication, la vérification fournisseur séparée conserve :

```json
{
  "releaseId": "<id-fournisseur>",
  "candidateSha": "<sha-complet>",
  "publishedAt": "<date-utc>",
  "assetDigests": {
    "report.json": "sha256:<digest-complet>",
    "summary.md": "sha256:<digest-complet>"
  },
  "immutable": true,
  "verifiedAt": "<date-utc>"
}
```

Une archive n'est valide que si l'ID, le tag, le SHA, les deux noms d'assets, l'état
immuable et les digests relus côté fournisseur correspondent exactement.
