# Data Model: Préparation complète à la production

La fonctionnalité n'ajoute aucune table Supabase. Les entités ci-dessous sont des objets de configuration, de validation et de preuve sérialisés en JSON/Markdown sous `test-results/production-readiness/`. Les artefacts bruts générés ne sont pas versionnés et ne contiennent jamais de valeur secrète ; seules les copies finales expurgées du rapport et de son résumé sont archivées comme assets d'une GitHub Release liée au SHA candidat.

## ReleaseCandidate

Révision immuable soumise aux gates.

| Champ | Type | Règle |
| --- | --- | --- |
| `candidateId` | `string` | identifiant dérivé du SHA et du contexte, non secret |
| `gitSha` | `string` | SHA complet capturé avant toute exécution |
| `branch` | `string` | branche source observée |
| `treeState` | `clean \| dirty` | `clean` obligatoire pour promotion |
| `context` | `local \| deploy_preview \| branch_deploy \| production` | contexte fermé |
| `deployId` | `string?` | présent pour une cible Netlify |
| `deployPermalink` | `https URL?` | URL immuable du deploy, expurgée si le rapport est partagé |
| `canonicalOrigin` | `https origin?` | exactement `https://knailsbeauty.fr` en production |
| `startedAt` | `UTC timestamp` | début de recette |
| `completedAt` | `UTC timestamp?` | fin de consolidation |

### Invariants

- Toutes les preuves d'un rapport portent le même `gitSha`.
- Une production ne peut référencer ni un arbre `dirty`, ni un domaine technique comme canonique.
- Les domaines `www.knailsbeauty.fr`, `knailsbeauty.com`, `www.knailsbeauty.com` et l'hôte technique restent uniquement des sources de redirection.
- Une preview ne peut être indexable et ne peut partager son projet Supabase avec la production.
- Le rapport n'enregistre ni token Netlify, ni clé Supabase, ni cookie, ni adresse d'administration.

## EnvironmentConfiguration

Inventaire des noms et propriétés, jamais des valeurs.

| Champ | Type | Règle |
| --- | --- | --- |
| `context` | `DeploymentContext` | contexte vérifié |
| `variableName` | enum fermé | trois variables applicatives autorisées |
| `classification` | `public \| server_secret` | URL/clé publiable publiques ; flash secret serveur |
| `present` | `boolean` | aucune valeur incluse |
| `valid` | `boolean` | format, longueur et cohérence de cible |
| `sourceFingerprint` | `string?` | empreinte non réversible/identifiant de projet non secret |
| `scopeObserved` | `string?` | contexte Netlify observé |
| `diagnosticCode` | `string?` | message fermé sans valeur brute |

Variables applicatives autorisées :

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SERVICE_SUCCESS_FLASH_SECRET
```

Les variables système Netlify sont observées séparément. Les variables ponctuelles `SUPABASE_GALLERY_CONFIG_*` doivent être absentes de tous les contextes Netlify et du runtime.

## DeploymentTarget

Description expurgée d'une cible avant test.

| Champ | Type | Règle |
| --- | --- | --- |
| `context` | `DeploymentContext` | valeur fermée |
| `siteOrigin` | `https origin` | URL testée |
| `canonicalMatch` | `boolean` | vrai requis en production |
| `supabaseProjectRef` | `string?` | peut être consigné si considéré non sensible ; sinon empreinte |
| `isProductionData` | `boolean` | vrai interdit pour une suite mutable |
| `mutationAuthorized` | `boolean` | consentement explicite et cible vérifiée |
| `formName` | `contact \| contact-preview` | doit correspondre au contexte |

## OriginRedirectCase

Cas de convergence réseau vérifié sans dépendre des métadonnées de page.

| Champ | Type | Règle |
| --- | --- | --- |
| `sourceOrigin` | `http/https origin` | variante `.fr`, `.com`, `www` ou hôte technique explicitement inventoriée |
| `destinationOrigin` | `https origin` | exactement `https://knailsbeauty.fr` |
| `pathPreserved` | `boolean` | vrai obligatoire |
| `queryPreserved` | `boolean` | vrai obligatoire |
| `permanent` | `boolean` | vrai obligatoire |
| `certificateValid` | `boolean?` | vrai pour chaque source HTTPS avant lancement |
| `loopDetected` | `boolean` | faux obligatoire |

