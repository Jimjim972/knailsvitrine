# Feature Specification: Authentification administrateur

**Feature Branch**: `002-admin-authentication` *(contexte Spec Kit ; branche Git de travail actuelle : `dev`)*

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "002-admin-authentication"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Se connecter à l'administration (Priority: P1)

L'administrateur ouvre la page de connexion, saisit son adresse e-mail et son mot de passe, puis accède à un accueil administratif minimal qui confirme qu'il se trouve dans l'espace protégé et lui permet de se déconnecter.

**Why this priority**: Sans connexion fiable, aucune future fonction de gestion des prestations ou de la galerie ne peut être mise à disposition en sécurité.

**Independent Test**: Utiliser un compte administrateur créé au préalable, soumettre des identifiants valides depuis la page de connexion et vérifier l'accès à l'accueil administratif ainsi que la présence de l'action de déconnexion, sans dépendre d'un écran CRUD.

**Acceptance Scenarios**:

1. **Given** un administrateur autorisé sans session active, **When** il soumet une adresse e-mail et un mot de passe valides, **Then** il accède à l'accueil administratif protégé.
2. **Given** une adresse inconnue ou un mot de passe incorrect, **When** le formulaire est soumis, **Then** l'accès est refusé et un même message générique est affiché sans révéler quel identifiant est incorrect.
3. **Given** un compte valide mais sans droit administrateur, **When** ses identifiants sont soumis, **Then** l'accès administratif est refusé et aucune session donnant accès à l'administration n'est conservée.
4. **Given** une session administrateur déjà valide, **When** la page de connexion est ouverte, **Then** l'utilisateur est dirigé vers l'accueil administratif sans devoir se reconnecter.

---

### User Story 2 - Rester protégé pendant toute la session (Priority: P2)

L'administrateur peut parcourir et actualiser les pages protégées tant que sa session et son autorisation restent valides. Une personne non connectée, non administratrice ou dont la session n'est plus valide ne peut voir ni utiliser l'administration.

**Why this priority**: Une simple page de connexion ne protège pas les accès directs, les actions sensibles, les sessions révoquées ou les changements de rôle.

**Independent Test**: Exécuter la même matrice d'accès à une page protégée et à une action sensible avec un visiteur, un compte non administrateur, un administrateur courant et un ancien contexte administrateur révoqué, puis comparer chaque résultat aux droits attendus.

**Acceptance Scenarios**:

1. **Given** un visiteur sans session, **When** il demande directement une adresse sous `/admin` autre que la page de connexion, **Then** il est dirigé vers la page de connexion sans recevoir de contenu administratif.
2. **Given** un administrateur dont la session et le droit restent valides, **When** il navigue entre des pages protégées ou actualise la page, **Then** son accès est maintenu sans nouvelle saisie des identifiants.
3. **Given** une session expirée ou révoquée, **When** une page protégée ou une action sensible est demandée, **Then** l'accès est refusé, l'utilisateur est invité à se reconnecter et l'opération n'est pas exécutée.
4. **Given** un ancien contexte qui affirme encore un rôle administrateur mais dont la session a été retirée, **When** il tente un accès protégé, **Then** il est traité comme non autorisé.
5. **Given** une interface protégée déjà affichée, **When** le droit administrateur est absent lors d'une action sensible, **Then** l'action est refusée indépendamment de ce qui reste visible dans le navigateur.

---

### User Story 3 - Se déconnecter explicitement (Priority: P3)

L'administrateur peut terminer sa session courante depuis l'espace protégé et revenir à la page de connexion, notamment avant de quitter un appareil partagé.

**Why this priority**: La déconnexion réduit le risque qu'une autre personne réutilise une session ouverte sur le même appareil.

**Independent Test**: Se connecter, utiliser l'action de déconnexion, puis tenter de revenir à l'administration par navigation directe, actualisation et historique du navigateur.

**Acceptance Scenarios**:

1. **Given** une session administrateur valide, **When** l'administrateur choisit « Se déconnecter », **Then** sa session courante prend fin et la page de connexion est affichée.
2. **Given** une déconnexion réussie, **When** l'utilisateur redemande une page protégée ou utilise l'historique du navigateur, **Then** aucune donnée privée ni commande administrative active n'est restaurée, et toute nouvelle interaction ou demande protégée est refusée jusqu'à une nouvelle connexion.
3. **Given** plusieurs onglets utilisant la même session, **When** la déconnexion est effectuée dans un onglet, **Then** la prochaine demande protégée dans chaque autre onglet est refusée.

---

### User Story 4 - Comprendre et utiliser le parcours sur tout écran (Priority: P4)

L'administrateur peut accomplir la connexion et la déconnexion au clavier, au toucher et avec une technologie d'assistance, depuis un téléphone comme depuis un ordinateur, avec des états de formulaire explicites.

**Why this priority**: L'administration doit être utilisable quotidiennement par une personne non technique, y compris sur mobile, sans ambiguïté lors d'une attente ou d'une erreur.

**Independent Test**: Exécuter le parcours complet à 320 px, 768 px et 1 024 px, uniquement au clavier puis avec un lecteur d'écran, en contrôlant les libellés, le focus, l'annonce des états et l'absence de double soumission.

**Acceptance Scenarios**:

1. **Given** le formulaire de connexion affiché, **When** l'utilisateur le parcourt uniquement au clavier, **Then** chaque champ et action est atteint dans un ordre logique avec un focus visible.
2. **Given** une soumission en cours, **When** l'utilisateur tente de soumettre à nouveau, **Then** une seule tentative est traitée et l'état d'attente est annoncé.
3. **Given** une erreur récupérable, **When** le formulaire est réaffiché, **Then** l'adresse e-mail non sensible est conservée, le mot de passe n'est pas réaffiché et le message est annoncé sans détail technique.
4. **Given** l'une des largeurs cibles, **When** la page de connexion est affichée, **Then** tous les champs, messages et actions restent lisibles et utilisables sans débordement horizontal.

### Edge Cases

