# Access Control Contract

## Profiles

| Profile | Authentication evidence | Admin predicate |
| --- | --- | --- |
| Visitor | Rôle PostgreSQL `anon`, aucun JWT utilisateur | Faux |
| Authenticated non-admin | Rôle `authenticated`, session active | Faux |
| Current administrator | Rôle `authenticated`, session active, `app_metadata.role = "admin"` | Vrai |
| Stale/revoked administrator | Ancien JWT admin mais `session_id` absent de `auth.sessions` | Faux |

L'absence de route ou d'interface d'inscription n'est pas une protection suffisante. Le service d'identité local impose `auth.enable_signup = false`, `auth.enable_anonymous_sign_ins = false`, `auth.email.enable_signup = false` et `auth.sms.enable_signup = false`; aucun fournisseur externe n'est activé par cette fondation. Le mainteneur propriétaire du projet, déjà autorisé à employer une capacité administrative Supabase protégée, crée manuellement le premier utilisateur et son rôle hors navigateur ; aucun visiteur ni code applicatif public ne dispose de cette autorité.

Avec la clé publiable, aucun appel direct d'inscription email/mot de passe, OTP ou lien magique, SMS, anonyme ou fournisseur externe ne doit créer d'utilisateur. Le contrôle automatisé utilise un identifiant jetable aléatoire, attend le code Auth `signup_disabled` lorsque ce code s'applique, puis prouve que le nombre d'utilisateurs n'a pas changé. Après une garde loopback, il capture la capacité administrative depuis la sortie machine de `supabase status` uniquement en mémoire pour compter et nettoyer les fixtures ; cette capacité n'entre jamais dans l'appel public contrôlé ni dans sa sortie.

## SQL privilege matrix

Les privilèges sont nécessaires avant l'évaluation RLS, mais ne remplacent jamais les politiques.

| Resource | `anon` | `authenticated` |
| --- | --- | --- |
| `public.prestations` | `SELECT` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `public.photos_galerie` | `SELECT` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `private.is_current_admin()` | Aucun | `EXECUTE` |

Les privilèges inutiles sont révoqués explicitement. Pour les objets futurs créés par `postgres`, les privilèges par défaut de tables (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) et de séquences (`USAGE`, `SELECT`) sont retirés à `anon`, `authenticated` et `service_role`; l'exécution implicite des fonctions applicatives est aussi retirée à `PUBLIC`, puis accordée fonction par fonction. Les deux tables reçoivent ensuite uniquement la matrice explicite ci-dessus. Les UUID ne nécessitent aucun droit de séquence applicatif.

## Table RLS policies

RLS est activée sur les deux tables. Les politiques sont séparées par opération.

| Operation | `anon` | Authenticated non-admin | Current administrator |
| --- | --- | --- | --- |
| Lire une ligne active | Autorisé | Autorisé | Autorisé |
| Lire une ligne inactive | Refusé | Refusé | Autorisé |
| Insérer | Refusé | Refusé | Autorisé |
| Modifier | Refusé | Refusé | Autorisé (`USING` et `WITH CHECK`) |
| Supprimer | Refusé | Refusé | Autorisé |

Pour chaque table :

- la politique publique `SELECT` exige `actif = true` et s'applique à `anon, authenticated` ;
- la politique admin `SELECT` exige `(select private.is_current_admin())` ;
- les politiques admin `INSERT`, `UPDATE` et `DELETE` exigent le même prédicat, enveloppé par `select` pour une seule évaluation par instruction ;
- la politique `UPDATE` répète le prédicat dans `USING` et `WITH CHECK` ;
- aucune politique ne lit `user_metadata` ou `raw_user_meta_data`.

## Storage policy matrix

Les politiques ciblent `storage.objects` uniquement lorsque `bucket_id = 'galerie'`, que le chemin respecte exactement `photos/<uuid-v4-minuscule>.<extension-autorisée>` et que `private.is_current_admin()` est vrai. `UPDATE` répète ces limites dans `USING` et `WITH CHECK`.

| Operation | Visitor | Authenticated non-admin | Current administrator |
| --- | --- | --- | --- |
| Lire l'objet par URL publique | Autorisé par le bucket public | Autorisé | Autorisé |
| Lister les métadonnées Storage | Refus ou résultat vide non découvrable | Refus ou résultat vide non découvrable | Autorisé via `SELECT` |
| Envoyer un nouvel objet | Refusé | Refusé | Autorisé via `INSERT` |
| Remplacer un objet | Refusé | Refusé | Autorisé via `INSERT` + `SELECT` + `UPDATE` |
| Supprimer un objet | Refusé | Refusé | Autorisé via `DELETE` dédiée |

Le bucket public rend un lien d'objet connu lisible ; rendre une photo inactive retire sa métadonnée de la liste publique mais ne révoque pas un lien direct déjà connu.

## Revocation protocol

### Grant admin access

1. Créer le compte manuellement, sans endpoint d'inscription publique.
2. Écrire `app_metadata.role = "admin"` au moyen d'une capacité administrative protégée.
3. Révoquer ou rafraîchir la session existante afin d'obtenir un JWT contenant le nouveau claim.
4. Vérifier la matrice admin avec ce nouveau contexte.

### Remove admin access

1. Retirer `app_metadata.role` au moyen d'une capacité administrative protégée.
2. Effectuer une révocation globale des sessions de cet utilisateur.
3. Vérifier que l'ancien contexte échoue parce que son `session_id` n'est plus actif.
4. Vérifier qu'une nouvelle session sans rôle admin conserve uniquement la lecture publique.

## Mandatory security tests

- La configuration inventorie les quatre drapeaux Auth fermés et l'absence de fournisseur externe activé.
- Une auto-inscription directe via l'API Auth et la clé publiable échoue sans session ni utilisateur créé.
- Un visiteur lit les actifs, ne lit aucun inactif et échoue sur chaque mutation.
- Un connecté non-admin a exactement la même visibilité métier que le visiteur.
- Un administrateur courant lit et mute actifs et inactifs.
- Un ancien jeton admin dont la session est révoquée n'a aucun droit admin.
- Une valeur placée uniquement dans `user_metadata` n'accorde jamais de droit.
- Une tentative directe avec un ID inactif ne contourne pas la liste publique.
- Chaque opération Storage est testée séparément, dont l'upsert complet.
- Les suppressions temporaires d'un objet seul et d'une métadonnée seule prouvent l'indépendance des droits, puis les fixtures sont nettoyées ; elles ne constituent pas un workflow applicatif coordonné.
- Les tests prouvent que les refus ne laissent aucune ligne ni objet résiduel.
- La fermeture locale ne vaut pas preuve pour un projet hébergé : l'application distante de la configuration et son contrôle direct constituent un futur gate de déploiement autorisé.

## Security boundaries

- Une redirection Next.js ou une interface masquée n'est pas une autorisation.
- Toute future Server Action répète le contrôle de session et de rôle avant mutation.
- La clé publiable est la seule clé autorisée dans l'application ; une clé secrète ou `service_role` est interdite dans le bundle, les logs et les fichiers versionnés.
- `private.is_current_admin()` reste hors schéma exposé et possède un `search_path` explicitement vide.