### Garde de cible

```text
si context=production -> suite mutable refusée
si projet preview = projet production -> toute mutation refusée
si contexte/origine/projet non vérifiable -> blocked
si mutationAuthorized=false -> suite mutable refusée
sinon -> suite mutable autorisée avec fixtures UUID dédiées
```

## IndexingProfile

Contrat SEO calculé sans dépendre de l'hôte entrant.

| Champ | Production canonique | Hors production |
| --- | --- | --- |
| `index` | `true` | `false` |
| `follow` | `true` | `false` |
| `canonicalOrigin` | origine officielle | origine officielle, jamais la preview |
| `robotsAllow` | `/` | aucun |
| `robotsDisallow` | `/admin` | `/` |
| `sitemapUrls` | trois URLs publiques | liste vide |
| `xRobotsTagExpected` | pas de `noindex` | `noindex` Netlify attendu en preview |

La production n'est indexable que si `CONTEXT=production`, si `URL` égale l'origine officielle et si le domaine/certificat ont été vérifiés. L'administration reste `noindex, nofollow` dans tous les contextes.

## SeoPageRecord

| Champ | Type | Validation |
| --- | --- | --- |
| `path` | `/services \| /galerie \| /contact` | ensemble fermé |
| `title` | `string` | français, unique, non vide |
| `description` | `string` | française, unique et fidèle au contenu visible |
| `canonicalUrl` | `https URL` | origine officielle + chemin exact |
| `openGraph` | objet | titre, description, URL et asset final validé |
| `structuredData` | objet optionnel | valeurs visibles et confirmées seulement |

## VerificationEvidence

Résultat atomique d'un contrôle.

| Champ | Type | Règle |
| --- | --- | --- |
| `evidenceId` | `string` | stable et unique dans le rapport |
| `requirementIds` | `string[]` | FR/SC et fonctionnalité 001–005 concernées |
| `category` | enum | deploy, env, seo, a11y, auth, db, storage, contact, performance, recovery, operations |
| `mandatory` | `boolean` | vrai pour tout gate de lancement |
| `status` | `passed \| failed \| blocked \| not_run` | exactement une valeur |
| `gitSha` | `string` | identique au candidat |
| `environment` | `string` | contexte et cible expurgés |
| `executedAt` | `UTC timestamp` | date réelle du contrôle |
| `executor` | `automated \| manual` | nature de la preuve |
| `toolVersions` | `record<string,string>` | versions utiles |
| `expected` | `string` | résultat attendu sans donnée sensible |
| `observed` | `string` | synthèse expurgée |
| `artifactRefs` | `string[]` | chemins relatifs ou IDs fournisseurs expurgés |
| `actionRequired` | `string?` | obligatoire sauf pour `passed` |
| `approvedBy` | `string?` | requis pour preuve manuelle ou risque accepté |

Une preuve finale n'est valide que si `gitSha` correspond au SHA capturé après la dernière modification de code ou de documentation. Renommer, recopier ou réapprouver sans nouvelle vérification une preuve issue d'une révision antérieure ne satisfait pas cette règle ; les contrôles concernés doivent être réexécutés ou réellement re-signés après revalidation sur le candidat figé.

### Règles de confidentialité

`observed` et les artefacts ne peuvent contenir : valeur d'environnement, clé, cookie, JWT, mot de passe, email admin, contenu Contact, corps SQL brut sensible, nom de fichier original ou URL Storage signée. Les captures utilisent des fixtures et masquent les données d'identité.

## RequirementRecord

Entrée fermée du manifeste de couverture.

