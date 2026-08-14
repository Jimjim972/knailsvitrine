# Système de design du MVP

## 1. Statut et rôle du document

Ce document décrit le design réellement présent dans le frontend Next.js du site K'nails Beauty Institut. Il constitue la source de vérité visuelle pour préserver la cohérence du site pendant l'ajout du backend et de l'espace d'administration.

Il distingue :

- **l'existant**, directement observé dans les composants et `app/globals.css` ;
- **les règles d'extension**, à suivre pour les nouvelles interfaces du MVP ;
- **les écarts connus**, qui devront être corrigés avant la mise en production.

Les règles fonctionnelles restent définies dans [spec.md](./spec.md), l'organisation technique dans [architecture.md](./architecture.md) et l'hébergement dans [infra.md](./infra.md).

## 2. Sources analysées

Le document est dérivé des fichiers suivants :

- `app/layout.tsx` ;
- `app/page.tsx` ;
- `app/services/page.tsx` ;
- `app/galerie/page.tsx` ;
- `app/contact/page.tsx` ;
- `app/globals.css` ;
- `components/header.tsx` ;
- `components/footer.tsx` ;
- `components/page-heading.tsx` ;
- `components/service-section.tsx` ;
- `components/contact-form.tsx` ;
- les images présentes dans `public/images/`.

## 3. Direction artistique

### 3.1 Positionnement

L'identité visuelle exprime un institut de beauté premium, doux et accessible. Elle associe :

- une esthétique éditoriale grâce aux grands titres serif ;
- une atmosphère féminine fondée sur le rose poudré et le prune ;
- une touche luxueuse grâce aux accents dorés ;
- des surfaces lumineuses, des bordures fines et des ombres très douces ;
- des photographies de manucure, de soins et d'ambiance comme éléments visuels principaux.

Le design doit rester élégant et chaleureux. Il ne doit pas devenir clinique, très sombre, chargé, néon ou excessivement animé.

### 3.2 Principes visuels

1. **Le contenu reste lisible avant d'être décoratif.** Les textes utilisent des couleurs foncées et les effets restent subtils.
2. **La photographie porte l'émotion.** Les grandes images sont utilisées pour présenter les univers de service et les réalisations.
3. **La hiérarchie est éditoriale.** Playfair Display structure les titres tandis que Manrope porte les informations et les actions.
4. **Le luxe est discret.** L'or apparaît sur les détails, séparateurs, badges et liens, jamais comme grande surface dominante.
5. **Les formes sont douces.** Cartes arrondies, boutons pilules et ombres faibles créent une interface accueillante.
6. **Le mobile est une présentation complète.** Les informations qui dépendent du survol sur ordinateur doivent rester visibles ou accessibles sur écran tactile.

## 4. Couleurs

### 4.1 Tokens existants

| Token CSS | Valeur | Usage actuel |
| --- | --- | --- |
| `--background` | `#f9f9f9` | Fond général du site et fond translucide du header |
| `--surface` | `#ffffff` | Cartes, panneaux et surfaces principales |
| `--surface-soft` | `#f3f3f4` | Footer et section sociale |
| `--blush` | `#fff0f3` | Champs de formulaire et dégradés rosés |
| `--blush-strong` | `#f9c5d1` | Accent rose renforcé et états de navigation |
| `--primary` | `#7b535e` | Marque, grands titres, boutons et liens principaux |
| `--primary-dark` | `#613c46` | Variante prune foncée disponible |
| `--tertiary` | `#9d3a6b` | Survol du bouton principal et accent framboise |
| `--gold` | `#775a19` | Petits titres, détails, liens et états secondaires |
| `--gold-light` | `#c5a059` | Bordures, soulignements et focus |
| `--ink` | `#1a1c1c` | Texte principal |
| `--muted` | `#504446` | Texte secondaire et informations pratiques |
| `--line` | `rgba(119, 90, 25, 0.23)` | Bordures et séparateurs fins |

### 4.2 Règles d'utilisation

- Utiliser `--ink` pour les contenus importants et `--muted` pour le texte secondaire.
- Utiliser `--primary` pour l'identité, les titres majeurs et l'action principale.
- Réserver `--tertiary` aux interactions ou accents ponctuels.
- Utiliser `--gold` pour du texte seulement lorsque le contraste est suffisant.
- Utiliser `--gold-light` principalement pour les bordures, décorations et anneaux de focus ; il est trop clair pour du petit texte sur fond blanc sans vérification de contraste.
- Conserver des fonds majoritairement clairs et neutres.
- Ne pas ajouter de couleur saturée ou de dégradé multicolore sans faire évoluer explicitement le système de design.
- Ne pas utiliser la couleur comme seul moyen d'indiquer une erreur, un succès, un statut actif ou une sélection.

