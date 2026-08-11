# Feature Specification: Fondation Supabase

**Feature Branch**: `001-supabase-foundation` *(contexte Spec Kit ; branche Git de travail actuelle : `dev`)*

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "001-supabase-foundation"

## Clarifications

### Session 2026-08-08

- Q: Cette fonctionnalité doit-elle également importer les prestations et photos actuellement codées en dur ? → A: Non, cette fonctionnalité livre uniquement le socle ; l'import des contenus existants est différé.
- Q: Cette fonctionnalité doit-elle seulement préparer les droits de suppression, ou livrer dès maintenant la suppression coordonnée du fichier et de sa métadonnée ? → A: Elle prépare séparément les droits de suppression ; le workflow coordonné fichier/métadonnée est différé.
- Q: L'inscription libre doit-elle être désactivée au niveau du service d'identité, même si aucun écran d'inscription n'existe ? → A: Oui, toute auto-inscription est désactivée ; seuls les mécanismes administratifs protégés peuvent créer un compte.
- Q: Cette fondation doit-elle générer elle-même les chemins uniques des fichiers, ou seulement définir et protéger leur format pour la future gestion de galerie ? → A: Elle définit et protège le format canonique ; la génération effective est différée à la gestion de galerie.
- Q: Les contrôles de cette fondation doivent-ils classer leurs échecs dans les quatre catégories prévues, même si les messages destinés à l'interface sont différés ? → A: Oui, les contrôles classent les échecs ; les messages utilisateur sont différés.
- Q: Une prestation « sur devis » doit-elle toujours avoir un prix absent, ou peut-elle conserver un montant indicatif ? → A: Le mode `quote` exige un prix absent.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulter uniquement le contenu public (Priority: P1)

Un visiteur sans compte peut consulter les prestations et les photos déclarées actives, dans un ordre stable, sans pouvoir découvrir les contenus masqués ni modifier les données.

**Why this priority**: Le site vitrine doit continuer à présenter son offre au public tout en garantissant que la future administration ne crée aucune possibilité de modification ou de fuite de contenu masqué.

**Independent Test**: Préparer des prestations et métadonnées de photos actives et inactives, effectuer les lectures avec un accès visiteur, puis vérifier que seuls les éléments actifs sont retournés et qu'aucune tentative d'écriture sur ces deux tables n'aboutit. Les fichiers sont testés indépendamment dans la user story 3.

**Acceptance Scenarios**:

1. **Given** des prestations actives et inactives dans les trois catégories prévues, **When** un visiteur demande la liste publique, **Then** seules les prestations actives sont retournées, triées par ordre d'affichage puis par date de création.
2. **Given** des photos actives et inactives, **When** un visiteur demande la galerie publique, **Then** seules les métadonnées des photos actives sont retournées dans un ordre stable.
3. **Given** un visiteur sans compte, **When** il tente de créer, modifier ou supprimer une prestation ou une métadonnée de photo, **Then** l'opération est refusée sans altérer les données existantes.

---

### User Story 2 - Administrer les données avec une autorisation fiable (Priority: P2)

Un administrateur préalablement créé peut accéder aux contenus actifs et masqués et effectuer les opérations nécessaires à leur gestion, tandis qu'un compte connecté sans droit administrateur reste limité à la lecture publique.

**Why this priority**: La gestion autonome du contenu repose sur une séparation stricte entre l'administrateur légitime et toute autre personne connectée ou non.

**Independent Test**: Exécuter la même matrice de lecture et de mutation avec un visiteur, un compte connecté non administrateur et un administrateur, puis comparer chaque résultat aux droits attendus.

**Acceptance Scenarios**:

1. **Given** un compte administrateur valide, **When** il consulte les prestations et les photos, **Then** il peut lire les éléments actifs et masqués.
2. **Given** un compte administrateur valide, **When** les droits de création, modification, masquage ou suppression d'un enregistrement conforme sont contrôlés séparément, **Then** chaque opération autorisée réussit sans prétendre finaliser le cycle de suppression complet d'une photo.
3. **Given** un compte connecté sans droit administrateur, **When** il tente une lecture de contenu masqué ou une mutation, **Then** l'opération est refusée sans divulguer de détail sensible.
4. **Given** une personne qui ne possède pas encore de compte, **When** elle tente de s'inscrire depuis le site ou directement auprès du service d'identité public, **Then** la création est refusée et seuls les mécanismes administratifs protégés restent autorisés à créer un compte.

---

### User Story 3 - Protéger les fichiers de la galerie (Priority: P3)

Le socle prépare pour l'administrateur les droits distincts nécessaires pour déposer, remplacer et supprimer des fichiers de galerie, tandis que les visiteurs peuvent uniquement recevoir les fichiers destinés à la diffusion publique.

