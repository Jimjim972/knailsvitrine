# Foundation Diagnostics Contract

## Purpose

Le lanceur `scripts/run-foundation-checks.mjs` agrège les contrôles locaux de la fondation sans devenir une interface utilisateur. Une exécution peut produire plusieurs contrôles, mais chaque contrôle en échec porte exactement une catégorie principale.

`scripts/check-auth-signup.mjs` et `scripts/check-supabase-storage.mjs` respectent aussi ce contrat lorsqu'ils sont lancés seuls. Ils produisent des enregistrements structurés que le lanceur agrège sans déduire une catégorie depuis un message d'erreur brut.

## Shareable result shape

```text
{
  checkId: string,
  status: "pass" | "fail",
  category?: "validation" | "authorization" | "privilege" | "internal",
  summary: string
}
```

- `checkId` est stable, non sensible et identifie le comportement contrôlé.
- `status = "pass"` n'a pas de `category`.
- `status = "fail"` possède exactement une `category`.
- `summary` reste court, exploitable et ne reprend jamais une réponse brute de Supabase.
- Le processus retourne un code non nul si au moins un contrôle échoue.
- Toute commande susceptible de modifier Supabase est précédée d'une garde loopback et utilise explicitement son mode local ; une cible liée distante provoque un échec `internal` avant mutation.

## Category precedence

Lorsqu'un même contrôle présente plusieurs symptômes, la cause vérifiée la plus proche reçoit la catégorie selon cet ordre déterministe :

1. `validation` si l'entrée, la variable ou la contrainte contrôlée est invalide ;
2. `authorization` si l'identité, la session, le rôle ou la politique RLS refuse l'opération ;
3. `privilege` si le droit SQL/Storage requis manque avant ou indépendamment de RLS ;
4. `internal` si aucune catégorie précédente n'explique l'échec, notamment service local indisponible, réseau, quota ou exception inattendue.

Un refus attendu est un contrôle réussi. Par exemple, une tentative publique d'inscription refusée sans utilisateur créé produit `status = "pass"`; elle ne devient `authorization` que si le contrôle lui-même échoue à prouver la règle attendue.

## Diagnostic mapping

| Evidence | Category when the check fails |
| --- | --- |
| URL d'environnement invalide, valeur hors contrainte, chemin/MIME/taille incorrects acceptés à tort | `validation` |
| Visibilité RLS incorrecte, mutation non-admin acceptée, inscription publique acceptée, session révoquée encore privilégiée | `authorization` |
| `GRANT` explicite absent, privilège par défaut non fermé, composante `INSERT`/`SELECT`/`UPDATE`/`DELETE` manquante | `privilege` |
| Pile locale inaccessible, erreur réseau, nettoyage de fixture impossible ou erreur non classable | `internal` |

Le contrôle d'inventaire peut distinguer un privilège manquant d'un refus RLS; il ne déduit pas la catégorie à partir du seul texte d'une erreur HTTP.

## Redaction rules

La sortie partageable ne contient jamais :

- clé publiable complète, clé secrète ou `service_role` ;
- JWT, cookie, mot de passe, code OTP ou adresse email de fixture complète ;
- URL avec identifiants ou paramètres sensibles ;
- SQL brut, trace, corps de réponse Auth/Storage complet ou détail d'infrastructure hébergée ;
- nom de fichier fourni par un utilisateur réel.

Les fixtures utilisent des identifiants aléatoires locaux et sont supprimées dans un bloc final. Si un nettoyage échoue, le résultat indique seulement le type abstrait de ressource et la catégorie `internal`.

## Required check groups

- `environment`: variables présentes, URL loopback HTTP ou distante HTTPS, absence de secret public ;
- `auth`: configuration fermée et auto-inscription directe refusée sans création d'utilisateur ;
- `schema`: tables, contraintes, triggers, index, droits explicites et privilèges par défaut ;
- `rls`: visibilité et mutations des profils `anon`, non-admin, admin et admin révoqué ;
- `storage`: URL publique réellement téléchargée, non-découverte, upload, upsert, delete et limites ;
- `scale`: tri déterministe de 40 prestations et 100 photos ;
- `tooling`: lint, advisors, dérive des types, ESLint, TypeScript, build et scan post-build de secrets.

La formulation destinée aux visiteurs ou à l'administrateur final sera définie avec les futures interfaces et n'est pas dérivée automatiquement de ces résumés techniques.