- Les espaces superflus autour de l'adresse e-mail sont ignorés et la casse de l'adresse ne doit pas empêcher une connexion autrement valide.
- Une adresse vide, mal formée, dépassant 254 caractères ou un mot de passe vide est refusé avant toute tentative de connexion, avec une erreur associée au champ concerné.
- Une adresse inconnue et un mot de passe incorrect produisent le même message public et ne permettent pas de déduire l'existence d'un compte.
- Une limitation temporaire des tentatives, une indisponibilité réseau ou une indisponibilité du service produit un message récupérable sans afficher de détail d'infrastructure.
- Une session qui expire pendant l'affichage d'une page protégée ne permet pas à la prochaine navigation ou action sensible d'aboutir.
- La suppression de la session ou du rôle administrateur prend effet à la prochaine vérification protégée, même si le navigateur possède encore d'anciennes informations.
- Une destination de retour absente, invalide ou extérieure au site est ignorée au profit de l'accueil administratif afin d'éviter une redirection hors du site.
- L'utilisation du bouton Retour après une déconnexion ne doit restaurer ni donnée privée, ni commande administrative active ; toute nouvelle interaction ou demande protégée reste refusée.
- Une erreur de déconnexion ne doit pas afficher un faux succès ; l'utilisateur reçoit un état compréhensible et peut réessayer sans exposer ses informations de session.
- Si l'authentification réussit mais que le droit administrateur ne peut pas être confirmé, aucun accès n'est accordé et le système tente de nettoyer le contexte local créé. Si ce nettoyage ne peut pas être confirmé, l'indisponibilité reste récupérable, aucun succès ni fin de session ne sont annoncés et toute demande administrative continue d'être refusée.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST fournir une page de connexion à l'adresse `/admin/connexion` avec un champ d'adresse e-mail, un champ de mot de passe et une action de connexion.
- **FR-002**: Le système MUST permettre la connexion uniquement avec un compte existant créé par un mécanisme administratif protégé ; aucune inscription publique, invitation publique ou connexion anonyme ne doit être proposée.
- **FR-003**: Après suppression des espaces périphériques et normalisation de la casse, le système MUST valider que l'adresse e-mail contient entre 1 et 254 caractères et respecte un format e-mail valide, ainsi que la présence du mot de passe, avant de demander l'authentification. Cette validation ne MUST pas introduire de nouvelle règle de création de mot de passe.
- **FR-004**: Le système MUST autoriser l'accès administratif uniquement lorsque l'identité, la session courante et le droit administrateur contrôlé par le service sont tous valides au moment du contrôle. L'identité est valide lorsqu'elle est reconnue par le service d'identité ; la session courante est valide lorsqu'elle appartient à cette identité, existe encore auprès du service et n'est pas expirée ; le droit administrateur est valide uniquement lorsqu'il provient d'une autorité protégée non modifiable par l'utilisateur.
- **FR-005**: Le système MUST refuser l'accès administratif à un compte connecté sans droit administrateur et MUST tenter de mettre fin au contexte local créé par cette tentative avant d'afficher le refus. Si l'authentification réussit mais que le droit administrateur ou le nettoyage local ne peut pas être confirmé, aucun accès administratif ne MUST être accordé, aucun succès ni fin de session ne MUST être annoncé et le système MUST retourner une indisponibilité récupérable tout en continuant de refuser les demandes administratives.
- **FR-006**: Pour une adresse inconnue, un mot de passe incorrect ou un compte non autorisé, le système MUST exposer le même texte visible, la même catégorie publique, la même structure d'état du formulaire et la même annonce accessible, sans confirmer l'existence d'un compte ni son rôle. L'égalisation artificielle du temps de traitement entre ces cas reste hors périmètre.
- **FR-007**: Le système MUST diriger toute personne non connectée qui demande une page protégée sous `/admin` vers `/admin/connexion` sans lui fournir le contenu protégé.
- **FR-008**: La page `/admin/connexion` MUST rester accessible sans session et MUST diriger vers `/admin` un administrateur déjà autorisé, sans réutiliser une destination de retour fournie à cette ouverture.
- **FR-009**: Après une nouvelle connexion réussie, le système MUST utiliser la destination initialement demandée seulement si, après normalisation, son chemin est `/admin` ou commence par `/admin/`, sans être `/admin/connexion` ni l'un de ses descendants. La destination MUST être relative à l'origine du site, MUST pouvoir conserver ses paramètres de requête et MUST être rejetée si elle contient un fragment, une origine absolue ou protocol-relative, une barre oblique inverse, un caractère de contrôle ou un encodage ambigu ; toute destination absente ou rejetée MUST devenir `/admin`.
- **FR-010**: Le système MUST maintenir l'accès au fil des navigations et actualisations tant que la session et le droit administrateur restent valides.
- **FR-011**: Le système MUST revérifier l'autorisation au plus près de chaque lecture administrative et de chaque action sensible, définie ici comme une action qui lit ou modifie des données administratives ; une redirection ou un contenu masqué ne peut pas constituer l'unique contrôle. La déconnexion, qui nettoie uniquement la session courante sans lire ni modifier de donnée métier, MUST rester possible lorsque le rôle administrateur vient d'être retiré.
- **FR-012**: Le système MUST refuser une session expirée, révoquée ou privée du droit administrateur avant de restituer des données protégées ou d'exécuter une action sensible.
- **FR-013**: Le système MUST permettre à l'administrateur de terminer explicitement sa session courante depuis l'espace protégé.
- **FR-014**: Après une déconnexion réussie, le système MUST diriger l'utilisateur vers `/admin/connexion` et MUST refuser toute nouvelle demande protégée jusqu'à une nouvelle connexion valide.
- **FR-015**: Le système MUST fournir un accueil `/admin` minimal, protégé, qui indique clairement le contexte « Administration » et propose la déconnexion sans présenter de fonctionnalité CRUD non encore livrée comme disponible.
- **FR-016**: Le formulaire MUST empêcher les doubles soumissions, exposer un état d'attente et n'afficher un succès ou une redirection qu'après confirmation réelle de l'opération.
- **FR-017**: Après une erreur récupérable, le formulaire MUST conserver l'adresse e-mail saisie, MUST vider le mot de passe et MUST associer chaque erreur de validation au champ concerné.
- **FR-018**: Les erreurs MUST distinguer pour l'utilisateur une saisie invalide, un refus de connexion, une limitation temporaire et une indisponibilité, tout en excluant les traces, détails internes, secrets, jetons, mots de passe et informations permettant d'énumérer les comptes.
- **FR-019**: Les événements techniques nécessaires au diagnostic MUST utiliser uniquement une catégorie autorisée, une phase de traitement et un identifiant de corrélation opaque. Les catégories minimales sont : validation, refus d'authentification, refus d'autorisation, limitation temporaire, indisponibilité du service d'identité, indisponibilité du contrôle d'autorisation et échec de déconnexion. Une sortie partageable comprend les réponses destinées au client, consoles, journaux de développement ou d'intégration, rapports de tests et documents de transmission ; elle ne MUST contenir ni adresse e-mail complète, mot de passe, secret, jeton, cookie, identifiant ou contenu de session, affirmations d'identité complètes, erreur brute, trace d'exécution ou objet du fournisseur.
- **FR-020**: Les pages et contrôles de cette fonctionnalité MUST être utilisables à 320 px, 768 px et 1 024 px, au clavier et au toucher, avec des libellés visibles, un focus contrasté, des cibles d'au moins 44 × 44 px et des annonces de statut accessibles.
- **FR-021**: L'interface MUST reprendre l'identité visuelle et les règles d'extension de l'administration déjà définies pour le produit, sans modifier le rendu des pages publiques.
- **FR-022**: Les données propres à une session, les réponses d'authentification et les pages administratives MUST rester isolées de toute restitution partagée entre utilisateurs, ne MUST jamais être placées dans un cache partagé ni être réutilisées entre utilisateurs, et leurs réponses MUST être privées et non stockables. Après une déconnexion ou une perte d'autorisation, aucune réponse administrative privée ne MUST pouvoir être restaurée depuis un cache applicatif, intermédiaire ou navigateur comme contenu encore utilisable.

