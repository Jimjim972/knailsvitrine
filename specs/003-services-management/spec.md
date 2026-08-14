# Feature Specification: Gestion des prestations

**Feature Branch**: `003-services-management` *(contexte Spec Kit ; branche Git de travail actuelle : `dev`)*

**Created**: 2026-08-10

**Status**: Extended and deployed to the authorized `dev` preview on 2026-08-14 — non-technical user gate SC-014 pending

**Input**: User description: "003-services-management"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulter et organiser le catalogue administratif (Priority: P1)

L'administrateur ouvre la gestion des prestations depuis l'espace protégé et consulte, dans une liste unique, toutes les prestations actives et masquées avec leur nom, leur catégorie, leur ordre et leur statut. Il peut retrouver rapidement ce qui est publié et comprendre l'ordre de présentation du catalogue.

**Why this priority**: La visibilité complète du catalogue est le point d'entrée de toutes les opérations quotidiennes et évite de modifier ou supprimer la mauvaise prestation.

**Independent Test**: Préparer des prestations actives et masquées dans les trois catégories, ouvrir la gestion avec un administrateur autorisé, puis vérifier que chaque prestation apparaît une seule fois avec ses informations de repérage, sans afficher de commande de mutation qui ne soit pas encore fonctionnelle.

**Acceptance Scenarios**:

1. **Given** des prestations actives et masquées dans les trois catégories, **When** l'administrateur ouvre la liste, **Then** toutes les prestations sont affichées avec leur nom, leur catégorie, leur ordre et un statut textuel non communiqué par la seule couleur.
2. **Given** plusieurs prestations partageant un même ordre, **When** la liste est affichée ou actualisée, **Then** leur ordre relatif reste déterministe selon leur date de création puis un départage stable.
3. **Given** aucune prestation enregistrée, **When** l'administrateur ouvre la liste, **Then** un état vide explique qu'aucune prestation n'existe et ne présente une action de création que si celle-ci mène à un formulaire fonctionnel.
4. **Given** un échec de chargement récupérable, **When** la liste ne peut pas être obtenue, **Then** aucun faux état vide n'est affiché, un message compréhensible distingue l'erreur et une nouvelle tentative est proposée.
5. **Given** l'accueil administratif protégé, **When** la fonctionnalité est livrée, **Then** un accès clairement nommé « Prestations » mène à la liste fonctionnelle sans présenter la gestion de la galerie comme disponible si elle ne l'est pas encore.

---

### User Story 2 - Créer une prestation publiable (Priority: P2)

L'administrateur saisit les informations commerciales d'une nouvelle prestation, choisit sa catégorie, sa présentation de prix, sa durée éventuelle, son badge, son ordre et sa visibilité, puis enregistre la prestation sans modifier le code du site.

**Why this priority**: La création autonome transforme le catalogue statique en contenu réellement administrable et répond au besoin principal du MVP.

**Independent Test**: Depuis un catalogue existant, créer successivement une prestation à prix fixe, une prestation « à partir de » et une prestation « sur devis », puis vérifier leur présence dans l'administration, leurs valeurs persistées et l'absence de doublon. Leur restitution publique relève ensuite de l'intégration croisée portée par l'histoire 5.

**Acceptance Scenarios**:

1. **Given** un administrateur sur le formulaire de création, **When** il soumet des valeurs valides sans modifier les valeurs proposées de visibilité et d'ordre, **Then** une prestation active d'ordre zéro est créée une seule fois et un succès réel est annoncé.
2. **Given** une prestation à prix fixe ou « à partir de », **When** un prix valide est saisi, **Then** la prestation est enregistrée avec son type et son montant exacts.
3. **Given** une prestation « sur devis », **When** le formulaire est enregistré sans prix, **Then** la prestation est acceptée avec le type « Sur devis » et aucun montant persistant.
4. **Given** une saisie invalide, **When** le formulaire est soumis, **Then** aucune prestation n'est créée, chaque erreur est associée au champ concerné et les valeurs non sensibles déjà saisies restent disponibles pour correction.
5. **Given** une soumission en cours, **When** l'administrateur active de nouveau l'action d'enregistrement, **Then** une seule création est traitée et l'état d'attente est visible et annoncé.
6. **Given** une liste administrative vide et la création livrée, **When** l'administrateur utilise l'action proposée dans l'état vide, **Then** il atteint le formulaire fonctionnel de nouvelle prestation.