| Champ | Type | Règle |
| --- | --- | --- |
| `requirementId` | `string` | stable et unique dans toutes les sources |
| `kind` | `functional_requirement \| success_criterion \| acceptance_criterion \| feature_gate` | ensemble fermé |
| `sourceDocument` | `string` | chemin relatif versionné, notamment `doc/spec.md` |
| `sourceRevision` | `string` | SHA du candidat |
| `sourceAnchor` | `string` | ID explicite ou numéro stable du scénario |
| `mandatory` | `boolean` | vrai par défaut pour la recette de lancement |
| `evidenceIds` | `string[]` | au moins une preuve obligatoire pour satisfaire l'entrée |

Le manifeste refuse les doublons, les trous de séquence FR/SC, les critères d'acceptation non inventoriés et les références vers une autre révision.

## AccessibilityEvidence

Extension logique de `VerificationEvidence`.

| Champ | Type | Règle |
| --- | --- | --- |
| `route` | `string` | route testée |
| `state` | `string` | contenu, vide, erreur, pending, dialogue, réparation, etc. |
| `viewport` | `{ width, height }?` | requis pour UI |
| `zoom` | `string?` | 100 %, 200 % ou reflow 400 % |
| `reducedMotion` | `boolean?` | préférence observée |
| `browserDeviceOs` | `string` | versions réelles |
| `assistiveTechnology` | `string?` | VoiceOver/autre, version si disponible |
| `wcagCriteria` | `string[]` | critères évalués |
| `axeReportRef` | `string?` | JSON attaché pour automatisé |

Une preuve WebKit automatisée ne peut pas être requalifiée comme preuve Safari réel.

Chaque état automatisé produit deux résultats distincts : un résultat limité aux règles WCAG 2.1 A/AA, qui exige zéro violation quel que soit l'impact, et un résultat général, qui exige zéro anomalie `serious` ou `critical`. Aucun résultat ne peut remplacer l'autre.

## VisualEvidence

Extension logique de `VerificationEvidence` pour la revue humaine du design.

| Champ | Type | Règle |
| --- | --- | --- |
| `route` | `/services \| /galerie \| /contact` | ensemble fermé |
| `state` | `string` | état de référence décrit dans la checklist |
| `viewportWidth` | `320 \| 768 \| 1024` | largeur obligatoire |
| `designReference` | littéral `doc/design.md` | source de vérité unique |
| `compositionMatch` | `boolean` | vrai obligatoire |
| `tokenMatch` | `boolean` | vrai obligatoire |
| `essentialContentMatch` | `boolean` | vrai obligatoire |
| `interactionStateMatch` | `boolean` | vrai obligatoire |
| `screenshotRef` | `string` | preuve expurgée liée au SHA |
| `reviewer` | `string` | signature requise |

## RiskAcceptance

| Champ | Type | Règle |
| --- | --- | --- |
| `riskId` | `string` | identifiant stable |
| `description` | `string` | risque précis et expurgé |
| `severity` | `low \| moderate \| major \| critical` | niveau fermé |
| `scope` | `string` | impact limité |
| `expiresAt` | `UTC timestamp` | date obligatoire |
| `mitigation` | `string` | mesure active |
| `owner` | `string` | responsable identifié |
| `approvedAt` | `UTC timestamp` | signature datée |

Une acceptation de risque ne peut transformer une preuve obligatoire `failed`, `blocked` ou `not_run` en `passed`. Un risque majeur/critique connu interdit `ready` conformément à FR-054.

## ArchiveReference

Référence stable inscrite dans le rapport avant son téléversement, sans créer de commit supplémentaire.

| Champ | Type | Règle |
| --- | --- | --- |
| `provider` | littéral `github_release` | fournisseur fermé pour le MVP |
| `releaseId` | `string` | ID de la release créée en brouillon avant génération du rapport final |
| `releaseTag` | `string` | tag unique dérivé du SHA candidat |
| `candidateSha` | `string` | strictement identique au SHA du rapport |
| `reportAssetName` | littéral `report.json` | nom fermé |
| `summaryAssetName` | littéral `summary.md` | nom fermé |
| `expectedImmutable` | littéral `true` | la release publiée doit être immuable |

## ArchiveVerification

Preuve externe lue depuis le fournisseur après téléversement et publication ; elle n'est pas réinjectée dans les assets archivés.

