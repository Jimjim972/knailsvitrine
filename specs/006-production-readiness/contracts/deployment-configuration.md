# Contract: Déploiement et configuration

## Contextes

| Contexte | Code | Données | Formulaire | Indexation |
| --- | --- | --- | --- | --- |
| Local | arbre de travail | Supabase local | simulation/fixture | interdite |
| Deploy Preview | SHA de PR | projet Supabase preview isolé | `contact-preview` | `noindex, nofollow` |
| Branch deploy | SHA explicitement autorisé | projet non-production isolé | `contact-preview` | `noindex, nofollow` |
| Production | SHA approuvé | projet Supabase production | `contact` | autorisée si domaine cohérent |

Une URL de preview n'autorise aucune isolation implicite. L'origine, le projet Supabase, le formulaire et le secret flash doivent chacun correspondre au contexte.

## Inventaire runtime

Variables applicatives obligatoires :

- `NEXT_PUBLIC_SUPABASE_URL` : URL HTTPS distante ou loopback exact en local ;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : clé publiable du même projet ;
- `SERVICE_SUCCESS_FLASH_SECRET` : secret serveur aléatoire, distinct par contexte, au moins 32 caractères.

Variables interdites sur Netlify et au runtime :

- `SUPABASE_GALLERY_CONFIG_URL` ;
- `SUPABASE_GALLERY_CONFIG_PROJECT_REF` ;
- `SUPABASE_GALLERY_CONFIG_SECRET_KEY` ;
- toute clé `service_role`, `sb_secret_...` ou secret préfixé `NEXT_PUBLIC_`.

Les variables système Netlify `CONTEXT`, `URL`, `DEPLOY_PRIME_URL`, `COMMIT_REF` et identifiants de deploy peuvent être lues, jamais redéfinies comme secrets applicatifs.

## Validation fail-closed

Le build ou le gate échoue si :

- une variable obligatoire manque, est vide ou mal formée ;
- l'URL et la clé publiable ne désignent pas la même cible attendue ;
- une preview partage la cible production ;
- le secret flash est public, trop court ou identique entre preview et production ;
- une variable ponctuelle/interdite est présente ;
- `CONTEXT=production` et `URL` diffèrent de l'origine canonique confirmée ;
- la révision Netlify diffère du SHA du candidat.

Le diagnostic indique le nom et un code fermé, jamais la valeur.

## Déploiement candidat

1. Confirmer et consigner l'origine canonique avant toute constante, metadata ou redirection.
2. Capturer le SHA et exiger un arbre propre.
3. Exécuter le gate local complet.
4. Publier la Deploy Preview depuis ce SHA.
5. Vérifier deploy ID, permalink, build log et contexte.
6. Exécuter la recette preview avec garde de cible.
7. Calculer `approved_for_promotion` uniquement si toutes les preuves obligatoires de préproduction sont `passed`.
8. Vérifier que le déploiement de production correspond au SHA approuvé.
9. Exécuter le smoke test final, y compris les assertions SEO réelles, sur le domaine canonique.
10. Calculer le résultat final, rescanner et expurger le rapport, créer la GitHub Release en brouillon, y inscrire les deux assets puis publier l'archive immuable sans modifier le SHA.
11. Vérifier ID, tag, SHA et digests des assets dans les métadonnées de release ; `launchDecision=ready` n'est valide qu'après cette vérification.

## Domaine et redirections

Le contrat exige :

- certificat valide sur le domaine officiel ;
- origine canonique unique `https://knailsbeauty.fr` ;
- HTTP et `www.knailsbeauty.fr` vers l'origine canonique ;
- `knailsbeauty.com` et `www.knailsbeauty.com`, en HTTP comme en HTTPS, vers l'origine canonique ;
- sous-domaine Netlify de production vers l'origine canonique ;
- code permanent attendu, chemin et query conservés, aucune boucle.

Le domaine `.com` ne sert jamais le contenu comme seconde origine et ne peut apparaître dans les canonicals, le sitemap, Open Graph ou les données structurées.

## Rollback

Le rollback publie un ancien deploy atomique seulement si son application reste compatible avec le schéma courant. Il ne restaure ni base, ni Auth, ni Storage. Si la compatibilité est incertaine, utiliser un roll-forward. Après rollback : verrouiller la publication automatique si nécessaire, vérifier les variables du deploy, rejouer le smoke test et consigner l'incident.