---

### User Story 3 - Modifier, classer et masquer une prestation (Priority: P3)

L'administrateur corrige une prestation existante, change son ordre d'affichage ou la masque temporairement. Une modification confirmée apparaît dans l'administration et sur le catalogue public, sans nouveau déploiement, tandis qu'une prestation masquée reste administrable.

**Why this priority**: Les prix, durées, descriptions et disponibilités évoluent régulièrement ; ils doivent pouvoir être corrigés sans intervention technique et sans suppression inutile.

**Independent Test**: Modifier chaque champ administrable d'une prestation active, la masquer puis la réactiver, en vérifiant après chaque succès le même identifiant, les valeurs persistées, le statut administratif et l'éligibilité active ou masquée. La projection visuelle publique relève de l'intégration croisée portée par l'histoire 5.

**Acceptance Scenarios**:

1. **Given** une prestation existante, **When** l'administrateur enregistre des informations valides modifiées, **Then** la même prestation est mise à jour, un succès est annoncé et aucun doublon n'est créé.
2. **Given** une prestation active, **When** l'administrateur la masque, **Then** elle reste visible avec le statut « Masquée » dans l'administration et n'est plus éligible à la lecture publique.
3. **Given** une prestation masquée, **When** l'administrateur la réactive, **Then** elle retrouve le statut « Active » et redevient éligible à la lecture publique dans sa catégorie et à son ordre attendu.
4. **Given** deux prestations auxquelles le même ordre est attribué, **When** la modification est enregistrée, **Then** elle est acceptée et le catalogue conserve un ordre déterministe.
5. **Given** une session expirée ou un droit administrateur retiré pendant l'édition, **When** l'enregistrement est demandé, **Then** aucune modification n'est appliquée, l'état de session est expliqué et une reconnexion est nécessaire avant une nouvelle tentative.

---

### User Story 4 - Supprimer définitivement une prestation (Priority: P4)

L'administrateur peut supprimer une prestation devenue inutile après une confirmation explicite qui identifie l'élément concerné et rappelle le caractère définitif de l'action.

**Why this priority**: La suppression est nécessaire pour nettoyer durablement le catalogue, mais elle vient après le masquage car son erreur est irréversible.

**Independent Test**: Demander la suppression d'une prestation, annuler une première fois, puis confirmer et vérifier que seule cette prestation disparaît de l'administration et de la source persistante. Sa disparition du rendu public relève de l'intégration croisée portée par l'histoire 5.

**Acceptance Scenarios**:

1. **Given** une prestation existante, **When** l'administrateur choisit de la supprimer, **Then** une confirmation accessible affiche son nom, la conséquence définitive et des actions distinctes pour annuler ou confirmer.
2. **Given** la confirmation affichée, **When** l'administrateur annule, **Then** la prestation reste inchangée et aucun succès de suppression n'est annoncé.
3. **Given** la confirmation affichée, **When** l'administrateur confirme et que l'opération réussit, **Then** la prestation disparaît de l'administration et de la source persistante, et le succès réel est annoncé.
4. **Given** une suppression refusée ou indisponible, **When** l'opération échoue, **Then** la prestation reste présentée comme existante, aucun faux succès n'est affiché et l'administrateur peut réessayer ou choisir de la masquer.

---

### User Story 5 - Consulter le catalogue public actualisé (Priority: P5)

Le visiteur consulte les prestations actives réparties dans les catégories enregistrées. Il voit un prix compréhensible, une durée uniquement lorsqu'elle existe, un badge éventuel et l'action « Réserver » menant toujours vers le contact, sans percevoir le passage d'un catalogue codé en dur à un catalogue administrable.

**Why this priority**: L'administration n'apporte de valeur que si les changements sont publiés correctement, sans révéler les contenus masqués ni dégrader le design public existant.

