# Infrastructure

## Objectif

Héberger le site vitrine et son petit espace d'administration avec un coût initial nul, tout en conservant une solution adaptée à un usage commercial.

## Solution retenue

| Besoin | Service | Offre |
| --- | --- | --- |
| Hébergement de l'application Next.js | Netlify | Free |
| Base de données PostgreSQL | Supabase | Free |
| Authentification de l'administrateur | Supabase Auth | Free |
| Stockage et diffusion des photos | Supabase Storage | Free |
| Code source et déploiements | GitHub | Free |
| Domaine et certificat HTTPS | Domaine personnalisé + SSL Netlify | SSL inclus |

## Pourquoi Netlify plutôt que Vercel Hobby ?

Vercel réserve officiellement son offre Hobby aux projets personnels et non commerciaux. Un site qui présente des prestations d'onglerie est considéré comme commercial.

Netlify Free autorise les projets commerciaux et prend en charge les principales fonctionnalités de Next.js : App Router, Server Components, Server Actions, Route Handlers, SSR, ISR et optimisation des images.

Vercel Hobby peut rester utile pour les tests ou les prévisualisations, mais le domaine public de production sera déployé sur Netlify.

## Limites à surveiller

### Netlify Free

- 300 crédits mensuels avec une limite stricte ;
- un déploiement en production consomme actuellement 15 crédits ;
- le trafic, les requêtes et le calcul serveur consomment également des crédits ;
- le site peut être suspendu jusqu'au prochain cycle si tous les crédits sont consommés ;
- aucun dépassement payant automatique sur l'offre Free.

Sur les plans à crédits actuels, Netlify Forms est inclus gratuitement et sans quota propre de soumissions. Le trafic reste toutefois comptabilisé comme requêtes web dans le budget du site. Une Edge Function n'ajoute pas de consommation de calcul, mais son invocation compte elle aussi comme requête web. Les comptes Netlify Legacy suivent un modèle distinct : l'offre réellement attachée au site doit être vérifiée avant la mise en production.

Les fichiers restent dans Supabase Storage, mais le bucket galerie est privé et les octets sont relayés sans transformation par une Route Handler Netlify qui réautorise chaque demande. Le trafic et les invocations correspondants doivent donc être surveillés dans le budget Free.

## Formulaire de contact Netlify

Le site utilise Netlify Forms sans variable secrète et sans stockage Supabase supplémentaire. La détection des formulaires doit être activée dans Netlify avant le déploiement de contrôle, puis le site doit être redéployé afin que les deux blueprints statiques `contact` et `contact-preview` de `public/__forms.html` soient détectés. Netlify Forms étant une ressource du site et non du contexte de deploy, cette séparation par nom est obligatoire même lorsque les deux formulaires appartiennent au même site.

Le navigateur invoque d'abord une Server Action Next.js sans déclarer `form-name`. L'action revalide avec Zod et retourne un instantané normalisé autorisé. Le serveur sélectionne `contact` uniquement quand le contexte Netlify de confiance vaut `production`, et `contact-preview` pour `deploy-preview`, `branch-deploy`, `dev` ou `local`. Le navigateur POSTe ensuite la charge URL-encodée vers le chemin relatif constant `/__forms.html`, avec les credentials omis et un timeout exact de 10 secondes. Aucune origine configurable ou fournie par l'appelant n'est acceptée. Une Edge Function versionnée laisse passer sans lecture les requêtes internes portant `Next-Action`, puis revalide tout autre POST Contact et refuse le nom qui ne correspond pas à `context.deploy.context`. Le honeypot déclaré et Akismet restent les filtres anti-spam natifs ; aucun captcha visible n'est ajouté au MVP.

Le succès navigateur repose sur l'autorisation renvoyée par la Server Action puis un statut HTTP positif du fournisseur, pas sur le classement final Verified/Spam que Netlify ne renvoie pas au client. Deux hooks e-mail `submission_created` distincts sont configurés et bornés par `form_id`/`form_name`, l'un pour `contact`, l'autre pour `contact-preview`; le second porte un objet explicitement identifié comme preview. Le champ `email` alimente le `Reply-To`. Les destinations restent dans la configuration Netlify et ne sont pas versionnées. Aucune autoréponse au visiteur n'est prévue. La Deploy Preview doit contrôler séparément la chaîne hybride, les POST directs, la détection, la garde Edge, la réception humaine, le honeypot, Akismet et la notification. Un délai réseau ambigu conserve un identifiant opaque de corrélation pour rendre un éventuel doublon repérable, sans prétendre que Netlify fournit une idempotence.

