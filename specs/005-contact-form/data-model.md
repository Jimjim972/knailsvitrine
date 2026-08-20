# Data Model: Formulaire de contact

La fonctionnalité n'ajoute aucune table. Les modèles ci-dessous sont des objets transitoires TypeScript et des champs transmis à Netlify Forms.

## ContactDraft

Valeurs brutes contrôlées dans le navigateur.

| Champ | Type | Règle |
| --- | --- | --- |
| `name` | `string` | valeur saisie, jamais tronquée |
| `phone` | `string` | valeur saisie, vide autorisé |
| `email` | `string` | valeur saisie |
| `message` | `string` | valeur saisie, jamais journalisée |

Les valeurs brutes sont préservées après toute erreur récupérable. Une modification après succès ouvre une nouvelle tentative indépendante.

## ContactActionInput

Charge remise par le navigateur à la Server Action. Elle contient `submission-id`, les quatre champs visibles et `bot-field`, mais jamais `form-name` ni une origine fournisseur. L'action traite cet endpoint public comme non fiable et revalide l'ensemble.

## NormalizedContactSubmission

Instantané immuable produit par la Server Action et revalidé par la garde Edge pour l'appel fournisseur.

| Champ | Type | Validation |
| --- | --- | --- |
| `form-name` | littéral `contact` | obligatoire |
| `submission-id` | UUID | généré côté navigateur ; réutilisé après issue ambiguë |
| `name` | `string` | trim, 2 à 120 caractères |
| `phone` | `string` | trim ; vide ou 6 à 30 caractères autorisés avec au moins 6 chiffres |
| `email` | `string` | trim, format e-mail partagé, maximum 254 caractères |
| `message` | `string` | trim, 10 à 2 000 caractères |
| `bot-field` | `string` | vide pour un parcours humain |

Les longueurs suivent la mesure JavaScript/Zod des chaînes UTF-16. Aucune normalisation Unicode, conversion de casse, suppression de ponctuation interne ou troncature n'est appliquée.

## ContactFieldErrors

```text
name?    -> message français
phone?   -> message français
email?   -> message français
message? -> message français
```

L'objet ne contient que les champs en erreur. Il peut être produit localement ou par l'état fermé de la Server Action. Une réponse fournisseur brute n'est jamais propagée.

## ContactActionState

État sérialisable retourné par la Server Action : erreurs fermées ou `phase: authorized` avec `submissionId` et l'instantané normalisé. Il ne contient ni origine, ni statut, corps ou en-têtes fournisseur. `phase` appartient à `idle | authorized | error`; l'état `pending` global est piloté côté client pendant l'action puis le POST fournisseur.

## ContactUiState

| Phase | Données associées | Invariants |
| --- | --- | --- |
| `idle` | draft, aucune erreur active | champs éditables, bouton disponible |
| `pending` | snapshot, `submissionId`, token de tentative | verrou synchrone pris, Action ou POST fournisseur actif, bouton désactivé, `aria-busy=true` |
| `success` | annonce de succès | autorisation serveur suivie d'un HTTP 2xx fournisseur, champs éditables vidés |
| `error` | `errorKind`, erreurs de champ éventuelles, draft préservé | aucun succès visible, réessai disponible |

`errorKind` appartient à `validation | network | timeout | provider | unexpected`.

## ProviderClassification

État distant non disponible dans la réponse navigateur : `verified | spam | rejected-silently | unknown`. Il est consulté uniquement dans l'interface Netlify pendant les contrôles d'exploitation et ne pilote pas l'état React.

## Transitions

```text
idle --submit invalid--> error(validation)
idle --submit valid--> pending
error --submit invalid--> error(validation)
error --submit valid--> pending
pending --action rejects--> error(validation|unexpected)
pending --action authorizes--> pending(provider fetch)
pending --browser receives HTTP 2xx--> success
pending --browser receives HTTP non-2xx--> error(provider)
pending --browser fetch network error--> error(network)
pending --10 000 ms browser-fetch deadline--> error(timeout)
success --first edit--> idle
```

Une réponse dont le token n'est plus courant est ignorée. Le timeout fournisseur est déclenché exactement 10 000 ms après le début du `fetch` navigateur ; il annule cette attente sans prétendre annuler une éventuelle prise en charge distante.

## Vie de l'identifiant de corrélation

1. Créer un UUID au premier submit valide.
2. Le conserver pendant `pending`.
3. Le supprimer après un HTTP 2xx certain.
4. Le conserver après `timeout`, interruption ou résultat réseau ambigu.
5. Le réutiliser lors du réessai de cette saisie inchangée.
6. En créer un nouveau si l'utilisateur modifie les valeurs après une erreur ou commence une nouvelle demande.

Cet identifiant ne contient aucune donnée personnelle et n'est pas une clé d'idempotence garantie par Netlify.
