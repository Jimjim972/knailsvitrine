# Feature Specification: Préparation complète à la production

**Feature Branch**: `006-production-readiness` *(identifiant de fonctionnalité ; aucune branche Git créée par ce workflow)*

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "006-production-readiness - déploiement Netlify ; variables d’environnement ; SEO, sitemap et robots ; accessibilité ; tests de sécurité ; vérification complète du MVP."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mettre en ligne une version maîtrisée (Priority: P1)

La personne responsable de la livraison peut promouvoir un candidat validé vers le site public avec la bonne configuration, le domaine officiel et le chiffrement actif. Les environnements de prévisualisation et de production restent distincts, et une erreur de configuration bloque la publication au lieu de produire un site partiellement fonctionnel.

**Why this priority**: Le MVP n’apporte aucune valeur commerciale s’il ne peut pas être publié de façon fiable, sûre et reproductible sur l’hébergement retenu.

**Independent Test**: Déployer le candidat en prévisualisation, contrôler l’origine des données, les variables autorisées, la préparation du domaine et du HTTPS, les pages publiques, le refus de l’administration sans session et la procédure de retour arrière. Cette validation rend le candidat autorisable à promouvoir ; la promotion et sa vérification réelle relèvent du parcours intégré de lancement.

**Acceptance Scenarios**:

1. **Given** un candidat issu de la branche de production autorisée, **When** sa prévisualisation représentative est construite, **Then** elle sert exactement cette révision sans modification manuelle du code ou des données et peut être soumise aux gates de promotion.
2. **Given** les contextes prévisualisation et production, **When** leurs configurations sont inspectées, **Then** chaque contexte utilise ses propres valeurs et aucune prévisualisation ne peut modifier les données de production par erreur.
3. **Given** une variable obligatoire absente, vide, invalide ou affectée au mauvais contexte, **When** le candidat est construit ou contrôlé, **Then** la livraison échoue clairement avant toute promotion publique.
4. **Given** le domaine officiel préparé pour le candidat, **When** ses enregistrements, son certificat et ses redirections sont contrôlés avant promotion, **Then** `https://knailsbeauty.fr` est l’unique origine canonique, les variantes `www`, HTTP, `knailsbeauty.com`, `www.knailsbeauty.com` et l’hôte technique convergent définitivement vers elle sans alerte ni boucle, en conservant le chemin et les paramètres.
5. **Given** une régression critique détectée après publication, **When** la procédure de retour arrière est déclenchée, **Then** une version précédemment validée peut être restaurée sans inventer de manipulation de données.

---

### User Story 2 - Refuser une production insuffisamment sécurisée (Priority: P1)

La propriétaire du site sait que les pages administratives, les données masquées, les mutations et les fichiers privés restent inaccessibles aux visiteurs et aux comptes non autorisés. La décision de mise en ligne s’appuie sur des tests exécutés avec les rôles réels et sur l’absence de secret dans les artefacts publics.

**Why this priority**: Une faille d’autorisation, une inscription publique active ou un secret exposé rendrait le MVP impropre à la production, même si les pages publiques semblent fonctionner.

**Independent Test**: Exécuter la matrice visiteur, compte authentifié non-admin et administrateur sur les prestations, catégories, photos, fichiers, sessions et mutations ; scanner ensuite le dépôt, le build, les réponses et les journaux autorisés.

**Acceptance Scenarios**:

1. **Given** un visiteur ou un compte authentifié sans rôle administrateur, **When** il tente une lecture masquée, une mutation, un upload, une suppression ou l’appel direct d’une action sensible, **Then** l’opération est refusée sans fuite d’information.
2. **Given** un administrateur valide, **When** il exécute les opérations prévues par le MVP, **Then** seules les opérations autorisées réussissent et leurs effets publics respectent l’état actif ou masqué.
3. **Given** une session supprimée, expirée ou privée du rôle courant, **When** un ancien jeton tente une nouvelle opération sensible, **Then** l’accès est refusé au prochain contrôle.
4. **Given** la clé publiable du site, **When** une inscription publique est appelée directement sans passer par l’interface, **Then** aucun compte n’est créé.
5. **Given** les artefacts et réponses du candidat, **When** ils sont inspectés, **Then** aucun secret, cookie, jeton, clé privilégiée, chemin Storage ou contenu sensible n’est exposé.

---

### User Story 3 - Rendre l’institut trouvable sans indexer l’administration (Priority: P2)

