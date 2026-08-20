# Contract: SEO et découverte

## Pages canoniques

| Chemin | Titre | Description | Canonical |
| --- | --- | --- | --- |
| `/services` | unique et centré prestations | unique et fidèle aux prestations visibles | origine officielle + `/services` |
| `/galerie` | unique et centré réalisations | unique et fidèle aux photos actives/prêtes | origine officielle + `/galerie` |
| `/contact` | unique et centré contact/institut | unique et fidèle aux moyens réellement disponibles | origine officielle + `/contact` |

Chaque page fournit HTML initial, titre, description, canonical absolu et Open Graph cohérent. L'image sociale n'est publiée qu'après validation de l'asset final.

## Origine

La constante `https://knailsbeauty.fr` est l'unique source des URLs SEO. En production, la variable système Netlify `URL` doit lui être strictement égale. Une requête, `www`, `knailsbeauty.com`, `www.knailsbeauty.com`, une preview, un alias de deploy ou `DEPLOY_PRIME_URL` ne peut pas modifier la canonical.

## Sitemap

En production, `/sitemap.xml` contient exactement :

1. `/services`
2. `/galerie`
3. `/contact`

Sont exclus : `/` qui redirige, tout `/admin`, login, Server Actions, routes privées d'images, blueprint Forms, URLs techniques et previews. Hors production, aucun sitemap canonique exploitable n'est publié et la liste est vide.

## Robots

Production :

- pages publiques autorisées ;
- `/admin` exclu de l'exploration ;
- sitemap canonique référencé ;
- absence de `X-Robots-Tag: noindex` sur le domaine public.

Preview/branch/local :

- meta `noindex, nofollow` ;
- robots `Disallow: /` ;
- aucun sitemap canonique ;
- en Deploy Preview, header Netlify `X-Robots-Tag: noindex` attendu en défense additionnelle.

Administration, y compris login :

- meta propre `noindex, nofollow` dans tous les contextes ;
- absence du sitemap ;
- autorisation applicative maintenue indépendamment du SEO.

## Données structurées

Le JSON-LD utilise un type LocalBusiness compatible avec l'activité de beauté et ne contient que :

- nom confirmé ;
- URL canonique ;
- adresse visible confirmée ;
- horaires visibles confirmés ;
- téléphone, image et réseaux seulement après confirmation.

Le téléphone de démonstration actuel est supprimé avant production. Toute divergence entre JSON-LD et contenu visible échoue.

## Vérifications

Avant promotion, le gate inspecte le HTML et les réponses d'un build local/CI en contexte production simulé ainsi que de la Deploy Preview dans son contexte réel. Après promotion, le smoke répète les assertions sur le domaine canonique réellement servi ; aucune preuve prétendant provenir de la production ne peut être exigée pour autoriser cette même promotion.

Dans chaque contexte applicable, le gate contrôle :

- unicité/présence des métadonnées ;
- URLs absolues HTTPS ;
- contenu exact du sitemap ;
- directives robots/meta/header ;
- absence d'admin et d'origine technique ;
- JSON-LD parseable et sans valeur temporaire ;
- Open Graph utilisant l'asset final.

La validation locale contrôle d'abord la syntaxe et le vocabulaire. Le gate externe soumet ensuite le document au validateur public de référence Schema.org et exige zéro erreur. Si ce service ne retourne pas un résultat vérifiable, la preuve est `blocked`; une validation locale ne peut pas la convertir en réussite.