**Independent Test**: Constituer un catalogue comprenant les trois types de prix, des durées présentes et absentes, des badges présents et absents ainsi que des prestations masquées, puis vérifier le rendu public, l'ordre, les liens et l'absence des éléments masqués.

**Acceptance Scenarios**:

1. **Given** des prestations actives et masquées, **When** un visiteur ouvre la page des services, **Then** seules les prestations actives sont affichées dans leur catégorie et leur ordre attendus.
2. **Given** les trois types de prix, **When** les cartes sont affichées, **Then** un prix fixe apparaît en euros, un prix de départ est précédé de « À partir de » et une prestation sans montant affiche « Sur devis ».
3. **Given** une prestation sans durée ou sans badge, **When** sa carte est affichée, **Then** aucun libellé vide ni espace incohérent n'est présenté.
4. **Given** une catégorie sans prestation active, **When** le catalogue est affiché, **Then** aucune section vide n'est rendue publiquement.
5. **Given** une prestation active, **When** le visiteur utilise son action « Réserver », **Then** il est dirigé vers le parcours de contact existant sans promesse de réservation en ligne.
6. **Given** le catalogue public existant au moment de la bascule, **When** la source administrable devient active, **Then** les huit prestations actuellement publiées conservent leurs noms, descriptions, prix, durées, badges, catégories et ordre relatif sans interruption visible.
7. **Given** chacune des cinq mutations confirmées — création active, modification, masquage, réactivation et suppression — **When** une nouvelle consultation publique est ouverte, **Then** le nouvel état public attendu est visible en moins de cinq secondes sans déploiement.

---

### User Story 6 - Créer une catégorie de prestations (Priority: P2)

L’administrateur ouvre « Nouvelle catégorie » depuis la gestion des prestations, saisit un nom et un ordre, puis utilise immédiatement cette catégorie dans un formulaire de prestation.

**Why this priority**: Une liste de trois catégories figées empêche l’institut d’ajouter un nouvel univers de soins sans intervention technique.

**Independent Test**: Créer une catégorie, vérifier le succès authentifié et sa présence unique dans le sélecteur de prestation, créer une prestation active dans cette catégorie, puis vérifier sa section publique avec le visuel générique.

**Acceptance Scenarios**:

1. **Given** un administrateur courant, **When** il crée une catégorie avec un nom de 2 à 80 caractères et un ordre positif ou nul, **Then** une seule catégorie est persistée et un succès réel est annoncé.
2. **Given** une catégorie existante, **When** le même nom est soumis avec une casse ou des espaces périphériques différents, **Then** la création est refusée sur le champ Nom sans mutation supplémentaire.
3. **Given** une catégorie créée, **When** le formulaire de nouvelle prestation est ouvert, **Then** la catégorie est proposée une seule fois dans l’ordre configuré.
4. **Given** une catégorie vide, **When** le catalogue public est consulté, **Then** elle n’est pas affichée ; dès qu’une prestation active lui est liée, elle apparaît avec le visuel générique de l’institut.
5. **Given** un visiteur, un non-admin ou une ancienne session révoquée, **When** une insertion directe est tentée, **Then** elle est refusée par les droits et RLS.

---

### User Story 7 - Administrer le cycle de vie des catégories (Priority: P2)

L’administrateur consulte les catégories avec leur ordre et leur nombre de prestations, renomme ou réordonne une catégorie, puis supprime une catégorie devenue vide après une confirmation explicite.

**Why this priority**: Une catégorie créée par erreur ou devenue obsolète doit pouvoir être corrigée sans intervention SQL, tout en protégeant les prestations existantes contre une suppression en cascade.

**Independent Test**: Créer une catégorie, la renommer et changer son ordre, vérifier la propagation dans le formulaire et le catalogue, constater que sa suppression est refusée lorsqu’une prestation la référence, retirer cette prestation puis confirmer la suppression de la catégorie.

**Acceptance Scenarios**:

1. **Given** les catégories enregistrées, **When** l’administrateur ouvre « Catégories », **Then** chaque ligne affiche son nom, son ordre, son nombre de prestations et les actions Modifier/Supprimer.
2. **Given** une catégorie existante, **When** l’administrateur modifie son nom et son ordre avec des valeurs valides, **Then** son code reste identique et les nouvelles valeurs sont visibles immédiatement dans l’administration et sur la prochaine consultation publique.
3. **Given** une catégorie référencée par une ou plusieurs prestations, **When** sa suppression est confirmée, **Then** aucune ligne n’est supprimée et un message demande de déplacer ou supprimer les prestations concernées.
4. **Given** une catégorie sans prestation, **When** sa suppression est confirmée, **Then** seule cette catégorie disparaît et un succès réel est annoncé.
5. **Given** un visiteur, un non-admin ou une ancienne session révoquée, **When** une modification ou suppression directe est tentée, **Then** elle est refusée par les grants et RLS.

### Edge Cases

- Les espaces périphériques sont supprimés des champs textuels ; un champ obligatoire composé seulement d'espaces est refusé.
- Un nom de 2 ou 120 caractères est accepté, tandis qu'un nom plus court ou plus long est refusé.
- Une description de 1 ou 1 000 caractères est acceptée après normalisation ; une description vide ou plus longue est refusée.
- Un prix nul est accepté pour un prix fixe ou « à partir de » ; un prix négatif, supérieur à 99 999 999,99 euros ou comportant plus de deux décimales est refusé.
- Pour une saisie française, la virgule ou le point peuvent séparer les décimales ; la valeur exacte normalisée est confirmée avant l'enregistrement.
- Le passage à « Sur devis » retire tout montant précédemment saisi ; le passage depuis « Sur devis » vers un type tarifé exige un montant valide.
- Une durée absente est acceptée ; si elle est présente, seules les minutes entières de 5 à 600 incluses sont valides.
- Un badge absent est accepté ; un badge présent doit contenir de 1 à 40 caractères après suppression des espaces périphériques.
- Un ordre égal à zéro est accepté, un ordre négatif ou non entier est refusé et les doublons d'ordre restent autorisés.
- Une prestation supprimée ou modifiée depuis un autre contexte avant la soumission ne doit pas produire un faux succès ; la liste est actualisée et explique que l'élément n'est plus disponible ou que l'opération doit être reprise.
- Une panne de lecture publique affiche un état indisponible compréhensible et ne remplace pas silencieusement les données par l'ancien catalogue codé en dur.
- Un visiteur, un compte non administrateur ou une ancienne session révoquée qui appelle directement une opération de gestion ne peut ni lire les prestations masquées ni créer, modifier, masquer, réactiver ou supprimer une prestation.
- Les contenus longs et les montants importants doivent revenir à la ligne sans masquer le statut ou les actions à 320 px.
- Un nom de catégorie de 2 ou 80 caractères est accepté ; un nom vide, trop court, trop long ou déjà présent après normalisation est refusé.
- Un code de catégorie est généré côté serveur sous la forme `category_<32 caractères hexadécimaux>` et n'est jamais accepté depuis le formulaire.
- Une catégorie supprimée ou inconnue entre l’ouverture du formulaire et sa soumission produit une erreur de catégorie sans créer ni modifier la prestation.
- Une catégorie supprimée hors bande avant sa modification ou sa suppression ne produit aucun faux succès.
- Une catégorie contenant une prestation active ou masquée reste non supprimable ; le statut public de la prestation ne change pas cette protection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST fournir à l'administrateur autorisé une gestion des prestations accessible depuis l'espace protégé et clairement nommée « Prestations ».
- **FR-002**: La liste administrative MUST afficher toutes les prestations, actives et masquées, avec au minimum leur nom, leur catégorie, leur ordre d'affichage et un statut textuel, ainsi que les actions disponibles pour chacune.
- **FR-003**: La liste administrative MUST conserver un ordre déterministe par catégorie, ordre d'affichage croissant, date de création croissante puis départage stable ; plusieurs prestations MAY partager le même ordre.
- **FR-004**: Le système MUST fournir des états distincts pour le chargement initial, la liste vide, les données chargées, l'indisponibilité récupérable et la session expirée ; un échec de lecture ne MUST pas être présenté comme une liste vide.
- **FR-005**: Le système MUST permettre de créer et modifier une prestation avec les champs administrables suivants : nom, description, catégorie, type de prix, montant conditionnel, durée facultative, badge facultatif, ordre d'affichage et statut actif ou masqué.
- **FR-006**: Le nom MUST contenir de 2 à 120 caractères et la description de 1 à 1 000 caractères après suppression des espaces périphériques ; les valeurs obligatoires composées seulement d'espaces MUST être refusées.
- **FR-007**: Dans l'administration, la catégorie d’une prestation MUST être choisie parmi les catégories lues depuis `categories_prestations`, et le serveur MUST vérifier qu’elle existe encore avant chaque création ou modification de prestation.
- **FR-008**: Le type de prix MUST être « Prix fixe », « À partir de » ou « Sur devis ». « Prix fixe » et « À partir de » MUST exiger un montant de 0 à 99 999 999,99 euros avec au plus deux décimales ; « Sur devis » MUST interdire tout montant enregistré.
- **FR-009**: La saisie d'un montant MUST accepter la virgule ou le point comme séparateur décimal, MUST rejeter les valeurs ambiguës ou comportant plus de deux décimales et MUST conserver une valeur décimale exacte jusqu'à sa restitution.
- **FR-010**: La durée MUST être facultative et, lorsqu'elle est renseignée, MUST être exprimée en minutes entières entre 5 et 600 incluses.
- **FR-011**: Le badge MUST être facultatif et contenir de 1 à 40 caractères après normalisation lorsqu'il est renseigné.
- **FR-012**: L'ordre d'affichage MUST être un entier supérieur ou égal à zéro, avec zéro proposé par défaut à la création ; une nouvelle prestation MUST être active par défaut sauf choix explicite contraire.
- **FR-013**: Avant chaque lecture administrative et chaque mutation, le système MUST confirmer l'identité, la session courante et le droit administrateur auprès de l'autorité protégée ; l'interface, une page protégée ou un ancien contexte de session ne MUST jamais constituer l'unique autorisation.
- **FR-014**: Un visiteur ou un utilisateur connecté sans droit administrateur MUST pouvoir lire uniquement les prestations actives et MUST être empêché de lire les prestations masquées ou d'effectuer toute mutation.
- **FR-015**: Chaque création ou modification MUST être validée intégralement au moment de l'enregistrement ; une saisie invalide MUST produire des erreurs associées aux champs sans mutation partielle et avec conservation des valeurs récupérables.
- **FR-016**: Les formulaires MUST exposer un état d'attente, empêcher les doubles soumissions et n'annoncer un succès qu'après confirmation réelle de la création ou de la modification.
- **FR-017**: Le système MUST permettre de masquer une prestation sans la supprimer, de réactiver une prestation masquée et de conserver les prestations masquées dans la liste administrative.
- **FR-018**: Toute suppression MUST être précédée d'une confirmation accessible identifiant la prestation par son nom et indiquant le caractère définitif de l'opération ; l'annulation MUST conserver l'élément sans annoncer de succès.
- **FR-019**: Après une création, modification, activation, masquage ou suppression confirmée, l'administration et le catalogue public MUST refléter le nouvel état sans nouveau déploiement ; un échec MUST conserver un état récupérable et ne MUST jamais annoncer un faux succès.
- **FR-020**: Le catalogue public MUST afficher uniquement les prestations actives, regroupées selon les catégories enregistrées et ordonnées par ordre de catégorie, puis ordre de prestation, date de création et identifiant stables.
- **FR-021**: Le catalogue public MUST présenter le nom, la description, le type de prix et son montant éventuel, la durée éventuelle et le badge éventuel de chaque prestation, sans espace réservé aux valeurs absentes.
- **FR-022**: Les prix publics MUST être formatés en euros selon le contexte français : un montant entier n'affiche pas de décimales (`45 €`), un montant comportant des centimes affiche exactement deux décimales séparées par une virgule (`45,50 €`), un prix de départ ajoute le préfixe « À partir de » (`À partir de 45,50 €`) et un devis affiche uniquement « Sur devis » sans montant.
- **FR-023**: Les trois catégories initiales MUST conserver leur intitulé et leur univers photographique dédiés ; toute catégorie ajoutée MUST utiliser le visuel générique documenté et une catégorie sans prestation active MUST être omise du catalogue public.
- **FR-024**: L'action publique « Réserver » de chaque prestation MUST conserver sa destination vers le parcours de contact existant et MUST NOT introduire de réservation en ligne.
- **FR-025**: La mise en service de la source administrable MUST reprendre les huit prestations actuellement publiées avec leurs noms, descriptions, prix, durées, badges, catégories et ordre relatif, puis supprimer leur duplication comme contenu métier codé en dur.
- **FR-026**: Les interfaces administratives de la fonctionnalité MUST rester utilisables à 320 px, 768 px et 1 024 px, au clavier et au toucher, avec des libellés visibles, un focus contrasté, des cibles d'au moins 44 × 44 px, des erreurs reliées aux champs et des annonces de statut accessibles.
- **FR-027**: La liste administrative MUST présenter une structure lisible adaptée à l'espace disponible ; aucune information ou action essentielle ne MUST dépendre uniquement du survol, de la couleur ou d'une icône sans nom accessible.
- **FR-028**: Les erreurs visibles MUST distinguer au minimum validation, session expirée ou refus d'accès, indisponibilité réseau ou service, et erreur interne, sans exposer de requête, trace, secret, jeton, cookie ni détail d'infrastructure.
- **FR-029**: Les pages administratives et leurs données MUST rester privées, non réutilisables entre utilisateurs et non restituables après une perte d'autorisation ; aucune prestation masquée ni commande administrative active ne MUST être présentée à un autre utilisateur.
- **FR-030**: La gestion des prestations MUST supporter le volume initial d'environ 40 éléments sans imposer de pagination et MUST préserver un ordre stable lors des actualisations successives.
- **FR-031**: Le système MUST permettre à l’administrateur courant de créer une catégorie avec un nom normalisé de 2 à 80 caractères et un ordre entier de 0 à 2 147 483 647 ; le code technique MUST être généré exclusivement côté serveur.
- **FR-032**: Le nom d’une catégorie MUST être unique sans tenir compte de la casse ni des espaces périphériques, et un doublon MUST produire une erreur de champ sans faux succès.
- **FR-033**: Les catégories MUST être lisibles par `anon` et `authenticated`; seul l’administrateur courant MUST pouvoir insérer, modifier ou supprimer sous des grants explicites et des politiques RLS séparées.
- **FR-034**: Après une création, modification ou suppression confirmée, le tag `prestations` MUST être invalidé ; le nouvel état MUST être immédiatement visible dans l’administration et dans les formulaires, puis sur une nouvelle consultation publique en moins de cinq secondes lorsqu’il affecte une section non vide.
- **FR-035**: La gestion des catégories MUST lister chaque catégorie avec son nom, son ordre, son nombre total de prestations actives ou masquées et ses actions disponibles.
- **FR-036**: La modification d’une catégorie MUST accepter uniquement son nom et son ordre validés, conserver son code technique et refuser les doublons normalisés sans mutation partielle.
- **FR-037**: La suppression d’une catégorie MUST exiger une confirmation accessible et MUST être refusée sans suppression partielle tant qu’au moins une prestation active ou masquée la référence ; aucune cascade ni réaffectation implicite n’est autorisée.
- **FR-038**: Une cible de catégorie invalide, absente ou supprimée hors bande MUST produire un état récupérable sans faux succès ni détail fournisseur.