### 4.3 Couleurs d'état de l'administration

Les tokens suivants sont implémentés comme variables CSS pour les états d'authentification et seront réutilisés par le futur CRUD :

| Rôle | Texte | Fond | Usage |
| --- | --- | --- | --- |
| Succès | `#2f6b4f` | `#eaf6ef` | Enregistrement réussi, élément actif |
| Erreur | `#8a3040` | `#fae9ed` | Validation invalide, suppression échouée |
| Avertissement | `#5d4201` | `#fed488` | Confirmation et action à risque |
| Information | `#613c46` | `#fff0f3` | Aide contextuelle et état neutre |

Le focus administratif utilise `--gold`, suffisamment contrasté, et non `--gold-light`. Éviter les valeurs dispersées dans les composants.

## 5. Typographie

### 5.1 Familles existantes

| Rôle | Police | Source | Fallback |
| --- | --- | --- | --- |
| Texte et interface | Manrope | `next/font/google` | `sans-serif` |
| Titres éditoriaux | Playfair Display | `next/font/google` | Georgia, `serif` |

Les deux polices utilisent `display: swap` et sont exposées par les variables `--font-manrope` et `--font-playfair`.

### 5.2 Hiérarchie existante

| Élément | Police | Taille observée | Graisse et traitement |
| --- | --- | --- | --- |
| Marque du header | Playfair Display | `clamp(1.55rem, 2.4vw, 2.7rem)` | 500, interlettrage `-0.02em` |
| Titre de page `h1` | Playfair Display | `clamp(2.7rem, 5vw, 4rem)` | 600, interlettrage `-0.03em` |
| Titre de section | Playfair Display | `clamp(2rem, 3.4vw, 2.65rem)` | 500 |
| Titre de section sociale | Playfair Display | `clamp(2.4rem, 4vw, 3.3rem)` | 600 |
| Titre de panneau | Playfair Display | `2rem` | 500 |
| Titre de carte | Manrope | Environ `1.12rem` | Graisse par défaut ou forte selon le contexte |
| Corps introductif | Manrope | `1.1rem` | Interligne `1.7` |
| Corps de carte | Manrope | `0.94rem` | Interligne `1.55` |
| Eyebrow et label | Manrope | `0.62rem` à `0.75rem` | 700, capitales, interlettrage large |
| Footer | Manrope | `0.82rem` à `1rem` | Hiérarchie compacte |

Sur mobile, le `h1` utilise `clamp(2.45rem, 12vw, 3.2rem)` et le texte introductif revient à `1rem`.

### 5.3 Règles d'extension

- Utiliser Playfair Display pour les titres de marque, de page et de grandes sections publiques.
- Utiliser Manrope pour les formulaires, tableaux, boutons, filtres, messages et toute l'administration.
- Ne pas utiliser Playfair Display pour des données denses ou de petits contrôles.
- Garder les labels en capitales uniquement pour les éléments courts.
- Conserver un interligne d'au moins `1.5` pour les paragraphes.
- Limiter les lignes de texte à une largeur lisible, autour de 60 à 75 caractères.

## 6. Grille, largeur et espacements

### 6.1 Conteneur principal

Le token `--content-width` vaut `1200px`.

Le conteneur `.content-shell` utilise :

- sur ordinateur : `min(calc(100% - 128px), 1200px)`, soit 64 px de gouttière de chaque côté ;
- sur mobile : `min(calc(100% - 40px), 1200px)`, soit 20 px de gouttière de chaque côté.

Les nouvelles pages publiques doivent réutiliser ce conteneur afin de rester alignées avec les services, la galerie et le footer.

### 6.2 Rythme vertical

Le frontend utilise un rythme généreux :

- header principal proche de 86 px sur ordinateur et 74 px sur mobile ;
- début du contenu à 142 px sur ordinateur et 112 px sur mobile pour compenser le header fixe ;
- introduction séparée du contenu par 88 px sur ordinateur et 60 px sur mobile ;
- sections de services séparées par 104 px sur ordinateur et 80 px sur mobile ;
- footer avec 64 px de marge intérieure supérieure sur ordinateur et 52 px sur mobile.