### Scope Boundaries

**Included**:

- page de connexion par adresse e-mail et mot de passe ;
- validation, états d'attente et messages d'erreur du formulaire ;
- vérification de l'identité, de la session courante et du droit administrateur ;
- maintien de session lors des navigations et actualisations ;
- protection des pages administratives et contrôle des actions sensibles ;
- accueil administratif minimal et déconnexion de la session courante ;
- comportement responsive et accessible du parcours.

**Excluded**:

- inscription publique, création de compte depuis l'application et gestion de plusieurs administrateurs ;
- récupération ou modification de mot de passe, invitation, connexion sans mot de passe, fournisseur social et authentification multifacteur ;
- gestion de plusieurs rôles ou niveaux de permission ;
- CRUD des prestations et de la galerie ;
- import de contenu, cache public, formulaire de contact et déploiement de production ;
- révocation globale de toutes les sessions depuis l'interface.

### Key Entities *(include if feature involves data)*

- **Compte administrateur**: Identité existante créée hors du parcours public, associée à une adresse e-mail et à un droit administrateur contrôlé par le service.
- **Session administrateur**: Contexte temporaire reliant un navigateur à un compte administrateur ; il possède un état courant, une validité et une fin explicite ou automatique.
- **Droit administrateur**: Autorisation attribuée par une autorité protégée, distincte des informations modifiables librement par le titulaire et requise en plus de l'identité.
- **Destination de retour**: Adresse protégée interne demandée avant la connexion ; elle est utilisée après succès seulement si elle appartient au périmètre administratif autorisé.
- **État de connexion**: Résultat du formulaire comprenant les erreurs de champs, l'attente, le refus générique, l'indisponibilité ou la réussite, sans conserver le mot de passe.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des contrôles d'accès réussissent pour les cinq contextes testés : visiteur, identifiants invalides, compte non administrateur, ancien contexte administrateur révoqué et administrateur courant.
- **SC-002**: Lors d'un test utilisateur guidé avec un utilisateur cible sachant utiliser une connexion e-mail/mot de passe mais sans connaissance technique du projet, sur un navigateur moderne et une connexion stable, le chronomètre démarre lorsque le formulaire est entièrement utilisable et s'arrête lorsque le contexte « Administration » de l'accueil protégé est visible ; le parcours doit durer moins de 60 secondes sans autre instruction que l'objectif « accéder à l'administration ».
- **SC-003**: Un cycle comprend une navigation protégée vers `/admin`, la vérification du contexte « Administration », une actualisation complète de `/admin`, puis une seconde vérification de ce contexte. Avec une session et un droit valides, 20 cycles consécutifs — soit 40 demandes protégées vérifiées — MUST maintenir l'accès sans afficher la connexion ; après expiration, suppression de session ou retrait du droit, la toute première demande protégée suivante MUST être refusée dans 100 % des cas.
- **SC-004**: 100 % des essais avec une adresse inconnue, un mot de passe incorrect ou un compte non administrateur exposent le même texte visible, la même catégorie publique, la même structure d'état et la même annonce accessible. Ces sorties publiques révèlent 0 information sur l'existence ou le rôle du compte ; les différences temporelles intrinsèques au service d'identité ne font pas partie de cette mesure et aucune égalisation artificielle n'est requise dans ce MVP.
- **SC-005**: 100 % des déconnexions contrôlées empêchent ensuite l'accès par adresse directe, actualisation, historique du navigateur et autre onglet : aucune donnée privée ni commande administrative active n'est restituée, et la première interaction ou demande protégée suivante est refusée jusqu'à une nouvelle connexion valide.
- **SC-006**: À partir de la première activation de la soumission et pendant une réponse d'authentification volontairement retardée, un état d'attente visible et annoncé MUST apparaître en 1 000 ms maximum. Toutes les activations supplémentaires effectuées avant la fin de cette réponse MUST appartenir à la même tentative et produire exactement une soumission reçue par l'application et une vérification des identifiants au total.
- **SC-007**: Le parcours complet de connexion, d'erreur et de déconnexion est réalisable sans souris, sans débordement horizontal aux largeurs 320 px, 768 px et 1 024 px, avec 100 % des contrôles possédant un nom et un focus perceptibles.
- **SC-008**: Les contrôles de sécurité et de journalisation trouvent 0 mot de passe, secret, jeton, contenu de session, trace interne ou adresse e-mail complète dans les messages destinés à l'utilisateur et les sorties partageables.
- **SC-009**: Aucune route ou action publique testée ne permet de créer un compte, et 100 % des tentatives directes d'auto-inscription restent refusées sans création résiduelle.
- **SC-010**: Après l'ajout du parcours d'authentification, les pages publiques `/`, `/services`, `/galerie` et `/contact` doivent conserver, par rapport à la référence pré-changement décrite dans `doc/design.md` et consignée avant le déplacement des routes, leur URL, leur Header/Footer, leurs titres et textes visibles, leurs destinations de liens, leur ordre de sections et l'absence de débordement horizontal à 320 px, 768 px et 1 024 px.