Un visiteur provenant d’un moteur de recherche ou d’un partage social comprend immédiatement l’activité de K’nails et arrive sur la bonne page. Les moteurs reçoivent des adresses canoniques, des métadonnées cohérentes et les informations locales confirmées, tandis que l’administration et les prévisualisations ne sont pas proposées à l’indexation.

**Why this priority**: La visibilité locale et la qualité des aperçus partagés soutiennent directement l’acquisition de clientes, sans élargir le périmètre fonctionnel.

**Independent Test**: Inspecter le HTML initial, les métadonnées, les canoniques, les aperçus sociaux, les données structurées, le sitemap et les directives d’exploration sur un candidat construit avec le profil de production puis sur une prévisualisation réelle non indexable. La répétition sur le domaine final appartient au parcours intégré de lancement.

**Acceptance Scenarios**:

1. **Given** les pages Services, Galerie et Contact, **When** un moteur ou un outil de partage les consulte, **Then** chacune fournit un titre, une description, une adresse canonique et un aperçu propres à son contenu réel.
2. **Given** le sitemap de production, **When** il est lu, **Then** il contient uniquement les pages publiques canoniques indexables et exclut les redirections, l’administration, les interfaces internes et les prévisualisations.
3. **Given** les directives d’exploration de production, **When** un robot les lit, **Then** les pages publiques et le sitemap sont découvrables, l’administration est exclue de l’exploration et ces directives ne sont jamais présentées comme une barrière de sécurité.
4. **Given** une Deploy Preview ou un déploiement de branche, **When** un robot le consulte, **Then** l’environnement demande explicitement de ne pas être indexé ni suivi.
5. **Given** des coordonnées finales partiellement confirmées, **When** les données locales sont publiées, **Then** seuls le nom, l’adresse, les horaires et les autres valeurs confirmées apparaissent ; aucune valeur de démonstration n’est inventée.

---

### User Story 4 - Utiliser tous les parcours sans barrière majeure (Priority: P2)

Un visiteur ou l’administratrice peut consulter le site, naviguer, envoyer un message, se connecter et gérer le contenu au clavier, au toucher ou avec une technologie d’assistance courante. Les informations restent lisibles aux largeurs de référence et les états asynchrones sont compréhensibles sans dépendre de la couleur ou du survol.

**Why this priority**: L’accessibilité est une exigence de qualité du MVP et conditionne les parcours de contact comme les opérations quotidiennes de l’administratrice.

**Independent Test**: Parcourir toutes les pages et tous les états critiques au clavier, avec zoom et réduction des mouvements, aux largeurs 320, 768 et 1 024 px, puis compléter les contrôles automatisés par Safari mobile et une technologie d’assistance disponible.

**Acceptance Scenarios**:

1. **Given** une personne n’utilisant que le clavier, **When** elle parcourt les pages publiques, le contact et l’administration, **Then** tous les contrôles utiles sont atteignables dans un ordre logique, activables et munis d’un focus visible.
2. **Given** une largeur de 320 px ou un agrandissement de texte à 200 %, **When** chaque parcours critique est utilisé, **Then** aucune information ni action n’est perdue et aucun défilement horizontal global n’est requis, hors contenu identifié qui exige réellement une disposition bidimensionnelle.
3. **Given** un formulaire invalide, en cours, réussi ou en erreur, **When** son état change, **Then** les champs, erreurs et annonces sont correctement nommés, associés et perceptibles sans la couleur seule.
4. **Given** une galerie ou une interface interactive, **When** le survol n’est pas disponible ou que la réduction des mouvements est activée, **Then** le contenu essentiel reste accessible et les animations non essentielles sont supprimées.
5. **Given** une page contenant des images, **When** elle est inspectée par une technologie d’assistance, **Then** les images informatives ont un texte alternatif utile et les images purement décoratives sont ignorées.

---

### User Story 5 - Prononcer une décision de lancement traçable (Priority: P3)

La responsable de la livraison dispose d’un rapport unique qui relie chaque exigence du MVP à une preuve datée, distingue les réussites des blocages et conserve les procédures de surveillance, sauvegarde et reprise. Le lancement n’est autorisé que si aucune preuve obligatoire ne manque.

**Why this priority**: Une somme de tests isolés ne suffit pas à démontrer que le produit complet est prêt ni à faciliter un diagnostic ou un retour arrière après publication.

**Independent Test**: Rejouer la recette de bout en bout sur la révision candidate, contrôler le rapport et ses liens vers les preuves, puis simuler un critère de préproduction en échec et un smoke ou archivage final en échec afin de vérifier séparément `not_approved` et `not_ready`.

**Acceptance Scenarios**:

1. **Given** la révision candidate, **When** la recette complète est exécutée, **Then** chaque besoin des fonctionnalités 001 à 005 et chaque critère final du MVP possède un statut et une preuve datée.
2. **Given** un contrôle obligatoire échoué, non exécuté ou invérifiable, **When** le rapport est consolidé, **Then** la décision de l’étape concernée reste « non autorisé à promouvoir » ou « non prêt » et le motif ainsi que l’action de reprise sont explicites.
3. **Given** tous les contrôles obligatoires de préproduction réussis sur la même révision, **When** la responsable autorise sa promotion, **Then** le rapport enregistre la décision distincte « autorisé à promouvoir », la révision, l’environnement et la date sans prétendre que la production est déjà prête.
4. **Given** cette même révision active en production, **When** la recette après déploiement réussit et que la copie finale expurgée est archivée puis vérifiée durablement, **Then** la décision devient officiellement « prêt » et confirme les parcours publics, l’administration, le contact, les images, le domaine, le HTTPS et les politiques distantes réellement appliquées.

### Edge Cases

- Une valeur de prévisualisation pointe accidentellement vers le projet de données de production : la promotion est bloquée avant tout test destructif et aucun test ne doit modifier la cible ambiguë.
- Une variable publique attendue est présente mais contient une URL non HTTPS distante, une clé d’un autre projet ou une valeur de démonstration : la configuration est invalide.
- Un secret serveur est correctement stocké mais porte un préfixe public, ou une variable ponctuelle de configuration du bucket est restée dans Netlify : le candidat est refusé.
- Le certificat n’est pas actif pour une variante requise, `knailsbeauty.com` ne peut pas être rattaché au site, une redirection perd le chemin ou les paramètres, ou une variante `www`/sans `www`/`.com` crée une boucle : le lancement reste bloqué.
- L’origine canonique n’est pas explicitement confirmée avant la configuration des métadonnées et redirections : aucune valeur temporaire n’est inscrite et l’implémentation SEO reste bloquée.
- Le site de prévisualisation répond avec des métadonnées de production mais sans directive de non-indexation : la prévisualisation est non conforme.
- La racine redirige vers Services : elle n’est pas dupliquée comme URL canonique indexable dans le sitemap.
- Une page d’administration est absente du sitemap mais reste indexable par ses propres métadonnées : la protection SEO est incomplète, indépendamment de l’autorisation d’accès.
- Le téléphone, le compte social ou une image de partage ne sont pas confirmés : la valeur temporaire est omise ou le lancement est bloqué si elle est indispensable, jamais publiée comme vraie.
- Une page passe les contrôles automatisés mais reste inutilisable au clavier, au zoom ou sur Safari mobile : la validation accessibilité échoue.
- Une page respecte les règles fonctionnelles mais diffère du design de référence sur une route, un état ou une largeur obligatoire : la preuve visuelle échoue jusqu’à correction ou mise à jour explicitement approuvée de la référence.
- Une session ouverte avant un déploiement conserve un ancien document ou un ancien rôle : le premier contrôle sensible suivant doit utiliser l’autorité courante et les réponses admin ne doivent pas provenir d’un cache partagé.
- Supabase est en pause, un quota de l’offre gratuite est proche de sa limite ou un service tiers est indisponible : le test est consigné comme blocage ou risque accepté explicitement, jamais comme réussite implicite.
- Une suppression galerie réussit sur la ligne mais pas sur le fichier, ou inversement : la photo reste non publique, l’état de réparation est visible et la reprise est prouvée avant lancement.
- Un retour arrière applicatif vise une révision incompatible avec le schéma déjà appliqué : la procédure doit préserver les données et interdire un rollback aveugle.
- Un test nécessite un accès externe indisponible : il reste « non exécuté » et bloque le lancement s’il fait partie des gates obligatoires.
- Le validateur public de données structurées est indisponible ou ne retourne pas un résultat vérifiable : la preuve reste bloquée et ne peut pas être remplacée par une simple vérification syntaxique locale.
- Les preuves locales sont valides mais leur archive durable est absente ou ne peut pas être reliée au SHA candidat : la décision finale reste « non prêt ».

## Requirements *(mandatory)*

### Functional Requirements

#### Déploiement et configuration