### Supabase Free

- 500 Mo de base PostgreSQL ;
- 1 Go de stockage de fichiers ;
- 5 Go de trafic sortant et 5 Go de trafic mis en cache ;
- 50 000 utilisateurs actifs mensuels pour l'authentification ;
- mise en pause possible après une semaine sans activité ;
- absence de sauvegardes automatiques sur l'offre gratuite.

Une quarantaine de prestations occupera une quantité négligeable d'espace en base. Les photos constitueront l'essentiel du stockage et du trafic.

## Gestion des photos

Avant l'envoi, les images doivent être :

- inspectées avant décodage et refusées au-delà de 25 000 000 pixels ou de 8 192 px par côté ;
- redimensionnées à un côté le plus long de 1 600 px maximum sans agrandissement ;
- converties en WebP ;
- converties en sRGB, débarrassées de leurs métadonnées et encodées aux qualités 0,85, 0,80 ou 0,75 ;
- compressées autour de 150 à 400 Ko, avec un maximum de 1 Mio et un plancher de réduction de 1 200 px pour les originaux qui atteignent cette dimension ;
- accompagnées d'un texte alternatif utile pour l'accessibilité et le référencement.

Avec des fichiers d'environ 300 Ko, le quota de 1 Go permet théoriquement de stocker plusieurs milliers de photos. Une marge doit néanmoins être conservée pour les remplacements et les autres médias.

L'original de 8 MiB maximum est traité dans le navigateur et envoyé directement à Supabase Storage. Avant publication, la fonction Netlify relit une fois le WebP final limité à 1 Mio pour valider ses octets. Ensuite chaque affichage autorisé transite par une Route Handler même origine, sans réencodage et avec `Cache-Control: private, no-store`, afin que le masquage révoque les octets dès la requête suivante. Les opérations `pending` depuis au moins 10 minutes et les fichiers absents sont audités uniquement par des Server Actions réautorisées, sans tâche planifiée ni service externe supplémentaire dans le MVP.

## Variables d'environnement

