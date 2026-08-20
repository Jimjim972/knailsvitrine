# Contract: Sécurité de production

## Matrice des rôles

| Surface | Anon | Auth non-admin | Admin courant |
| --- | --- | --- | --- |
| prestations actives | lecture | lecture | CRUD |
| prestations inactives | invisible | invisible | lecture/CRUD |
| catégories nécessaires au public | lecture minimale | lecture minimale | CRUD selon contraintes |
| photos actives + ready | métadonnées/GET autorisés | identique public | CRUD |
| photos masquées/non-ready | invisibles/GET refusé | refus | administration |
| Storage list | refus | refus | selon besoin admin |
| upload/remplace/supprime | refus | refus | opérations séparées autorisées |
| actions admin directes | refus | refus | session+rôle revalidés |

Chaque cas teste le privilège objet/Data API et la politique RLS comme deux résultats distincts.

## Auth

- le rôle vient de `raw_app_meta_data`, jamais `raw_user_meta_data` ;
- le `session_id` courant existe encore dans `auth.sessions` pour le même utilisateur ;
- `not_after` est absent ou futur ;
- promotion, déclassement, expiration et suppression de session prennent effet au prochain contrôle sensible ;
- signup email/OTP, SMS et anonymous sont désactivés sur la cible hébergée.

Les contrôles d'interface, Proxy et layout ne remplacent aucune vérification serveur/SQL.

## Storage

Le bucket galerie reste privé. L'autorisation de téléchargement est liée à l'opération et à une ligne photo `actif=true`, `file_state=ready`. La liste reste refusée. L'upsert exige les politiques `INSERT + SELECT + UPDATE`; la suppression a une politique `DELETE` distincte. Les fichiers sont supprimés par l'API Storage, jamais par SQL direct.

## Entrées et réponses

Les Server Actions et la garde Contact revalident toute entrée contournant l'UI. Les erreurs publiques sont fermées et aucun faux succès n'est permis. Les réponses admin et octets privés utilisent une politique de cache privée/no-store.

## En-têtes

Toutes les routes pertinentes reçoivent une CSP compatible avec les seules ressources du MVP, une protection anti-frame, `nosniff`, une politique de référent et une politique de permissions restrictive. Le test ouvre les flux Auth, images, Storage et Contact pour détecter tout blocage légitime.

## Secrets

Le scan couvre arbre de travail, historique du candidat, exemples, bundle client, source maps/artefacts, réponses et journaux autorisés. Sont interdits : mot de passe, cookie, JWT, contenu Contact, `service_role`, `sb_secret_...`, variables ponctuelles du bucket et secret flash.

## Environnements d'exécution

- local/preview isolée : matrice complète et mutable avec fixtures UUID nettoyables ;
- production : catalogues, configuration et lectures/refus non destructifs ;
- signup canari production : seulement après inspection, autorisation et plan de suppression ;
- aucun test destructif n'est lancé si la cible est ambiguë.

## Advisors et plateforme

Exécuter advisors sécurité/performance localement et sur la cible liée, conserver toutes les alertes et traiter les warnings. Vérifier SSL Enforcement et Network Restrictions en lecture seule. Toute mutation de configuration requiert fenêtre de maintenance, cible vérifiée et sauvegarde de l'état précédent.

Une alerte pertinente non corrigée ou non acceptée de façon datée garde le rapport `not_ready`.