Pour les nouveaux écrans publics, privilégier les espacements existants : 8, 12, 16, 22, 24, 28, 32, 44, 56, 80 et 104 px. Ne pas multiplier les valeurs uniques sans raison.

L'administration pourra utiliser un rythme plus compact, tout en conservant au moins 16 à 24 px entre les groupes de champs et 24 à 32 px entre les sections.

### 6.3 Breakpoints existants

| Plage | Comportement |
| --- | --- |
| Plus de 1080 px | Navigation complète, grandes grilles et disposition desktop |
| 761 à 1080 px | Navigation compacte, services rééquilibrés, cartes de service empilées intérieurement |
| 760 px et moins | Menu mobile, grilles sur une colonne, galerie simplifiée et footer empilé |

Les vérifications doivent aussi être effectuées à 320/375 px, 768 px, 1 024 px et 1 440 px, même si les media queries principales restent 760 et 1080 px.

## 7. Formes, bordures et profondeur

### 7.1 Rayons

| Usage | Rayon actuel |
| --- | --- |
| Cartes principales, photos et panneaux | `14px` |
| Cartes sociales et bouton de formulaire | `10px` |
| Champs de formulaire | `9px 9px 0 0` |
| Message de succès | `9px` |
| Boutons, badges et liens d'action | `999px` |
| Logo et bouton de menu | `50%` |

Les nouveaux composants doivent réutiliser ces familles de rayons. Les cartes d'administration utiliseront principalement 10 ou 14 px ; les badges et filtres courts utiliseront la forme pilule.

### 7.2 Bordures

- Les bordures sont fines, généralement `1px`.
- La couleur principale est `--line` ou une variante dorée plus transparente.
- Les bordures servent à séparer discrètement et ne doivent pas dominer la composition.
- Un contrôle interactif doit néanmoins avoir un focus visible plus fort qu'une simple bordure décorative.

### 7.3 Ombres

L'ombre générique est :

```css
0 12px 32px rgba(157, 58, 107, 0.07)
```

Les autres ombres restent peu opaques et teintées prune. Les nouvelles ombres doivent conserver cette douceur. Éviter les ombres noires fortes, le neumorphisme et l'empilement de plusieurs effets.

## 8. Composants existants

### 8.1 Header

Le header est fixe, placé au-dessus du contenu avec un `z-index` de 50. Il utilise :

- un fond `#f9f9f9` à 86 % d'opacité ;
- un flou d'arrière-plan de 14 px ;
- une bordure inférieure dorée légère ;
- une ombre très discrète.

Sur ordinateur, il contient :

1. le logo circulaire et la marque à gauche ;
2. les liens Services, Galerie et Contact au centre ;
3. le bouton principal « Réserver » à droite.

Le lien actif est présenté sur un fond rose léger, en gras, avec un soulignement doré. Sur mobile, la navigation desktop et le CTA disparaissent au profit d'un bouton circulaire et d'un menu vertical sous le header.

Règles d'extension :

- conserver une cible tactile minimale de 44 × 44 px ;
- fermer le menu après navigation ;
- maintenir `aria-expanded` et un nom accessible dynamique ;
- ne pas ajouter de contenu qui augmente fortement la hauteur du header ;
- ajouter un vrai style `:focus-visible` aux liens et au bouton de menu.

### 8.2 Bouton principal

Le bouton `.primary-button` est une pilule prune avec texte blanc, graisse 700 et ombre douce. Son survol devient framboise, monte de 2 px et reçoit une ombre légèrement plus forte.

Variantes à prévoir pour l'administration :

- primaire : sauvegarder ou confirmer ;
- secondaire : bordure prune ou dorée sur fond transparent ;
- discrète : action de moindre importance sans ombre ;
- destructive : couleur d'erreur, toujours accompagnée d'un libellé explicite.

Un seul bouton primaire doit dominer une zone d'action.

### 8.3 En-tête de page

`PageHeading` est un composant centré de largeur maximale 760 px comprenant :

- un `h1` Playfair Display prune ;
- une description Manrope secondaire ;
- une grande marge sous l'introduction.

Il doit rester la structure commune des pages publiques principales.

### 8.4 Section de prestations

Chaque `ServiceSection` comporte :