## Assumptions

- La fondation `001-supabase-foundation` est disponible : elle fournit le service d'identité, le compte créé manuellement, le droit administrateur protégé, le contrôle des sessions révoquées et la fermeture de l'auto-inscription.
- Un seul niveau de droit administrateur existe dans le MVP ; l'attribution et le retrait de ce droit restent des opérations de maintenance protégées hors de l'interface.
- Le propriétaire du projet dispose déjà d'une procédure protégée pour créer le premier compte, attribuer son droit et révoquer ses sessions si nécessaire.
- La durée de validité et le renouvellement d'une session suivent la configuration du service d'identité existant ; cette fonctionnalité n'ajoute ni option « Se souvenir de moi » ni durée personnalisée.
- La déconnexion termine la session courante utilisée par le navigateur. La révocation globale de toutes les sessions reste une procédure de maintenance distincte.
- L'accueil administratif minimal sert de destination sûre avant la livraison des fonctionnalités CRUD et n'affiche aucun bouton sans effet vers des fonctions non construites.
- L'administrateur utilise une version moderne de Chrome, Safari, Firefox ou Edge ; Safari mobile fait partie des contrôles prioritaires.
- Les parcours de récupération de mot de passe et d'authentification renforcée pourront être spécifiés ultérieurement si l'exploitation réelle les rend nécessaires.