**Why this priority**: Les photographies représentent l'essentiel du volume stocké et doivent rester publiquement consultables sans ouvrir de droit d'écriture.

**Independent Test**: Tester séparément la lecture, l'ajout, le remplacement et la suppression d'un fichier avec chacun des trois profils d'accès, puis vérifier qu'un chemin de fichier ne peut pas sortir de l'espace réservé à la galerie.

**Acceptance Scenarios**:

1. **Given** un fichier de galerie déjà publié, **When** un visiteur le consulte, **Then** le fichier est accessible sans lui accorder de droit d'ajout, de remplacement ou de suppression.
2. **Given** un administrateur valide et un chemin unique respectant le format canonique de la galerie, **When** ses droits d'ajout puis de remplacement sont contrôlés, **Then** les deux opérations sont autorisées et un seul fichier courant peut demeurer à ce chemin.
3. **Given** un administrateur valide, **When** son droit de suppression d'un fichier isolé est contrôlé, **Then** l'opération est autorisée sans être présentée comme une suppression coordonnée de la photo et de sa métadonnée.
4. **Given** un visiteur ou un compte non administrateur, **When** il tente une écriture dans l'espace de galerie, **Then** l'opération est refusée.

---

### User Story 4 - Reproduire et contrôler le socle (Priority: P4)

Un mainteneur peut établir le même socle de données et de droits dans un environnement vierge, connaître les paramètres de connexion requis et vérifier la sécurité avant tout branchement des interfaces.

**Why this priority**: Une fondation reproductible évite les réglages manuels invisibles, réduit les écarts entre environnements et rend les évolutions futures vérifiables.

**Independent Test**: Partir d'un environnement vierge autorisé, appliquer une seule séquence documentée, puis exécuter la matrice complète des contraintes et des droits sans correction manuelle du modèle de données.

**Acceptance Scenarios**:

1. **Given** un environnement vierge compatible, **When** le mainteneur applique la fondation documentée, **Then** les données, contraintes, droits et espace de fichiers attendus sont présents.
2. **Given** une configuration publique de l'application, **When** elle est inspectée, **Then** elle contient uniquement les informations explicitement autorisées pour le navigateur et aucun secret privilégié.
3. **Given** une fondation fraîchement établie, **When** la matrice de sécurité est exécutée, **Then** tous les cas visiteur, connecté non administrateur et administrateur produisent le résultat attendu.
4. **Given** un contrôle qui échoue, **When** son résultat est produit, **Then** il identifie la catégorie validation, autorisation, droit d'accès ou erreur interne sans exposer de secret ni définir encore le message de l'interface future.

### Edge Cases