- **FR-001**: Le MVP MUST être déployé sur un site Netlify relié au dépôt GitHub, avec une branche de production explicitement identifiée et des déploiements de production intentionnels.
- **FR-002**: Un candidat MUST passer par une Deploy Preview représentative avant toute promotion en production ; une décision explicite « autorisé à promouvoir » MUST exiger tous les gates obligatoires de préproduction réussis, et la production MUST correspondre exactement à cette révision identifiée.
- **FR-003**: Les contextes local, prévisualisation et production MUST utiliser des configurations distinctes ; aucune valeur de prévisualisation ne MUST cibler implicitement les données ou services de production, et les soumissions ainsi que notifications de contact de prévisualisation MUST rester distinctes de celles de production et être refusées dans le mauvais contexte.
- **FR-004**: La configuration runtime de production MUST fournir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` et `SERVICE_SUCCESS_FLASH_SECRET` avec des valeurs non vides, cohérentes avec la cible et valides avant le démarrage des parcours.
- **FR-005**: Seules l’URL Supabase et la clé publiable MUST être exposables au navigateur. `SERVICE_SUCCESS_FLASH_SECRET` MUST rester serveur, être distinct par environnement, aléatoire et comporter au moins 32 caractères.
- **FR-006**: Les variables ponctuelles `SUPABASE_GALLERY_CONFIG_URL`, `SUPABASE_GALLERY_CONFIG_PROJECT_REF` et `SUPABASE_GALLERY_CONFIG_SECRET_KEY` MUST NOT être configurées dans Netlify, le runtime applicatif, le bootstrap CRUD ou un fichier local ordinaire ; leur clé dédiée MUST être révoquée après la configuration contrôlée du bucket.
- **FR-007**: Aucun fichier contenant des valeurs d’environnement réelles, secret, clé privilégiée ou identifiant opérationnel sensible MUST être versionné ; les exemples MUST contenir uniquement les noms et attentes non secrètes.
- **FR-008**: Toute variable obligatoire absente, invalide ou incohérente MUST produire un échec explicite et expurgé avant que le site annonce un état fonctionnel.
- **FR-009**: L’origine canonique MUST être `https://knailsbeauty.fr`, sans `www`. Les variantes HTTP, `www.knailsbeauty.fr`, `knailsbeauty.com`, `www.knailsbeauty.com` et l’hôte technique de production MUST rediriger définitivement vers cette origine sans boucle, en conservant le chemin et les paramètres ; chaque hôte HTTPS requis MUST présenter un certificat valide.
- **FR-010**: Les pages et actions `/admin` MUST rester privées, non stockables par un cache partagé et refusées sans autorisation, y compris après navigation, restauration d’onglet ou changement de déploiement.
- **FR-011**: La détection des formulaires de contact de prévisualisation et de production, leurs notifications distinctes, le refus d’un formulaire dans le mauvais contexte, le classement anti-spam et le `Reply-To` MUST être configurés et vérifiés dans Netlify avant lancement.
- **FR-012**: Une procédure de retour arrière applicatif, de restauration des prestations et de réenvoi des images MUST être documentée, testée sans destruction de production et compatible avec les migrations déjà appliquées.

#### SEO et exploration

- **FR-013**: Les pages `/services`, `/galerie` et `/contact` MUST fournir dans leur HTML destiné aux robots un titre et une description uniques, en français, cohérents avec leur contenu visible.
- **FR-014**: Chaque page publique indexable MUST déclarer une URL canonique absolue sur `https://knailsbeauty.fr` ; `www`, le domaine `.com`, une redirection, une prévisualisation ou une URL technique MUST NOT devenir canonique.
- **FR-015**: Chaque page publique principale MUST fournir des métadonnées de partage social cohérentes comprenant au minimum le titre, la description, l’URL canonique et une image validée lorsque l’asset final est disponible.
- **FR-016**: La production MUST publier un sitemap valide contenant exactement les pages publiques canoniques destinées à l’indexation et MUST exclure `/admin`, les interfaces internes, les pages de connexion, les URLs de prévisualisation et la racine de redirection dupliquée.
- **FR-017**: La production MUST publier des directives d’exploration valides qui autorisent les pages publiques, référencent le sitemap canonique et excluent l’administration de l’exploration ; chaque page d’administration et de connexion MUST aussi demander sa propre non-indexation, sans que l’un ou l’autre mécanisme remplace les contrôles d’accès.
- **FR-018**: Les déploiements de prévisualisation et de branche MUST demander aux robots de ne pas indexer ni suivre leurs pages, et MUST NOT exposer un sitemap les présentant comme canoniques.
- **FR-019**: Les informations structurées de l’entreprise locale MUST reprendre uniquement le nom, l’adresse, les horaires, l’URL et les coordonnées confirmées, correspondre au contenu visible et omettre toute valeur temporaire non validée.
- **FR-020**: Les pages publiques MUST rendre leur contenu principal et leurs métadonnées lisibles sans exiger l’exécution de JavaScript dans le navigateur.