Les valeurs suivantes devront être configurées localement et dans Netlify :

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SERVICE_SUCCESS_FLASH_SECRET=
```

Dans Netlify, `production` cible exclusivement le projet Supabase de production. `deploy-preview` et `branch-deploy` ciblent le projet Free isolé `knails-preview` (`vrokelzcffltvztcwftx`), provisionné avec les huit migrations courantes, l'auto-inscription désactivée, SSL Enforcement base activé et un bucket privé `galerie`, mais sans copie de comptes, prestations, catégories, photos ou objets de production. Ses clés JWT legacy sont désactivées et leur ancienne clé de signature est révoquée ; le runtime utilise la clé publiable moderne. La clé publiable correspond au projet de chaque contexte. Les trois valeurs de `SERVICE_SUCCESS_FLASH_SECRET` sont distinctes, générées aléatoirement avec au moins 32 caractères et enregistrées comme secrets Netlify.

La maintenance ponctuelle du bucket hébergé utilise séparément `SUPABASE_GALLERY_CONFIG_URL`, `SUPABASE_GALLERY_CONFIG_PROJECT_REF` et `SUPABASE_GALLERY_CONFIG_SECRET_KEY` depuis `.env.gallery-config.example`. La dernière accepte uniquement une clé Supabase dédiée au format `sb_secret_...`, créée pour cette opération ; la clé JWT historique `service_role` est refusée. Comme une clé `sb_secret_...` n'est pas un JWT, le script l'envoie uniquement dans l'en-tête `apikey`, crée le bucket s'il est absent, exige la concordance explicite de l'URL et de la référence, masque la clé dans ses sorties et relit le flag privé, la limite 8 Mio et les MIME avant succès. Ces variables ne sont jamais configurées dans Netlify, `.env.local`, l'application ou le bootstrap CRUD et ne sont pas versionnées ; la clé est supprimée après la configuration vérifiée et son ancien jeton doit alors recevoir une réponse non positive de Storage et de la Data API. En local, le script accepte uniquement une cible loopback et vérifie `supabase/config.toml` avec les credentials éphémères de la CLI.

`SERVICE_SUCCESS_FLASH_SECRET` est une valeur aléatoire serveur d'au moins 32 caractères, distincte par environnement. Elle authentifie les confirmations ponctuelles après une mutation de prestation et doit être stockée comme variable sensible dans Netlify, sans préfixe `NEXT_PUBLIC_`, sans valeur versionnée et sans envoi au navigateur. Une clé `service_role` ne doit jamais être exposée dans une variable préfixée par `NEXT_PUBLIC_` ni envoyée au navigateur.

La validation accepte l'URL HTTP générée par la pile Supabase locale uniquement pour un hôte loopback exact (`localhost`, `127.0.0.1` ou `[::1]`). Toute URL Supabase distante configurée dans Netlify doit utiliser HTTPS.

La configuration Auth versionnée garde le fournisseur email/mot de passe actif pour les comptes existants créés par maintenance, tout en désactivant globalement les nouvelles inscriptions ainsi que les inscriptions SMS et anonymes. Son équivalent hébergé doit être appliqué uniquement dans un déploiement autorisé vers un projet cible vérifié — après contrôle de la syntaxe installée, `supabase config push --project-ref <verified-ref>` est la commande CLI prévue — puis contrôlé par une tentative directe avec la clé publiable. Le fichier local ne prouve pas à lui seul l'état du service hébergé et aucune mutation distante n'est réalisée par la fondation.

La recette preview autorisée s'exécute avec `npm run security:preview-check`. Elle vérifie d'abord le SHA et la séparation `vrokelzcffltvztcwftx`/`pfucayywhexemzdfwmcs`, crée uniquement des fixtures UUID, teste Auth/RLS/Storage avec des sessions réelles, puis relit l'absence de toute ligne, identité et objet de test. L'accès Supabase Management et la clé secrète moderne sont injectés dans le seul processus de recette, jamais dans Netlify ni dans un fichier du dépôt.

L'audit de production reste en lecture seule tant qu'une mutation n'a pas été autorisée séparément. L'inspection du 20 août 2026 a confirmé tables, RLS, GRANT, bucket et restrictions réseau, mais a maintenu `not_ready` pour l'inscription e-mail encore ouverte, la protection contre mots de passe compromis inactive, le warning de politiques Galerie avant migration, SSL Enforcement base désactivé et les clés legacy encore actives. Chacun de ces écarts doit être corrigé ou faire l'objet d'une acceptation de risque datée et bornée avant promotion ; leur simple constat ne vaut jamais validation.

## Socle local versionné

La fondation utilise Node.js 22 LTS, Supabase CLI 2.112.0, `@supabase/supabase-js` 2.112.2, `@supabase/ssr` 0.12.4 et Zod 4.4.3. Les versions sont épinglées dans le projet afin que la migration, les types et les contrôles restent reproductibles. La galerie ajoute `sharp@0.35.3`, épinglé exactement dans `package.json` et `package-lock.json` uniquement comme dépendance de développement pour convertir les neuf images initiales ; un contrôle interdit son import hors `scripts/bootstrap-gallery.mjs`, afin qu'il n'entre ni dans le bundle navigateur ni dans le traitement d'image du runtime Netlify. Le bootstrap contrôle un manifeste SHA-256 et utilise une session administrateur normale, jamais `service_role`.

`supabase/config.toml` décrit uniquement la pile locale : bucket privé `galerie` limité à 8 MiB pour JPEG, PNG et WebP, fermeture des créations publiques de comptes et plafond local de 100 demandes de connexion/inscription par cinq minutes pour que la matrice E2E reste déterministe sans tester le 429 par épuisement. La politique de lecture privée autorise uniquement le téléchargement d'un chemin lié à une photo active et `ready`, jamais la liste anonyme. Pour une cible hébergée explicitement autorisée, un script d'infrastructure configure/vérifie le flag privé par l'API Storage avec la clé `sb_secret_...` ponctuelle décrite ci-dessus, jamais chargée par Netlify, le bootstrap ou le navigateur ; aucune migration ne modifie directement `storage.buckets`. Le rapport `npm run foundation:check` réinitialise cette pile, vérifie contraintes, RLS, Auth, Storage et types, puis exécute lint, TypeScript, build et scan de secrets. `npm run auth:check` ajoute les contrats unitaires et la matrice Chromium/WebKit/Axe. Aucun de ces scripts ne pousse une configuration vers un projet hébergé.

Netlify prend en charge les Server Actions via son adaptateur OpenNext sans ancien flag expérimental. Aucun `allowedOrigins` large, clé de chiffrement Server Actions stable ou élargissement de taille de corps n'est ajouté pour 002. La preview Netlify, les cookies derrière CDN, l'isolation `private, no-store`, le comportement d'un onglet conservé entre deux déploiements et le risque de 429 lié à une sortie partagée restent des gates de déploiement, pas des propriétés prétendues par les seuls tests locaux. Pour la galerie, le budget reproductible utilise neuf objets de 1 Mio : au plus deux requêtes/2 Mio dans les cinq secondes suivant `load` sans défilement à 320 × 800 px, puis au plus neuf invocations/9 Mio pour une consultation complète sans doublon, soit 9 000 invocations/9 000 Mio pour 1 000 consultations. La preview compare ce budget aux quotas Netlify officiels alors en vigueur avant toute validation.

## Domaines, DNS et HTTPS

L'origine canonique unique est `https://knailsbeauty.fr`, sans `www`. Netlify conserve `knailsbeauty.fr` comme domaine principal et rattache `www.knailsbeauty.fr`, `knailsbeauty.com` et `www.knailsbeauty.com` comme alias ; le domaine `.com` a un rôle exclusivement redirecteur. Le nom technique `friendly-cactus-227b77.netlify.app` reste accessible uniquement comme point d'entrée redirecteur.