- Deux éléments peuvent partager le même ordre d'affichage ; leur date de création doit alors produire un ordre stable sans bloquer l'enregistrement.
- Une prestation `fixed` ou `starting_at` doit être refusée si son montant est absent ; une prestation `quote` doit être refusée si un montant est présent.
- Les catégories, variantes de galerie, dimensions, tailles, durées, textes et adresses externes hors contraintes doivent être refusés avant de devenir des données publiques.
- Un compte connecté dont le droit administrateur est absent, expiré ou obsolète doit être traité comme non administrateur jusqu'à obtention d'une preuve d'autorisation à jour.
- Une tentative d'auto-inscription doit être refusée même lorsqu'elle contourne l'interface et appelle directement le service d'identité public.
- L'absence d'un droit d'accès nécessaire ne doit jamais être compensée par un droit plus large accordé à tous les utilisateurs.
- Un contrôle qui rencontre plusieurs symptômes doit produire une catégorie principale déterministe et conserver les détails sensibles hors de sa sortie partageable.
- Le remplacement d'un fichier doit échouer proprement si le profil peut ajouter mais ne peut ni lire ni modifier l'objet existant.
- La fondation doit refuser tout chemin qui ne respecte pas le format canonique ou qui traverse un autre dossier ; la future gestion de galerie générera le chemin effectif sans utiliser le nom fourni par l'utilisateur comme source de confiance.
- Une photo masquée reste conservée pour l'administration mais ne doit plus être découvrable dans la liste publique de la galerie.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST conserver pour chaque prestation un identifiant, un nom, une description, une catégorie, un mode de tarification, un prix éventuel, une durée éventuelle, un badge éventuel, une référence d'image éventuelle, un ordre d'affichage, un statut de visibilité et les dates de création et de modification.
- **FR-002**: Le système MUST limiter les catégories aux trois groupes du MVP : onglerie et manucure, soins du corps, esthétique et visage.
- **FR-003**: Le système MUST appliquer toutes les règles métier documentées sur le nom, la description, le prix, le mode de tarification, la durée, le badge, l'ordre et le statut d'une prestation ; les modes `fixed` et `starting_at` MUST avoir un prix, tandis que le mode `quote` MUST avoir un prix absent.
- **FR-004**: Le système MUST conserver pour chaque photo un identifiant, une référence de fichier unique, un texte alternatif, un titre éventuel, un libellé éventuel, une adresse externe éventuelle, une variante d'affichage, les dimensions, le type de média, la taille, un ordre d'affichage, un statut de visibilité et les dates de création et de modification.
- **FR-005**: Le système MUST limiter les variantes de galerie à `featured`, `small`, `wide_small`, `wide_large` et `social`, et MUST refuser toute adresse externe qui n'utilise pas HTTPS.
- **FR-006**: Le système MUST appliquer un tri stable par ordre d'affichage croissant puis par date de création, sans exiger que l'ordre soit unique.
- **FR-007**: Le système MUST permettre au public de lire uniquement les prestations et métadonnées de photos actives.
- **FR-008**: Le système MUST refuser au visiteur toute création, modification ou suppression de prestations, de métadonnées de photos et de fichiers.
- **FR-009**: Le système MUST appliquer aux comptes connectés sans droit administrateur les mêmes limites de visibilité et de mutation qu'au public.
- **FR-010**: Le système MUST permettre à un administrateur autorisé de lire les contenus actifs et masqués et de créer, modifier et supprimer les prestations et métadonnées de photos.
- **FR-011**: Le droit administrateur MUST provenir d'une information contrôlée par le service et non modifiable par son titulaire ; aucune information de profil librement modifiable ne peut accorder ce droit.
- **FR-012**: Le premier compte administrateur MUST être créé manuellement, toute auto-inscription MUST être désactivée au niveau du service d'identité, et seuls des mécanismes administratifs protégés MUST pouvoir créer d'autres comptes ; l'absence d'écran d'inscription ne suffit pas à satisfaire cette exigence.
- **FR-013**: Le système MUST disposer d'un espace de fichiers réservé à la galerie, lisible pour la diffusion publique mais inscriptible, remplaçable et supprimable uniquement par un administrateur autorisé.
- **FR-014**: La fondation MUST limiter les fichiers de galerie à un format de chemin canonique et unique dans l'espace réservé et MUST refuser tout chemin hors de ce format ; la génération effective du chemin et l'abandon du nom fourni par l'utilisateur comme source de confiance MUST être assurés par la future fonctionnalité de gestion de galerie.
- **FR-015**: Les droits de remplacement de fichier MUST couvrir l'ajout, la lecture et la modification de l'objet existant ; la suppression MUST être autorisée séparément, sans que cette fondation implémente le workflow coordonné entre fichier et métadonnée.
- **FR-016**: Les droits accordés à chaque profil MUST être explicites et limités aux opérations nécessaires avant l'application des règles de visibilité par enregistrement.
- **FR-017**: L'ensemble du modèle de données, des contraintes, des droits et des règles d'accès MUST pouvoir être établi de façon versionnée et reproductible dans un environnement vierge, sans modification manuelle non documentée.
- **FR-018**: La configuration de connexion destinée au navigateur MUST contenir uniquement l'adresse publique du service et une clé publiable ; toute clé secrète ou privilégiée MUST rester absente du navigateur, des journaux et des fichiers versionnés.
- **FR-019**: Le système MUST fournir des types de données applicatifs cohérents avec le modèle réellement établi afin que les futures lectures et mutations détectent les écarts de structure avant livraison.
- **FR-020**: La fondation MUST être vérifiée avec les profils visiteur, connecté non administrateur et administrateur pour la lecture active, la lecture masquée, la création, la modification, la suppression et le remplacement de fichiers.
- **FR-021**: Chaque contrôle de la fondation MUST classer son échec principal comme validation, autorisation, droit d'accès ou erreur interne et MUST produire un diagnostic exploitable sans exposer de secret ; la formulation des messages destinés aux utilisateurs reste hors du périmètre de cette fondation.

### Scope Boundaries

**Included**:

- définition des prestations et métadonnées de galerie avec leurs contraintes ;
- droits de lecture publique et d'administration ;
- fondation de l'identité administrateur sans écran de connexion ;
- espace de fichiers de galerie et droits distincts de lecture, ajout, remplacement et suppression ;
- contrat de configuration publique et privée de l'application ;
- établissement reproductible, vérification de la matrice d'accès et classification des échecs des contrôles.

**Excluded**:

- écrans de connexion et de déconnexion ;
- interface `/admin` et formulaires CRUD ;
- branchement des pages publiques sur les nouvelles données ;
- redimensionnement, conversion, compression et prévisualisation des images ;
- import des prestations et photos actuellement codées en dur ;
- cache applicatif et invalidation des pages ;
- formulaire de contact, déploiement de production, réservation, paiement, compte client et inscription publique.