#### Accessibilité et compatibilité

- **FR-021**: Les parcours Services, Galerie, Contact, connexion, déconnexion, gestion des prestations, gestion des catégories et gestion de la galerie MUST viser WCAG 2.1 niveau AA et MUST combiner un audit automatisé normatif sans violation A/AA quelle que soit sa gravité, un contrôle complémentaire sans anomalie sérieuse ou critique et une revue manuelle.
- **FR-022**: Toutes les fonctions essentielles MUST être utilisables au clavier dans un ordre logique, sans piège de focus, avec un focus visible et restauré correctement après un dialogue ou une annulation.
- **FR-023**: Chaque contrôle MUST posséder un nom accessible, chaque champ un libellé explicite, chaque erreur une association au champ et chaque changement asynchrone important une annonce adaptée.
- **FR-024**: Les informations, sélections, statuts, erreurs et succès MUST NOT dépendre uniquement de la couleur, du survol, d’une icône ou d’une animation.
- **FR-025**: Le texte normal MUST respecter un contraste d’au moins 4,5:1, les composants et indicateurs visuels requis un contraste d’au moins 3:1, et les cibles tactiles du design MUST mesurer au moins 44 × 44 px.
- **FR-026**: Les pages MUST rester utilisables sans perte de contenu ou de fonction à 320 px, 768 px et 1 024 px, à 200 % de zoom et au reflow équivalent à 400 % depuis 1 280 px, sans défilement horizontal global à 320 CSS px hors contenu exigeant réellement une disposition bidimensionnelle.
- **FR-027**: Les images informatives MUST posséder un texte alternatif utile ; les images décoratives MUST être ignorées ; les dimensions explicites MUST empêcher les décalages de mise en page attribuables aux images de galerie.
- **FR-028**: Les contenus essentiels de la galerie et du menu mobile MUST rester disponibles au toucher et sans survol, et la préférence de réduction des mouvements MUST neutraliser les animations non essentielles.
- **FR-029**: La recette manuelle MUST inclure Safari mobile réel et Firefox moderne, ainsi qu’une technologie d’assistance disponible pour contrôler les titres, annonces, formulaires, dialogues et navigations.

#### Sécurité de production

- **FR-030**: La matrice d’accès MUST être exécutée avec les rôles visiteur, authentifié non-admin et administrateur sur les catégories, prestations, métadonnées de photos, octets de photos et mutations.
- **FR-031**: Les tables et objets exposés MUST avoir des privilèges minimaux et des règles de lignes explicites ; l’exposition à l’interface de données et le filtrage par ligne MUST être testés comme deux protections distinctes.
- **FR-032**: Un visiteur MUST lire uniquement les prestations actives, les catégories nécessaires et les photos actives dont le fichier est prêt ; toutes les mutations et données masquées MUST être refusées.
- **FR-033**: Un compte authentifié sans rôle administrateur MUST avoir les mêmes refus de mutation et de lecture masquée qu’un visiteur.
- **FR-034**: L’administrateur courant MUST pouvoir exécuter uniquement les opérations du MVP après revalidation de sa session et de son rôle au plus près de chaque lecture sensible ou mutation.
- **FR-035**: Le rôle d’administration MUST provenir des métadonnées protégées, jamais de métadonnées modifiables par l’utilisateur, et une session supprimée, expirée ou déclassée MUST perdre ses droits au prochain contrôle.
- **FR-036**: L’inscription publique par e-mail, SMS ou compte anonyme MUST être désactivée sur la cible hébergée et une tentative directe avec la clé publiable MUST être refusée sans créer de compte.
- **FR-037**: Le bucket galerie MUST rester privé ; la liste anonyme MUST être refusée et un même identifiant d’image MUST cesser de livrer des octets dès que la photo est masquée, non prête ou supprimée.
- **FR-038**: Les droits d’ajout, lecture, remplacement et suppression de fichiers MUST être testés séparément, et les échecs partiels entre la ligne et le fichier MUST rester non publics et réparables.
- **FR-039**: Chaque formulaire, action sensible et entrée administrable MUST rejeter les données invalides lorsqu’elles contournent l’interface, sans afficher d’erreur interne ou de faux succès.
- **FR-040**: Les réponses de production MUST réduire les risques courants de chargement de contenu non autorisé, d’intégration dans un site tiers et d’interprétation incorrecte de type, sans bloquer les ressources légitimes du MVP.
- **FR-041**: Le dépôt, l’historique du candidat, les exemples de configuration, le build client et les journaux accessibles MUST être inspectés pour confirmer l’absence de secret, mot de passe, jeton, cookie, clé `service_role`, clé `sb_secret_...` ou contenu de demande de contact.
- **FR-042**: Les erreurs publiques et administratives MUST être expurgées ; les journaux MUST fournir un contexte technique suffisant sans identité sensible, contenu de message, cookie, jeton ou clé.
- **FR-043**: Les contrôles de sécurité et de performance de la base hébergée MUST être examinés avant lancement, et toute alerte pertinente non corrigée MUST bloquer ou faire l’objet d’une acceptation de risque explicite, datée et limitée.
- **FR-044**: Le rapport de sécurité MUST être rejouable sur une cible non destructive et MUST identifier sans valeur secrète la révision, l’environnement, les rôles testés et le résultat de chaque cas.