Les zones restent administrées chez OVH afin de préserver leurs autres enregistrements. Aucune zone Netlify DNS non déléguée n'est conservée. Pour chacun des apex `.fr` et `.com`, l'unique enregistrement web `A` pointe vers le load balancer Netlify `75.2.60.5` ; chaque hôte `www` est un `CNAME` vers `friendly-cactus-227b77.netlify.app`. Tout ancien enregistrement web concurrent doit être retiré, sans toucher aux enregistrements de messagerie ou de vérification non concernés. Après propagation, Netlify provisionne automatiquement un certificat pour le domaine principal et chaque alias HTTPS.

`netlify.toml` déclare explicitement les neuf entrées non canoniques : HTTP sur l'apex `.fr`, HTTP et HTTPS sur `www` `.fr`, HTTP et HTTPS sur les apex et `www` `.com`, puis HTTP et HTTPS sur l'hôte technique. Elles répondent toutes par une redirection `301` vers `https://knailsbeauty.fr/:splat`. Le placeholder conserve le chemin et Netlify transmet automatiquement les paramètres de requête avec une redirection 301. Aucune règle ne prend `https://knailsbeauty.fr` comme origine, ce qui exclut une boucle canonique.

## Rollback applicatif et restauration des données

Un rollback Netlify et une restauration Supabase sont deux opérations indépendantes. Publier un ancien deploy Netlify remplace atomiquement le code et les artefacts servis, mais ne revient sur aucune migration, ligne de base, identité Auth ou image Storage. Une panne applicative sans corruption de données ne justifie donc jamais une restauration Supabase.

Avant tout rollback Netlify :

1. consigner le SHA, le deploy ID et l'heure du deploy actuellement publié, puis identifier un ancien deploy de production `ready` par son permalink immuable ;
2. arrêter temporairement l'auto-publication si un nouveau deploy Git risque d'écraser le rollback ;
3. vérifier que l'ancien deploy est lui-même validé, lié à un SHA connu, que ses variables obligatoires existent encore et qu'il cible le même projet Supabase de production ;
4. comparer ses contrats de tables, colonnes, fonctions, RLS et Storage au schéma déjà migré. Une migration appliquée n'est jamais annulée automatiquement ; si l'ancien code dépend d'un contrat supprimé ou modifié de manière incompatible, refuser le rollback et livrer un roll-forward ;
5. publier l'ancien deploy depuis sa page avec `Publish deploy`, sans rebuild, puis rejouer immédiatement le smoke HTTPS, pages publiques, Contact, Auth, données, image, sitemap, robots et `noindex` admin ;
6. conserver le deploy stable verrouillé seulement pendant l'incident, préparer le correctif forward, puis réactiver l'auto-publication sous contrôle.