### Key Entities *(include if feature involves data)*

- **Prestation**: Service commercial présenté par l'institut, rattaché à une catégorie fermée, avec informations tarifaires, durée éventuelle, ordre et visibilité publique.
- **Photo de galerie**: Métadonnées éditoriales et techniques d'un visuel, liées à un fichier unique, à une variante de mise en page, à un ordre et à une visibilité publique.
- **Fichier de galerie**: Objet image distribué au public depuis l'espace réservé à la galerie et administrable uniquement par un compte autorisé.
- **Administrateur**: Compte créé manuellement dont le droit de gestion est attribué par une autorité non modifiable par le titulaire.
- **Profil d'accès**: Contexte visiteur, connecté non administrateur ou administrateur utilisé pour déterminer les lectures et mutations autorisées.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des scénarios de la matrice d'accès réussissent pour les trois profils : visiteur, connecté non administrateur et administrateur.
- **SC-002**: Sur un jeu de contrôle contenant des éléments actifs et masqués, 100 % des éléments actifs attendus et 0 élément masqué sont visibles par le public.
- **SC-003**: 100 % des tentatives publiques ou non administratrices de création, modification, suppression ou remplacement sont refusées sans modification résiduelle.
- **SC-004**: Un administrateur autorisé réussit 100 % des contrôles séparés de création, lecture, modification, masquage et suppression pour une prestation, une métadonnée de photo et un fichier valides, sans que ces contrôles constituent un workflow coordonné de suppression de photo.
- **SC-005**: 100 % des données invalides couvrant chaque contrainte métier documentée sont refusées lors des tests de contrôle.
- **SC-006**: La fondation peut être rétablie dans un environnement vierge en une seule procédure documentée, sans correction manuelle du modèle ou des droits.
- **SC-007**: L'inspection automatisée de la configuration publique et des fichiers versionnés détecte 0 secret ou clé privilégiée exposée.
- **SC-008**: Un jeu initial d'environ 40 prestations et jusqu'à 100 métadonnées de photos peut être enregistré et restitué dans l'ordre attendu sans pagination publique ni résultat instable.
- **SC-009**: 100 % des contrôles en échec produisent exactement une catégorie principale parmi validation, autorisation, droit d'accès ou erreur interne, avec 0 secret ou détail d'infrastructure sensible dans la sortie partageable.
- **SC-010**: 100 % des tentatives d'auto-inscription effectuées par un visiteur, depuis l'interface ou directement auprès du service d'identité public, sont refusées sans créer de compte.

## Assumptions

- Docker et la pile Supabase CLI locale sont disponibles pour le développement et les tests ; aucun projet Supabase hébergé ni secret distant n'est requis pour implémenter cette fondation.
- Un seul niveau administrateur existe dans le MVP. Le mainteneur propriétaire du projet, disposant d'une capacité administrative Supabase protégée hors navigateur, crée manuellement le premier compte et lui attribue son rôle ; les rôles multiples restent hors périmètre et toute création de compte ultérieure passe par le même type de mécanisme protégé.
- Les trois catégories de prestations et les cinq variantes de galerie restent fermées et configurées par le produit pendant le MVP.
- Une photo inactive reste stockée et administrable mais n'est pas retournée par la liste publique ; l'espace de fichiers étant destiné à la diffusion publique, masquer une photo ne constitue pas une révocation d'un lien direct déjà connu.
- Le traitement visuel des images et la coordination entre fichier et métadonnées seront spécifiés dans une fonctionnalité ultérieure de gestion de galerie ; aucun workflow complet de suppression de photo n'est livré par cette fondation, et la future fonctionnalité devra prévoir un état récupérable en cas d'échec partiel.
- La future fonctionnalité de gestion de galerie générera chaque chemin de fichier ; cette fondation en définit uniquement le format canonique et les limites d'accès.
- Le volume initial reste d'environ 40 prestations et de quelques dizaines à une centaine de photos, conformément au MVP.
- Cette fondation ne définit ni verrouillage optimiste ni résolution fonctionnelle des écritures concurrentes sur une même ligne ou un même chemin ; elle garantit seulement les contraintes d'unicité et d'accès, tandis que la future gestion de galerie devra choisir et tester sa stratégie de conflit avant d'exposer ces mutations.
- Aucun seuil de latence n'est fixé pour ce socle local : le critère mesurable porte sur le volume 40/100, l'absence de pagination, le tri déterministe et les index alignés. La latence de bout en bout sera mesurée lors du branchement des pages et de la validation Netlify.
- Les valeurs réelles de connexion sont propres à chaque environnement et ne sont jamais inscrites dans la documentation ou le dépôt.