- un eyebrow doré en capitales ;
- un titre serif ;
- un séparateur fin ;
- une grande image avec légende en dégradé rose ;
- une liste de cartes de prestations.

La grille desktop alterne l'image à gauche ou à droite. Sur mobile, toutes les sections passent en colonne avec l'image avant la liste.

La présentation visuelle dédiée des trois catégories initiales reste définie dans le code :

- Onglerie & Manucure ;
- Soins du Corps ;
- Esthétique & Visage.

Une catégorie créée depuis l’administration réutilise le même composant `ServiceSection`, le nom saisi comme titre et l’univers générique de l’institut (`salon-interior.jpg`, eyebrow « Notre savoir-faire », légende neutre). Elle n’est pas rendue publiquement tant qu’elle ne contient aucune prestation active. L’alternance image/liste est recalculée sur les seules sections effectivement affichées.

### 8.5 Carte de prestation

La carte blanche utilise une grille avec le contenu à gauche et les informations commerciales à droite. Elle peut contenir :

- un badge facultatif ;
- le nom ;
- une description ;
- le prix ;
- la durée ;
- un lien « Réserver » vers la page de contact.

Le badge est une pilule ambrée. Une carte avec badge reçoit davantage d'espace supérieur. Au survol, la carte monte de 3 px et reçoit l'ombre générique.

Pour les données administrables :

- le contenu variable ne doit pas casser la grille ;
- les noms trop longs doivent revenir à la ligne ;
- l'absence de durée ne doit pas laisser un espace vide incohérent ;
- « prix fixe », « à partir de » et « sur devis » doivent partager une hiérarchie visuelle commune ;
- le badge reste court et ne remplace pas le nom de la prestation.

### 8.6 Galerie principale

Sur ordinateur, la galerie utilise une grille de 12 colonnes avec des lignes de 300 px et un écart de 24 px.

| Variante | Occupation actuelle |
| --- | --- |
| `featured` | 8 colonnes et 2 lignes |
| `small` | 4 colonnes |
| `wide_small` | 5 colonnes |
| `wide_large` | 7 colonnes |

Les photos utilisent `object-fit: cover`. Au survol, elles effectuent un zoom de 1,055 sur 700 ms. Un dégradé sombre et une légende apparaissent en fondu.

Sur mobile :

- toutes les variantes passent sur une colonne ;
- les lignes mesurent environ 290 px ;
- l'élément mis en avant atteint au moins 430 px ;
- le voile et la légende restent visibles sans survol.

Une photo administrée doit conserver une variante valide. L'ordre et la combinaison des variantes doivent produire une grille complète ; sinon, la mise en page doit retomber proprement sur une carte standard.

### 8.7 Journal social

La section sociale est séparée par un fond gris doux enrichi de deux dégradés radiaux rose et doré. Elle contient :

- un grand titre serif ;
- une phrase accompagnée d'un cœur ;
- un lien Instagram souligné ;
- quatre images carrées en grille.

La grille passe de quatre à deux colonnes sur mobile. Les cartes montrent un voile au survol.

Le lien et le nom de compte actuels sont des valeurs temporaires. Toute intégration réelle doit utiliser l'URL officielle de l'institut.

### 8.8 Contact

La page Contact utilise une grille 7/5 :

- à gauche, un panneau de formulaire rosé, translucide et légèrement flouté ;
- à droite, une carte d'informations pratiques et une carte illustrée.

Le formulaire utilise des labels courts en capitales, des champs rose poudré et un focus doré. Le bouton d'envoi occupe toute la largeur.

Sur mobile, les deux colonnes et la rangée nom/téléphone passent sur une seule colonne.

Le message de succès actuel est uniquement simulé. Le design final doit prévoir quatre états distincts :

- neutre ;
- envoi en cours ;
- succès réel ;
- erreur avec action possible.

### 8.9 Informations pratiques et carte

La carte d'informations utilise une surface blanche, une bordure dorée légère et l'ombre générique. Chaque information est organisée en deux colonnes : symbole puis contenu.

La carte géographique actuelle est une image statique teintée prune. Une future carte interactive n'est pas nécessaire au MVP ; un lien externe vers l'itinéraire peut suffire.

### 8.10 Footer

Le footer repose sur un fond gris doux et une grille de quatre colonnes : marque, exploration, contact et horaires. La grille passe à deux colonnes sous 1080 px puis à une colonne sous 760 px.