### Scope Boundaries

**Included**:

- accès « Prestations » depuis l'administration protégée ;
- liste complète des prestations actives et masquées ;
- création, consultation administrative, modification, classement numérique, masquage, réactivation et suppression unitaire ;
- validation complète des champs et formats de prix ;
- états chargement, vide, attente, succès, erreur, session expirée et confirmation de suppression ;
- remplacement des prestations codées en dur par le catalogue administrable, avec reprise des huit contenus existants ;
- lecture publique des prestations actives, regroupement dans les catégories administrables et actualisation sans déploiement ;
- création, liste, renommage, réordonnancement et suppression sûre d’une catégorie, puis utilisation immédiate dans une prestation ;
- maintien du design, du responsive, de l'accessibilité et du parcours de contact existants.

**Excluded**:

- personnalisation visuelle des catégories ;
- ajout ou gestion d'une image propre à chaque prestation ;
- import générique par fichier, export, opérations groupées et historique complet des modifications ;
- recherche, filtrage avancé et pagination, non nécessaires au volume du MVP ;
- gestion de la galerie, du formulaire de contact, des comptes ou des rôles ;
- réservation, paiement, disponibilité de créneaux, promotion automatique ou publication vers un réseau social ;
- modification de la direction artistique des pages publiques.

### Key Entities *(include if feature involves data)*