La restauration Supabase est réservée à une corruption ou perte de données confirmée et exige une décision distincte. Avant une opération importante, produire un export logique chiffré hors dépôt et conserver séparément les originaux de la galerie. Sur l'offre Free, ne pas supposer qu'un backup téléchargeable ou un PITR est disponible. Tester d'abord l'export sur la pile locale ou un projet jetable, vérifier migrations, contraintes, RLS, Auth, inventaires et totaux, puis réimporter séparément les octets Storage : un backup PostgreSQL contient leurs métadonnées, pas les fichiers. Une restauration de production exige une fenêtre de maintenance, une sauvegarde juste avant intervention, l'approbation du responsable et une recette complète après reprise ; elle n'est jamais exécutée comme simple exercice.

Un exercice non destructif s'arrête avant `Publish deploy` dès qu'un prérequis échoue. Le résultat peut donc réussir en démontrant que la procédure refuse correctement une cible non validée ou incompatible, sans faire régresser la production et sans toucher à Supabase. La restauration locale/jetable complète et ses digests sont traités séparément par la recette de reprise finale.

## Déploiement prévu

1. Stocker le projet dans un dépôt GitHub.
2. Importer le dépôt dans Netlify.
3. Laisser Netlify détecter et construire l'application Next.js.
4. Configurer par contexte les variables Supabase et le secret serveur de confirmation dans Netlify ; production conserve sa cible, Deploy Preview et branch deploy utilisent `knails-preview`.
5. Activer la détection Netlify Forms, détecter `contact` et `contact-preview`, configurer pour chacun un hook e-mail borné au formulaire, puis vérifier la garde Edge, le classement anti-spam, le `Reply-To` et la notification de test sur une Deploy Preview GitHub du SHA candidat.
6. Vérifier la connexion, les opérations d'administration et l'affichage des images.
7. Rattacher les quatre domaines de production à Netlify, remplacer uniquement les enregistrements web OVH des apex et `www`, attendre la propagation et l'émission des certificats, puis prouver toute la matrice HTTP/HTTPS, chemin et paramètres inclus, sans boucle.

## Évolution possible

Si les limites gratuites deviennent insuffisantes :

- passer à Netlify Personal ou Pro, ou migrer vers un hébergement compatible Next.js ;
- passer à Supabase Pro pour davantage de stockage, de trafic et des sauvegardes ;
- déplacer les images vers Cloudinary si des transformations avancées deviennent nécessaires.

## Références

- [Netlify Free](https://www.netlify.com/pricing/)
- [Prise en charge de Next.js par Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [Netlify Forms avec OpenNext](https://opennext.js.org/netlify/forms)
- [Configuration de Netlify Forms](https://docs.netlify.com/manage/forms/setup/)
- [Filtres anti-spam Netlify Forms](https://docs.netlify.com/manage/forms/spam-filters/)
- [Notifications Netlify Forms](https://docs.netlify.com/manage/forms/notifications/)
- [Usage et facturation de Netlify Forms](https://docs.netlify.com/manage/forms/usage-and-billing/)
- [Fonctionnement des crédits Netlify](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- [Configuration DNS externe Netlify](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/)
- [Options de redirection Netlify](https://docs.netlify.com/manage/routing/redirects/redirect-options/)
- [Dépannage des certificats Netlify](https://docs.netlify.com/manage/domains/troubleshooting/troubleshoot-ssl-and-https/)
- [Gestion des deploys et rollbacks Netlify](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/)
- [Tarifs Supabase](https://supabase.com/pricing)
- [Sauvegardes de base Supabase](https://supabase.com/docs/guides/platform/backups)
- [Guide Next.js et Supabase Auth](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [Règles d'utilisation de Vercel Hobby](https://vercel.com/docs/limits/fair-use-guidelines)
