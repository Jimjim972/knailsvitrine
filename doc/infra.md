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

Pour limiter la consommation Netlify, les photos seront diffusées directement depuis Supabase Storage.

### Supabase Free

- 500 Mo de base PostgreSQL ;
- 1 Go de stockage de fichiers ;
- 5 Go de trafic sortant et 5 Go de trafic mis en cache ;
- 50 000 utilisateurs actifs mensuels pour l'authentification ;
- mise en pause possible après une semaine sans activité ;
- absence de sauvegardes automatiques sur l'offre gratuite.

Une quarantaine de prestations occupera une quantité négligeable d'espace en base. Les photos constitueront l'essentiel du stockage et du trafic.

## Gestion des photos

Avant l'envoi, les images devront idéalement être :

- redimensionnées à une largeur maximale proche de 1 600 px ;
- converties en WebP ;
- compressées autour de 150 à 400 Ko ;
- accompagnées d'un texte alternatif utile pour l'accessibilité et le référencement.

Avec des fichiers d'environ 300 Ko, le quota de 1 Go permet théoriquement de stocker plusieurs milliers de photos. Une marge doit néanmoins être conservée pour les remplacements et les autres médias.

## Variables d'environnement

Les valeurs suivantes devront être configurées localement et dans Netlify :

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Une clé secrète ou `service_role` ne doit jamais être exposée dans une variable préfixée par `NEXT_PUBLIC_` ni envoyée au navigateur.

## Déploiement prévu

1. Stocker le projet dans un dépôt GitHub.
2. Importer le dépôt dans Netlify.
3. Laisser Netlify détecter et construire l'application Next.js.
4. Configurer les variables d'environnement Supabase dans Netlify.
5. Vérifier la connexion, les opérations d'administration et l'affichage des images.
6. Connecter le domaine personnalisé et activer le HTTPS.

## Évolution possible

Si les limites gratuites deviennent insuffisantes :

- passer à Netlify Personal ou Pro, ou migrer vers un hébergement compatible Next.js ;
- passer à Supabase Pro pour davantage de stockage, de trafic et des sauvegardes ;
- déplacer les images vers Cloudinary si des transformations avancées deviennent nécessaires.

## Références

- [Netlify Free](https://www.netlify.com/pricing/)
- [Prise en charge de Next.js par Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [Tarifs Supabase](https://supabase.com/pricing)
- [Guide Next.js et Supabase Auth](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [Règles d'utilisation de Vercel Hobby](https://vercel.com/docs/limits/fair-use-guidelines)