#### Vérification complète du MVP

- **FR-045**: La recette MUST exécuter sans erreur le lint, la vérification TypeScript, le build de production, les tests unitaires, les tests des migrations et politiques, les parcours automatisés Auth, Services, Galerie et Contact, les advisors applicables et le scan de secrets.
- **FR-046**: La recette MUST prouver les parcours publics `/services`, `/galerie` et `/contact`, y compris chargement, contenu, état vide, erreur récupérable et responsive, puis comparer leurs états de référence à 320 px, 768 px et 1 024 px avec `doc/design.md` au moyen d’une revue visuelle datée ; toute différence non approuvée de composition, token, contenu essentiel ou état interactif MUST échouer.
- **FR-047**: La recette MUST prouver la connexion, la déconnexion, l’expiration, la révocation, le refus non autorisé et l’absence de cache partagé pour `/admin`.
- **FR-048**: La recette MUST prouver le cycle complet des prestations et catégories : lecture, création, modification, ordre, masquage, suppression confirmée, refus d’une catégorie utilisée et visibilité publique en moins de cinq secondes sans redéploiement.
- **FR-049**: La recette MUST prouver le cycle complet de la galerie : ajout, validation, publication, masquage, ordre, remplacement, suppression ligne-fichier, pagination 100/100/1, reprise des interruptions, audit des fichiers absents et bootstrap initial idempotent.
- **FR-050**: La recette MUST prouver le formulaire de contact réel : validation, prévention des doubles soumissions, quatre états, réception Netlify, honeypot, classement anti-spam, notification et `Reply-To`, sans stockage Supabase ni faux succès.
- **FR-051**: La recette MUST prouver les contraintes d’images et de performance définies par le MVP, notamment l’absence de décalage attribuable aux images, la fidélité des conversions et le budget de deux demandes/2 Mio avant défilement puis neuf invocations/9 Mio pour la consultation complète des neuf fixtures.
- **FR-052**: Le rapport de recette MUST inventorier sous un identifiant stable chaque critère d’acceptation de `doc/spec.md`, chaque exigence FR/SC de la présente fonctionnalité et chaque fonctionnalité 001 à 005, puis relier chaque entrée à une preuve datée portant sur la même révision candidate. Cette révision MUST être figée après toutes les modifications de code et de documentation et avant les preuves finales distantes ou manuelles ; toute preuve portant sur un SHA antérieur MUST être réexécutée ou re-signée après revalidation sur le SHA figé. Après le smoke test, une copie finale expurgée MUST être archivée durablement et rester récupérable par ce SHA sans modifier la révision candidate.
- **FR-053**: Chaque contrôle MUST avoir exactement un statut parmi réussi, échoué, bloqué ou non exécuté, avec le contexte expurgé et l’action requise ; bloqué et non exécuté ne valent jamais réussite.
- **FR-054**: La décision « autorisé à promouvoir » MUST exiger 100 % des gates obligatoires de préproduction réussis, aucune régression critique ou majeure connue et aucune preuve de préproduction manquante ; la décision finale « prêt » MUST en plus exiger le smoke test de production réussi et l’archive durable du rapport final.
- **FR-055**: Une recette de fumée post-déploiement MUST confirmer sur le domaine final le HTTPS, les trois pages publiques, le contact réel, la connexion admin, une lecture de données, une image, le sitemap, les directives robots et la non-indexation de l’administration.
- **FR-056**: La livraison MUST inclure une procédure d’exploitation minimale couvrant surveillance des quotas, journaux expurgés, sauvegarde manuelle avant opération importante, conservation des originaux d’images, restauration, conservation de l’archive finale et interlocuteur responsable de chaque décision de promotion et de lancement.