- **Prestation**: Offre commerciale administrable caractérisée par un identifiant stable, un nom, une description, une référence à une catégorie enregistrée, une présentation de prix, un montant conditionnel, une durée facultative, un badge facultatif, un ordre, une visibilité et des dates de création et de modification.
- **Catégorie de prestation**: Groupe administrable caractérisé par un code serveur stable et non modifiable, un nom unique, un ordre et des dates. Elle peut être renommée, réordonnée et supprimée uniquement lorsqu’aucune prestation ne la référence. Les trois catégories initiales ont un visuel dédié ; les nouvelles utilisent le visuel générique.
- **Présentation de prix**: Règle liant le type commercial au montant : prix fixe et prix de départ exigent un montant exact, tandis que « Sur devis » exclut tout montant.
- **État de visibilité**: État actif ou masqué d'une prestation. Il contrôle sa présence publique sans empêcher sa consultation et sa réactivation par l'administrateur.
- **État de formulaire**: Résultat récupérable d'une création, modification ou suppression comprenant l'attente, les erreurs de champs, le refus d'accès, l'indisponibilité ou le succès confirmé.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dans 100 % des scénarios contrôlés, l'administrateur courant peut lister, créer, modifier, masquer, réactiver et supprimer une prestation, tandis que le visiteur, le compte non administrateur et l'ancienne session révoquée ne peuvent effectuer aucune mutation ni lire une prestation masquée.
- **SC-002**: Un utilisateur cible non technique peut créer une prestation complète et la retrouver dans le catalogue public en moins de 2 minutes, sans aide autre que les libellés et messages de l'interface.
- **SC-003**: Une matrice canonique de 28 cas — 4 pour le nom, 4 pour la description, 8 pour le prix, 5 pour la durée, 4 pour le badge et 3 pour l'ordre — couvre les bornes valides, les valeurs immédiatement hors bornes, les absences autorisées et les valeurs non entières lorsque pertinentes. Les 28 résultats sur 28 correspondent aux règles documentées et aucune saisie refusée ne produit de mutation partielle.
- **SC-004**: Après chacun des cinq changements confirmés — création active, modification, masquage, réactivation et suppression — le nouvel état est visible dans l'administration immédiatement après confirmation et sur une nouvelle consultation publique en moins de 5 secondes, sans déploiement.
- **SC-005**: Un jeu de 40 prestations réparties dans les trois catégories est restitué dans le même ordre lors de 20 actualisations consécutives, y compris lorsque plusieurs éléments partagent la même valeur d'ordre, sans pagination ni élément perdu ou dupliqué.
- **SC-006**: Les huit prestations publiques présentes avant la bascule conservent 100 % de leurs noms, descriptions, présentations de prix, montants, durées, badges, catégories et ordre relatif lors de la première consultation utilisant la source administrable.
- **SC-007**: Dans 100 % des tests des trois types de prix, des durées présentes ou absentes, des badges présents ou absents et des statuts actif ou masqué, le catalogue public affiche le libellé attendu, ne révèle aucun contenu masqué et ne laisse aucun emplacement vide incohérent.
- **SC-008**: Les parcours de liste, création, modification, masquage, réactivation et suppression sont réalisables sans souris, sans débordement horizontal à 320 px, 768 px et 1 024 px, avec 100 % des contrôles nommés et un focus perceptible.
- **SC-009**: Pendant une réponse volontairement retardée, l'état d'attente devient visible et annoncé en 1 000 ms maximum ; toutes les activations supplémentaires avant la fin produisent exactement une mutation au total.
- **SC-010**: Lors d'un test utilisateur guidé standardisé, un utilisateur cible non technique part du même jeu initial et reçoit successivement cinq consignes — retrouver une prestation masquée, créer une prestation, modifier son prix, la masquer puis la supprimer. Au moins 4 tâches sur 5 sont accomplies chacune lors d'une première tentative ininterrompue, sans indice de l'observateur ni redémarrage de la tâche, et aucune action destructive n'est déclenchée sans confirmation explicite.
- **SC-011**: Après la fonctionnalité, les pages publiques `/`, `/services`, `/galerie` et `/contact` conservent leurs adresses, leur navigation, leurs titres et textes hors données de prestations, leurs destinations de liens, leur ordre de sections et l'absence de débordement horizontal aux largeurs 320 px, 768 px et 1 024 px.
- **SC-012**: Les contrôles des messages utilisateur et sorties partageables trouvent 0 secret, jeton, cookie, trace, requête brute, détail d'infrastructure ou donnée de session.
- **SC-013**: Dans 100 % d’une matrice comprenant création valide, limites 2/80 caractères, ordre 0/maximal, doublon casse/espaces et tentative non-admin, seule la création valide autorisée persiste une catégorie.
- **SC-014**: Un utilisateur cible non technique crée une catégorie, la sélectionne pour une prestation et retrouve la prestation dans la nouvelle section publique en moins de 3 minutes, sans aide ni modification de code.
- **SC-015**: Dans 100 % d’une matrice comprenant renommage valide, changement d’ordre, doublon normalisé, cible absente, tentative non-admin, suppression référencée et suppression vide, seuls le renommage autorisé et la suppression vide persistent ; le code reste identique et aucune prestation n’est supprimée implicitement.
- **SC-016**: Lors d’un test utilisateur standardisé, un utilisateur cible non technique renomme une catégorie, comprend le refus de suppression lorsqu’elle est utilisée, retire sa dernière prestation puis supprime la catégorie en moins de 3 minutes, sans aide et sans suppression non confirmée.