| Champ | Type | Règle |
| --- | --- | --- |
| `releaseId` | `string` | identique à `ArchiveReference.releaseId` |
| `candidateSha` | `string` | identique au rapport et à la cible de release |
| `publishedAt` | `UTC timestamp` | date observée côté fournisseur |
| `assetDigests` | `record<string,string>` | digests SHA-256 complets fournis par les métadonnées de release |
| `immutable` | `boolean` | vrai obligatoire |
| `verifiedAt` | `UTC timestamp` | date de relecture de la release publiée |

Les digests complets ne sont pas inscrits à l'intérieur des assets qu'ils décrivent : cela créerait une auto-référence instable. Le rapport contient seulement la référence stable ; l'orchestrateur conserve la vérification dans l'état du gate et le fournisseur la rend récupérable avec la release.

## ReadinessReport

| Champ | Type | Règle |
| --- | --- | --- |
| `schemaVersion` | littéral versionné | permet la validation future |
| `candidate` | `ReleaseCandidate` | candidat unique |
| `evidence` | `VerificationEvidence[]` | toutes exigences couvertes |
| `coverage` | objet | `RequirementRecord[]`, exigences attendues/couvertes/manquantes par type et par source |
| `riskAcceptances` | `RiskAcceptance[]` | risques non bloquants uniquement |
| `promotionDecision` | `approved_for_promotion \| not_approved` | calculée sur les gates de préproduction |
| `launchDecision` | `ready \| not_ready` | calculée après déploiement, jamais saisie librement |
| `decisionReasons` | `string[]` | raisons fermées/expurgées pour les deux décisions |
| `promotionApprovedBy` | `string?` | requis si `promotionDecision=approved_for_promotion` |
| `promotionApprovedAt` | `UTC timestamp?` | requis si `promotionDecision=approved_for_promotion` |
| `launchApprovedBy` | `string?` | requis si `launchDecision=ready` |
| `launchApprovedAt` | `UTC timestamp?` | requis si `launchDecision=ready` |
| `archive` | `ArchiveReference?` | référence préparée avant publication ; la déclaration `ready` ne devient officielle qu'après `ArchiveVerification` réussie |

### Calcul de décision

```text
approved_for_promotion si et seulement si :
  arbre propre
  + même SHA pour toutes les preuves
  + couverture de 100 % des gates obligatoires de préproduction
  + statut passed pour chaque gate obligatoire de préproduction
  + aucune régression major/critical connue
  + preuves manuelles de préproduction signées
sinon not_approved

ready si et seulement si :
  promotionDecision = approved_for_promotion
  + production déployée sur le même SHA
  + smoke production entièrement passed
  + rapport final rescanné et expurgé
  + assets report.json et summary.md archivés durablement
  + ID/tag/noms d'assets identiques au rapport et digests SHA-256 vérifiés dans les métadonnées immuables de release
sinon not_ready
```

La release est d'abord créée en brouillon pour obtenir un ID stable. Le rapport final expurgé référence cet ID et le tag attendu, les deux assets sont téléversés puis la release est publiée en mode immuable. Une déclaration locale `launchDecision=ready` n'est pas une décision officielle : elle ne le devient qu'une fois ce même rapport récupérable dans la release publiée et `ArchiveVerification` réussie. Un brouillon, un upload partiel ou une vérification divergente maintient la décision opérationnelle à `not_ready`.

## ReleaseState transitions

```text
draft
  -> local_validated
  -> preview_deployed
  -> preview_validated
  -> approved_for_promotion
  -> production_deployed
  -> ready

gate préproduction obligatoire non passed -> not_approved
gate post-déploiement obligatoire non passed -> not_ready
production_deployed + smoke critique échoué -> rollback_pending
rollback_pending -> rolled_back | fixed_forward
rolled_back/fixed_forward -> ready après nouveau smoke et nouvelle archive
```

Les transitions ne réécrivent jamais une preuve antérieure. Une nouvelle exécution crée un nouveau rapport lié à son SHA/deploy.