Les liens sont soulignés d'un trait doré transparent et deviennent dorés au survol. Le copyright est séparé par une bordure supérieure.

## 9. Mouvement et interactions

### 9.1 Durées existantes

| Interaction | Durée |
| --- | --- |
| Navigation, boutons et champs | 180 ms |
| Cartes de prestations | 220 ms |
| Voiles et légendes de galerie | 300 ms |
| Zoom des photographies | 700 ms avec courbe douce |

### 9.2 Règles

- Les micro-interactions standard restent entre 150 et 300 ms.
- Les transitions photographiques peuvent être plus lentes, autour de 700 ms.
- Un survol ne doit pas déplacer le contenu environnant.
- Les actions doivent donner un retour immédiat par couleur, état de chargement ou message.
- Les interactions essentielles ne doivent jamais dépendre uniquement du survol.
- Le comportement `prefers-reduced-motion: reduce` existant doit être conservé pour désactiver pratiquement transitions et animations.

## 10. Images et identité photographique

### 10.1 Inventaire actuel

| Asset | Rôle actuel |
| --- | --- |
| `knails-logo.png` | Logo circulaire du header |
| `nails-signature.jpg` | Univers onglerie et photo principale de galerie |
| `spa-massage.jpg` | Univers soins du corps |
| `skincare.jpg` | Univers esthétique et visage |
| `french-manucure.jpg` | Galerie |
| `salon-interior.jpg` | Galerie et ambiance de l'institut |
| `manicure-tools.jpg` | Galerie et outils |
| `botanical-nail-art.jpg` | Galerie et nail art |
| `berry-coffee.jpg` | Journal social |
| `matte-blush-nail.jpg` | Journal social |
| `spa-products.jpg` | Journal social |
| `berry-manicure.jpg` | Journal social |
| `map-paris.jpg` | Illustration de localisation temporaire |

### 10.2 Direction photographique

- lumière douce et naturelle ;
- tons rose poudré, beige, crème, prune et or ;
- cadrages rapprochés sur les gestes, résultats et matières ;
- arrière-plans propres et peu chargés ;
- cohérence de température et d'exposition entre les photos ;
- aucune photographie étirée ou déformée.

### 10.3 Règles pour les futurs uploads

- formats entrants fixes JPEG, PNG ou WebP ; APNG et WebP animé refusés ;
- conversion obligatoire en WebP pour chaque nouvel ajout ou remplacement ;
- conservation du canal alpha visible de la source, vérifiée sur la fixture RGBA versionnée de 25 positions avec alpha 0/255 exact et tolérance ±1 pour les valeurs intermédiaires, sans exigence sur les composantes RGB cachées sous alpha nul ;
- conversion des pixels en sRGB avant retrait des profils et autres métadonnées intégrées ;
- côté le plus long limité à 1 600 px, sans agrandissement ;
- qualités successives 0,85, 0,80 et 0,75, puis réduction des dimensions sans descendre sous 1 200 px pour un original qui atteint cette dimension ;
- poids final maximal de 1 Mio ;
- poids cible de 150 à 400 Ko ;
- dimensions enregistrées en base ;
- texte alternatif obligatoire ;
- cadrage vérifié dans chaque variante de galerie ;
- contenu important éloigné des bords susceptibles d'être rognés par `object-fit: cover`.

Le logo actuel pèse nettement plus lourd que les autres assets et devra être optimisé avant la production sans dégrader sa netteté.

## 11. Ton éditorial

Le contenu existant emploie un ton :

- élégant ;
- rassurant ;
- sensoriel ;
- expert sans être technique ;
- orienté vers le soin et l'expérience.

Exemples de vocabulaire cohérent : « signature », « sur-mesure », « éclat », « premium », « rituel », « sublimer » et « parenthèse de bien-être ».

Règles :

- écrire les textes visibles en français ;
- privilégier des phrases courtes et précises ;
- ne pas multiplier les superlatifs ;
- présenter clairement prix et durée ;
- employer « Réserver » comme appel à l'action uniquement si le parcours mène clairement vers une prise de contact ou une réservation ;
- éviter le jargon technique non expliqué.

## 12. Extension du design à l'administration

L'authentification et l'accueil administratif minimal prolongent la marque sans reproduire la mise en scène éditoriale du site public. Les règles CRUD ci-dessous restent la cible des prochaines fonctionnalités.