### Scope Boundaries

**Included**:

- configuration et déploiement du MVP sur Netlify avec Deploy Preview, domaine personnalisé et HTTPS ;
- inventaire, validation, séparation et protection des variables d’environnement existantes ;
- métadonnées des pages publiques, URL canoniques, aperçus sociaux, données structurées locales, sitemap et directives robots ;
- corrections strictement nécessaires pour atteindre les exigences d’accessibilité et de production déjà documentées ;
- tests de sécurité applicatifs, Auth, données, Storage, secrets, sessions et réponses ;
- exécution et consolidation de la recette complète des fonctionnalités 001 à 005 ;
- preuves de validation, rapport go/no-go, smoke test final, sauvegarde et reprise minimale.

**Excluded**:

- réservation, paiement, compte client, inscription publique, fidélité, multi-rôles ou application mobile ;
- refonte visuelle, changement d’identité, dark mode ou nouvelle page d’accueil ;
- analytics, gestionnaire de balises, publicité, campagne SEO, garantie de positionnement ou production continue de contenu ;
- tableau de bord de supervision, service d’observabilité payant ou nouvelle infrastructure backend ;
- modification destructive directe d’une base de production ou test de charge agressif sur l’offre gratuite ;
- sauvegarde automatique ou engagement de disponibilité que les offres gratuites retenues ne fournissent pas ;
- correction d’une fonctionnalité hors MVP découverte pendant la recette.

### Key Entities *(include if feature involves data)*

- **Candidat de livraison**: Révision immuable proposée pour la production, identifiée par sa révision, son contexte de déploiement, sa date de construction et le résultat de ses gates.
- **Configuration d’environnement**: Ensemble attendu de noms, portées, contextes et propriétés de sensibilité des variables. Le rapport conserve leur présence et leur validité, jamais leurs valeurs secrètes.
- **Surface indexable**: Ensemble des pages publiques canoniques, métadonnées, informations locales, aperçus sociaux et directives d’exploration destinés aux moteurs et aux outils de partage.
- **Preuve de vérification**: Résultat daté et expurgé d’un contrôle, lié à une exigence, une révision et un environnement, avec un statut fermé et un emplacement consultable.
- **Rapport de préparation**: Vue consolidée des preuves, risques acceptés, blocages, procédures de reprise, décision d’autorisation de promotion, décision finale de lancement et référence d’archive durable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Une Deploy Preview puis la production construisent la même révision avec 3 variables runtime obligatoires sur 3 valides, 0 variable ponctuelle de configuration du bucket dans Netlify et 0 secret détecté dans le dépôt ou le build client.
- **SC-002**: Sur le domaine final, 100 % des variantes HTTP/HTTPS de `knailsbeauty.fr`, `www.knailsbeauty.fr`, `knailsbeauty.com`, `www.knailsbeauty.com` et de l’hôte technique retenu convergent vers `https://knailsbeauty.fr` avec certificat valide, chemin et paramètres conservés ; `/services`, `/galerie` et `/contact` répondent sans erreur et aucune boucle de redirection n’est observée.
- **SC-003**: Les 3 pages publiques principales sur 3 possèdent des titres, descriptions, canoniques et aperçus sociaux uniques ; le sitemap contient exactement ces URLs canoniques indexables, 0 URL admin/interne/prévisualisation, et les directives robots référencent le bon sitemap.
- **SC-004**: Les données structurées locales produisent 0 erreur dans le validateur public de référence Schema.org, correspondent à 100 % aux informations visibles confirmées et contiennent 0 téléphone, compte social, URL ou horaire de démonstration ; l’indisponibilité du validateur produit un blocage explicite.
- **SC-005**: Les parcours critiques sont terminés à 100 % au clavier à 320, 768 et 1 024 px, à 200 % de zoom et avec réduction des mouvements, avec 0 piège de focus, 0 contrôle sans nom, 0 défilement horizontal global hors contenu exigeant réellement une disposition bidimensionnelle et 0 information disponible uniquement au survol ou par la couleur.
- **SC-006**: Les audits automatisés des pages et états représentatifs signalent 0 violation WCAG 2.1 A/AA quelle que soit sa gravité, et le contrôle complémentaire signale 0 anomalie critique ou sérieuse ; la revue manuelle confirme les contrastes 4,5:1 et 3:1 applicables, les cibles 44 × 44 px, les annonces et les alternatives textuelles sur Safari mobile et Firefox.
- **SC-007**: La matrice de sécurité visiteur/non-admin/admin obtient 100 % des résultats attendus sur lecture active, lecture masquée, création, modification, suppression, remplacement Storage, liste du bucket, révocation d’octets, inscription directe et session révoquée, avec 0 mutation non autorisée.
- **SC-008**: Les scans et inspections de production trouvent 0 clé secrète ou `service_role`, 0 cookie ou jeton, 0 chemin Storage, 0 contenu intégral de demande de contact et 0 erreur interne dans le navigateur, les pages HTML ou les journaux examinés.
- **SC-009**: L’ensemble des commandes obligatoires de qualité, des matrices de base/Auth/Storage et des suites Auth, Services, Galerie et Contact se termine avec 0 échec sur la même révision candidate ; toute alerte d’advisor pertinente est corrigée ou accompagnée d’une acceptation de risque explicite.
- **SC-010**: Les cycles prestations, catégories et galerie couvrent 100 % des opérations et reprises exigées ; toute modification publique confirmée apparaît en moins de 5 secondes sans redéploiement, la pagination galerie restitue 100/100/1 éléments sans perte ni doublon et la suppression retire ligne et fichier.
- **SC-011**: Le parcours Contact produit 1 notification pour une soumission humaine vérifiée, 0 notification pour le cas spam contrôlé, un `Reply-To` correct, 0 faux succès sur les erreurs simulées et 0 message enregistré dans les tables Supabase.
- **SC-012**: Le parcours galerie automatisé mesure 0 décalage de mise en page attribuable aux images, au plus 2 demandes/2 Mio avant défilement et au plus 9 invocations/9 Mio pour la consultation complète des neuf fixtures, sans doublon d’identifiant.
- **SC-013**: Le rapport distingue sans ambiguïté l’autorisation de promotion de la décision finale, inventorie et relie 100 % des critères d’acceptation du MVP, des FR/SC de préparation et des fonctionnalités 001 à 005 à une preuve datée, contient 0 statut obligatoire échoué, bloqué ou non exécuté lorsqu’il conclut « prêt », et sa copie finale expurgée est récupérable durablement par le SHA candidat.
- **SC-014**: Le smoke test post-déploiement réussit 11 contrôles sur 11 — HTTPS, Services, Galerie, Contact, soumission réelle, connexion admin, lecture de données, livraison d’image, sitemap, directives robots et protection d’indexation admin — avant l’annonce du lancement.
- **SC-015**: Un exercice non destructif confirme que le site peut revenir à un déploiement précédemment validé et que les procédures d’export, restauration des prestations et réenvoi des images sont complètes, sans perte ni secret dans les preuves.
- **SC-016**: Les états de référence des 3 pages publiques à 320 px, 768 px et 1 024 px obtiennent 100 % de validations visuelles signées contre `doc/design.md`, avec 0 différence non approuvée de composition, token, contenu essentiel ou état interactif.

