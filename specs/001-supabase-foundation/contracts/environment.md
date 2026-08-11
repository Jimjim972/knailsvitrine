# Environment and Client Contract

## Runtime baseline

| Tool/dependency | Required version |
| --- | --- |
| Node.js | 22 LTS |
| npm | Version compatible avec Node.js 22 et le lockfile |
| Next.js | 16.3.0 |
| React / React DOM | 19.2.8 |
| `@supabase/supabase-js` | 2.112.2 exact |
| `@supabase/ssr` | 0.12.4 exact |
| `supabase` CLI devDependency | 2.112.0 exact |
| `zod` | 4.4.3 exact |

`.nvmrc` et `package.json#engines.node` doivent matérialiser Node.js 22. Le runtime actuel Node.js 20 doit être remplacé avant l'installation des dépendances Supabase.

## Public variables

`.env.example` contient uniquement les noms suivants, avec valeurs vides ou exemples non secrets :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- Ces variables sont nécessaires au navigateur et au serveur Next.js.
- Zod parse l'adresse avec `URL`, exige une clé publiable non vide et applique la règle de transport ci-dessous au démarrage du client concerné.
- Netlify doit recevoir les deux valeurs au moment du build et à l'exécution.
- Les valeurs réelles résident dans les environnements locaux non versionnés et dans la configuration Netlify.

### URL transport rule

- `https:` est obligatoire pour toute origine distante, dont Supabase hébergé et Netlify.
- `http:` n'est accepté que si `hostname` vaut exactement `localhost`, `127.0.0.1` ou `[::1]`, avec port facultatif, pour la pile locale.
- Les identifiants intégrés, fragments, protocoles autres que HTTP(S), URL mal formées et faux domaines tels que `localhost.evil.example` sont refusés.
- La règle examine l'hôte parsé, pas un simple préfixe textuel.

Matrice minimale de validation :

| Value | Expected |
| --- | --- |
| `http://127.0.0.1:54321` | Acceptée en local |
| `http://localhost:54321` | Acceptée en local |
| `http://[::1]:54321` | Acceptée en local |
| `https://project.supabase.co` | Acceptée |
| `http://project.supabase.co` | Refusée |
| `http://localhost.evil.example` | Refusée |
| URL vide, mal formée ou `ftp:` | Refusée |

## Forbidden variables and values

- Aucune clé secrète, legacy `service_role`, mot de passe de base, token personnel ou cookie n'est ajouté à `.env.example` pour cette feature.
- Aucune clé privilégiée ne reçoit un préfixe `NEXT_PUBLIC_`.
- Aucune valeur réelle de projet Supabase n'est inscrite dans le dépôt, les tests, les captures ou les logs.
- Le CRUD applicatif futur ne doit pas introduire une clé secrète pour contourner RLS.

## Browser client

`lib/supabase/client.ts` :

- module utilisable dans un Client Component ;
- `createBrowserClient<Database>(url, publishableKey)` ;
- variables obtenues par le module de validation public ;
- aucune importation de `server-only`, `cookies()` ou secret.

## Server client

`lib/supabase/server.ts` :

- commence par `import "server-only"` ;
- expose une fabrique `async` ;
- appelle `await cookies()` selon Next.js 16 ;
- configure `getAll` et `setAll` pour `@supabase/ssr` ;
- crée un client typé par requête, jamais un singleton global ;
- utilise la même URL et la même clé publiable que le navigateur ;
- ne constitue pas à lui seul une preuve d'autorisation.

Dans les contextes où les cookies ne peuvent pas être écrits, l'adaptateur gère ce cas conformément au guide SSR officiel ; le futur `proxy.ts` assurera le rafraîchissement de session lorsque la feature d'authentification sera implémentée.

## Generated database types

- La source est la base locale reconstruite avec toutes les migrations.
- La commande de génération cible le schéma `public` et écrit `lib/supabase/database.types.ts`.
- Le fichier est versionné.
- Un contrôle de dérive régénère dans un fichier temporaire et compare le résultat sans écraser silencieusement la version suivie.
- Après chaque migration, la mise à jour des types fait partie de la même modification.

## Configuration boundaries

- `supabase/config.toml` décrit le projet local, les inscriptions Auth désactivées et le bucket nécessaire. Une modification de ce fichier nécessite un redémarrage de la pile locale.
- Ce fichier versionné ne prouve pas qu'un projet hébergé possède la même configuration ; l'application distante et la vérification directe restent un gate de déploiement séparé et autorisé.
- Les identifiants et secrets générés par Supabase local ne sont pas recopiés dans la documentation.
- Aucun `proxy.ts` n'est ajouté dans cette fondation, les écrans de connexion étant hors périmètre.
- `next.config.ts` et la configuration `images.remotePatterns` restent inchangés tant que les pages ne consomment pas Storage.

## Validation test execution

Le contrôle local importe `lib/supabase/env.ts` avec la suppression native des types de Node.js 22, vérifiée au préalable via `node --help`. Aucun framework ou transpileur supplémentaire n'est ajouté. Si ce support manque sur le runtime installé, le contrôle s'arrête avec une catégorie `internal` avant d'évaluer la matrice.