### 12.1 Principes

- utiliser Manrope pour l'ensemble de l'interface de gestion ;
- réserver Playfair Display au titre principal de l'administration ;
- conserver le fond clair, les surfaces blanches, le prune et les détails dorés ;
- réduire les grands espaces afin d'améliorer l'efficacité ;
- privilégier la clarté des statuts et des actions à la décoration ;
- rendre toutes les opérations réalisables sur mobile.

### 12.2 Structure recommandée

L'espace `/admin` livré dans 002 comporte :

- une barre supérieure avec la marque, le contexte « Administration » et la déconnexion ;
- un accueil protégé minimal sans navigation Prestations/Galerie factice ;
- une page `/admin/connexion` autonome, sans Header/Footer publics, avec une carte de largeur contenue ;
- une zone de contenu d'une largeur maximale cohérente avec `--content-width` ;
- une zone persistante ou clairement visible pour les messages de réussite et d'erreur.

La navigation Tableau de bord, Prestations et Galerie ainsi que les tableaux adaptatifs ne sont ajoutés que lorsque leurs routes deviennent fonctionnelles. Une déconnexion distante non confirmée reste visible et réessayable dans son formulaire sans annoncer de succès.

### 12.3 Listes de gestion

Sur ordinateur, une présentation tabulaire peut afficher :

- nom ou miniature ;
- catégorie ou variante ;
- ordre ;
- statut ;
- actions.

Sur mobile, chaque ligne doit devenir une carte lisible. Les actions doivent conserver un libellé ou un nom accessible et ne pas reposer uniquement sur une icône.

La liste galerie affiche au plus 100 photos par page. À partir de la 101e, elle montre des contrôles précédent/suivant, le numéro de page et le total sans modifier l'ordre des éléments. Chaque photo affiche séparément son intention « Active » ou « Masquée » et son état de fichier « Prête », « En cours » ou « À réparer » ; ni l'un ni l'autre ne dépend uniquement de la couleur. Une miniature absente affiche le statut textuel « Fichier indisponible » et un contrôle « Vérifier » ; après contrôle serveur, elle conduit vers l'état « À réparer » sans lancer automatiquement une mutation par fichier absent. Aucun chemin technique ni URL Storage n'est présenté. Les miniatures et images publiques utilisent des adresses applicatives par identifiant et gardent exactement les mêmes dimensions, cadrages et états visuels que le design documenté.

### 12.4 Formulaires d'administration

- regrouper les champs par sujet ;
- placer les labels au-dessus des champs ;
- indiquer les champs obligatoires ;
- afficher l'erreur sous le champ correspondant ;
- conserver les valeurs après une erreur récupérable ;
- placer le focus initial sur le champ « Nom » à l'ouverture d'un formulaire de création ou de modification ;
- placer l'action principale en fin de formulaire ;
- séparer visuellement les actions destructrices ;
- prévisualiser une image avant l'envoi ;
- afficher la taille, le format et les dimensions après traitement.

La page Prestations présente deux actions adjacentes : « Nouvelle catégorie » en style secondaire et « Nouvelle prestation » en style principal. Elles passent sur toute la largeur et s’empilent sous 760 px. Le formulaire de catégorie reprend les mêmes champs, erreurs, annonces, état pending et actions Annuler/Créer que les autres formulaires administratifs. Le formulaire de prestation propose un lien textuel « Créer une nouvelle catégorie » sous son sélecteur ; s’il n’existe aucune catégorie, le sélecteur et la soumission restent désactivés avec une consigne explicite.

### 12.5 États requis

Chaque écran de gestion doit définir :

- chargement initial ;
- liste vide avec prochaine action claire ;
- données chargées ;
- soumission en cours ;
- succès ;
- erreur récupérable ;
- session expirée ;
- opération de fichier en cours ;
- fichier indisponible et état « À réparer » avec une action sûre ;
- confirmation de suppression.

## 13. Accessibilité

### 13.1 Éléments déjà présents

- langue du document définie à `fr` ;
- labels visibles dans le formulaire ;
- noms accessibles sur les navigations ;
- `aria-expanded` sur le menu mobile ;
- textes alternatifs sur les images informatives ;
- images décoratives marquées par un alt vide ou `aria-hidden` ;
- message actuel du formulaire avec `role="status"` ;
- prise en charge de `prefers-reduced-motion`.

### 13.2 Règles obligatoires pour la suite