## Assumptions

- Les fonctionnalités 001 à 005 constituent le MVP à valider ; cette fonctionnalité n’ajoute aucun nouveau parcours métier.
- Netlify reste l’hébergeur commercial imposé, GitHub la source des déploiements et Supabase la cible de données, Auth et Storage.
- La branche de production exacte sera confirmée avant la promotion. L’origine canonique confirmée est `https://knailsbeauty.fr` ; `knailsbeauty.com` et ses variantes servent uniquement d’entrées de redirection et ne deviennent jamais des origines de contenu.
- L’adresse et les horaires de l’institut déjà documentés sont confirmés. Le téléphone, le compte Instagram et les autres contenus encore marqués temporaires restent exclus des métadonnées structurées tant qu’ils ne sont pas validés.
- La racine reste une redirection vers `/services` ; aucune nouvelle page d’accueil n’est créée dans ce périmètre.
- Les offres gratuites restent acceptables pour le volume initial, sous réserve d’une vérification de leurs quotas et conditions officielles au moment du lancement ; aucun chiffre temporellement variable n’est considéré garanti par cette spécification.
- Les tests destructifs ou de charge utilisent une cible locale ou de prévisualisation explicitement autorisée. La production ne sera jamais réinitialisée ni chargée agressivement pour obtenir une preuve.
- Les preuves peuvent contenir des identifiants de révision, des dates, des statuts et des diagnostics expurgés, mais jamais des valeurs secrètes ou des données personnelles de demandes de contact.
- Une acceptation de risque ne peut concerner une faille critique, une mutation non autorisée, un secret exposé, un faux succès ou une exigence d’accessibilité bloquant un parcours principal ; ces cas bloquent toujours le lancement.