## Assumptions

- Les fonctionnalités `001-supabase-foundation` et `002-admin-authentication` sont disponibles et fournissent respectivement le catalogue persistant avec ses règles d'accès et l'espace administrateur protégé.
- Le MVP utilise un seul niveau de droit administrateur et un faible volume d'environ 40 prestations ; aucune collaboration simultanée ni résolution avancée de conflits n'est nécessaire.
- En cas de modifications concurrentes exceptionnelles, la dernière mutation confirmée devient l'état courant ; une cible disparue ou devenue indisponible produit un message récupérable plutôt qu'un faux succès.
- Les trois catégories initiales conservent leurs photographies configurées par le produit. Le nom et l’ordre de toutes les catégories sont administrables ; leur code reste stable et les catégories sans présentation dédiée utilisent le fallback générique.
- Tous les prix sont exprimés en euros et saisis en contexte français ; aucune taxe, remise, devise secondaire ou calcul de total ne fait partie de la fonctionnalité.
- Le champ d'image associé à une prestation reste inutilisé dans ce périmètre ; les visuels publics demeurent ceux des catégories existantes.
- L'action « Réserver » conserve son sens actuel de prise de contact et n'ouvre pas un système de réservation.
- Les huit prestations actuellement codées en dur constituent le jeu initial à reprendre ; aucun import générique ni saisie d'autres données de démonstration n'est attendu.
- Une nouvelle consultation publique correspond à une ouverture ou une actualisation de la page après confirmation administrative ; les onglets déjà rendus ne sont pas mis à jour en temps réel.
- L'histoire 1 constitue un premier incrément vérifiable de consultation administrative, pas le MVP fonctionnel complet de gestion des prestations. Le MVP de cette fonctionnalité n'est atteint qu'après livraison des cinq histoires et de leur intégration croisée.