- ajouter un style global `:focus-visible` clairement contrasté pour liens, boutons et contrôles, avec le même repli `:focus` dans l’administration afin que WebKit conserve un anneau doré lorsque sa détection de modalité clavier n’active pas `:focus-visible` ;
- garantir une cible tactile d'au moins 44 × 44 px ;
- vérifier un contraste d'au moins 4,5:1 pour le texte normal ;
- associer les erreurs aux champs avec des identifiants et attributs appropriés ;
- ne pas rendre une information essentielle visible uniquement au survol ;
- conserver un ordre de tabulation logique ;
- annoncer les changements asynchrones importants ;
- donner un titre accessible aux dialogues de confirmation ;
- ne pas utiliser uniquement une icône pour une action destructive ou ambiguë.

## 14. Contenus temporaires et incohérences connues

Les éléments suivants appartiennent au prototype et ne doivent pas être considérés comme des données finales :

- le formulaire Contact affiche actuellement un faux succès sans envoyer de message ;
- le lien Instagram pointe vers la page générique `instagram.com` ;
- le compte `@knails_institut` doit être confirmé ;
- l'adresse de la page Contact et celle du footer sont formulées différemment ;
- les horaires de la page Contact et ceux du footer se contredisent ;
- le téléphone est une valeur de démonstration ;
- `map-paris.jpg` et les références à Paris doivent être remplacés si l'institut se situe ailleurs ;
- la racine `/` redirige directement vers `/services` et ne possède pas de page d'accueil dédiée ;
- le CTA « Réserver » mène vers le contact et non vers une réservation en ligne ;
- certaines légendes de galerie sont révélées uniquement au survol sur ordinateur ; leur accessibilité clavier doit être améliorée ;
- plusieurs symboles typographiques sont utilisés comme icônes (`☰`, `×`, `♥`, `⌖`, `☎`, `◷`) sans système d'icônes homogène.

Ces écarts doivent être traités dans les futures spécifications fonctionnelles appropriées. Ne pas inventer les coordonnées finales.

## 15. Règles de préservation

Lorsqu'une fonctionnalité est ajoutée :

- réutiliser les tokens CSS existants avant de créer une nouvelle valeur ;
- conserver les deux familles typographiques ;
- aligner les contenus sur `.content-shell` ;
- conserver les breakpoints principaux de 1080 et 760 px sauf besoin démontré ;
- utiliser les rayons 10, 14 ou pilule ;
- conserver des ombres douces teintées prune ;
- ne pas introduire de dark mode dans le MVP ;
- ne pas ajouter d'animations décoratives longues ;
- éviter les emojis comme icônes et préférer un ensemble SVG cohérent pour les nouveaux composants ;
- ne pas modifier le design public pour faciliter l'administration ; adapter les données au composant ou faire évoluer le composant de manière contrôlée ;
- documenter toute nouvelle variante ou tout nouveau token dans ce fichier.

## 16. Contrôle qualité visuel

Avant de considérer une interface terminée, vérifier :

- absence de débordement horizontal à 320/375 px ;
- rendu cohérent à 768, 1 024 et 1 440 px ;
- aucun contenu masqué sous le header fixe ;
- hiérarchie des titres cohérente ;
- texte courant suffisamment contrasté ;
- focus visible sur toutes les actions ;
- interactions utilisables au clavier et sur écran tactile ;
- parcours critique contrôlé manuellement sur Safari mobile réel et Firefox, avec annonce des états vérifiée par une technologie d'assistance disponible ;
- aucun décalage de mise en page provoqué par les images ;
- `sizes` adapté pour chaque image responsive ;
- survols sans déplacement du contenu voisin ;
- réduction des mouvements respectée ;
- états vide, chargement, succès et erreur présents dans l'administration ;
- textes réels validés à la place des contenus temporaires ;
- cohérence visuelle avec les pages Services, Galerie et Contact existantes.

## 17. Résumé exécutable

Pour prolonger le frontend sans casser son identité :

```text
Fond clair + surfaces blanches
Prune pour la marque et les actions
Or pour les détails
Playfair Display pour l'éditorial
Manrope pour l'interface
Contenu limité à 1200 px
Cartes de 14 px et ombres douces
Transitions courtes, photos plus lentes
Desktop éditorial, mobile sur une colonne
Accessibilité et états complets pour chaque nouvelle fonctionnalité
```
