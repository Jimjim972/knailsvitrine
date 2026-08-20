# Feature Specification: Formulaire de contact fonctionnel

**Feature Branch**: `005-contact-form` *(identifiant de fonctionnalité ; aucune branche Git créée par ce workflow)*

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "005-contact-form remplacement du faux formulaire actuel ; 1. envoi réel avec Netlify Forms ; 2. validation ; 3. protection anti-spam ; 4. états de réussite et d’erreur"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Envoyer une demande réellement reçue (Priority: P1)

Un visiteur renseigne son nom, son e-mail, un téléphone facultatif et son message depuis la page Contact. Après l'envoi, il reçoit une confirmation uniquement lorsque Netlify accuse positivement réception de la requête. La plateforme peut ensuite classer la soumission comme vérifiée ou indésirable dans son interface de gestion.

**Why this priority**: Le formulaire actuel simule un succès sans transmettre le message. Remplacer ce faux parcours par une réception vérifiable est la valeur principale de la fonctionnalité.

**Independent Test**: Depuis un déploiement Netlify de contrôle, envoyer une demande valide avec un contenu réaliste, vérifier que la réponse HTTP est positive avant l'affichage du succès, contrôler le classement de la soumission dans l'interface Netlify, puis confirmer la réception d'une notification automatique par l'institut.

**Acceptance Scenarios**:

1. **Given** un visiteur sur la page Contact avec un formulaire neutre, **When** il saisit des valeurs valides et confirme l'envoi, **Then** l'interface passe immédiatement à l'état d'envoi en cours et empêche une seconde confirmation simultanée.
2. **Given** une demande valide en cours d'envoi, **When** Netlify renvoie une réponse HTTP positive, **Then** un message d'envoi réussi est annoncé, les champs sont réinitialisés et la soumission peut ensuite être contrôlée dans l'interface Netlify.
3. **Given** une demande dont le téléphone est vide, **When** les autres champs sont valides et Netlify renvoie une réponse HTTP positive, **Then** la demande est transmise sans inventer de numéro et le succès réel est annoncé.
4. **Given** un succès déjà affiché, **When** le visiteur commence une nouvelle saisie, **Then** le formulaire revient à un état neutre sans conserver la confirmation de la demande précédente comme résultat de la nouvelle.
5. **Given** une soumission classée vérifiée, **When** Netlify termine son traitement, **Then** une notification automatique contenant les champs attendus est envoyée à l'adresse opérationnelle configurée pour l'institut et son `Reply-To` correspond à l'e-mail du visiteur.

---

### User Story 2 - Corriger une saisie invalide sans perdre son message (Priority: P2)

Un visiteur qui oublie un champ obligatoire ou saisit une valeur invalide comprend précisément ce qui doit être corrigé. Les erreurs sont placées au niveau des champs concernés, les autres valeurs restent disponibles et aucune demande invalide n'est présentée comme reçue.

**Why this priority**: Une réception réelle ne suffit pas si les coordonnées sont inutilisables ou si une erreur oblige le visiteur à recommencer son message.

**Independent Test**: Soumettre successivement les bornes valides et invalides de chaque champ, au clavier et sans souris, puis vérifier l'association des erreurs, la conservation des valeurs récupérables, le déplacement du focus vers la première erreur et l'absence de soumission invalide reçue.

**Acceptance Scenarios**:

1. **Given** un ou plusieurs champs obligatoires vides ou composés uniquement d'espaces, **When** le visiteur confirme, **Then** l'envoi est bloqué, chaque champ concerné expose une erreur compréhensible et le premier champ invalide reçoit le focus.
2. **Given** un e-mail ou un téléphone renseigné dans un format refusé, **When** le visiteur confirme, **Then** aucune demande n'est acceptée, l'erreur est associée au champ concerné et le message déjà saisi est conservé.
3. **Given** une valeur qui dépasse la longueur autorisée, **When** le visiteur confirme ou atteint la limite visible, **Then** la règle applicable est expliquée sans tronquer silencieusement la donnée ni annoncer de succès.
4. **Given** des erreurs affichées, **When** le visiteur corrige les valeurs puis renvoie le formulaire, **Then** les erreurs résolues disparaissent et la demande suit le parcours normal sans rechargement obligatoire de la page.
5. **Given** une tentative qui contourne les contrôles du navigateur, **When** ses données ne respectent pas les règles de la fonctionnalité, **Then** elle n'est pas traitée comme une demande valide ni présentée à l'utilisateur comme reçue.

---

### User Story 3 - Comprendre un échec et réessayer sûrement (Priority: P3)

Lorsqu'un problème réseau ou une indisponibilité empêche de confirmer la réception, le visiteur voit un message utile, conserve sa saisie et peut réessayer. Aucun résultat ambigu n'est transformé en faux succès ; un identifiant opaque stable permet de repérer d'éventuels doublons après un délai dépassé.

**Why this priority**: Les erreurs externes sont inévitables ; le parcours doit rester honnête et récupérable pour éviter la perte silencieuse d'une prise de contact commerciale.

**Independent Test**: Simuler une absence de réseau, un délai excessif et un refus de la plateforme, puis vérifier l'état d'erreur, la conservation intégrale des champs, la disponibilité d'un réessai, l'absence de message de succès et la réutilisation de l'identifiant de tentative lors d'un réessai ambigu.

**Acceptance Scenarios**:

1. **Given** une demande valide, **When** la réception échoue ou n'est pas confirmée, **Then** un message d'erreur actionnable est annoncé, aucune confirmation de réception n'est affichée et toutes les valeurs saisies restent présentes.
2. **Given** un état d'erreur récupérable, **When** le visiteur réessaie après le retour du service, **Then** le formulaire repasse par l'état d'envoi, conserve l'identifiant de corrélation après une issue ambiguë et affiche un succès uniquement après une réponse HTTP positive.
3. **Given** une réponse lente, **When** le visiteur active plusieurs fois le bouton ou la touche Entrée, **Then** une seule tentative reste active, l'attente est visible et le contrôle d'envoi reste indisponible jusqu'au résultat.
4. **Given** une erreur technique, **When** elle est présentée au visiteur ou consignée pour diagnostic, **Then** aucun détail interne, contenu complet du message, secret, jeton ou trace technique n'est exposé.

---

### User Story 4 - Écarter les soumissions automatisées évidentes (Priority: P4)

Le formulaire réduit les messages indésirables sans imposer d'étape visible supplémentaire aux visiteurs ordinaires. Les tentatives identifiées comme automatisées ne rejoignent pas les demandes vérifiées et la protection ne révèle pas son fonctionnement détaillé au robot.

**Why this priority**: Un formulaire public non protégé dégrade rapidement la boîte de réception et peut consommer inutilement les ressources de l'offre d'hébergement.

**Independent Test**: Envoyer une demande humaine réaliste, une demande remplissant le champ leurre et des contenus de test classés comme indésirables, puis vérifier que seule la demande humaine apparaît parmi les soumissions vérifiées et que le champ leurre reste absent du parcours visuel et accessible normal.

**Acceptance Scenarios**:

1. **Given** un visiteur humain qui remplit uniquement les champs visibles, **When** il envoie une demande valide, **Then** la protection invisible n'empêche pas la réception normale.
2. **Given** une tentative qui renseigne le champ leurre réservé aux robots, **When** elle est soumise, **Then** elle n'apparaît pas parmi les demandes vérifiées et aucune information exploitable sur la règle anti-spam n'est révélée.
3. **Given** une tentative classée comme indésirable par la plateforme, **When** elle est traitée, **Then** elle reste séparée des demandes vérifiées et ne déclenche aucune notification métier destinée à l'institut.
4. **Given** un utilisateur naviguant au clavier ou avec une technologie d'assistance, **When** il parcourt le formulaire, **Then** le mécanisme invisible n'ajoute aucun contrôle déroutant, non libellé ou focalisable au parcours normal.

### Edge Cases

- Les espaces périphériques sont supprimés avant validation ; une valeur obligatoire composée uniquement d'espaces est vide.
- Le nom accepte de 2 à 120 caractères après normalisation ; 1 et 121 caractères sont refusés.
- L'e-mail accepte au plus 254 caractères et doit posséder une structure d'adresse exploitable ; une valeur vide, sans domaine ou au-delà de la limite est refusée.
- Le téléphone reste facultatif. S'il est renseigné, il accepte de 6 à 30 caractères, contient au moins six chiffres et peut utiliser `+`, espaces, points, tirets et parenthèses ; toute autre valeur est refusée sans altérer les autres champs.
- Le message accepte de 10 à 2 000 caractères après normalisation ; 9 et 2 001 caractères sont refusés.
- Les accents, apostrophes, traits d'union et caractères français courants restent acceptés dans le nom et le message.
- Une soumission déclenchée deux fois rapidement, par double-clic ou par Entrée répétée, ne produit pas deux tentatives simultanées.
- Une réponse HTTP positive de Netlify, reçue par le POST AJAX autorisé par l'action serveur, constitue l'accusé de réception disponible côté navigateur. L'appel fournisseur expire après 10 secondes ; une réponse non positive, interrompue ou arrivée après cette limite est traitée comme une réception non confirmée, jamais comme un succès.
- Un retour tardif d'une tentative précédente ne doit pas remplacer l'état d'une tentative plus récente.
- Une tentative anti-spam refusée ne doit pas permettre de déduire précisément le filtre déclenché.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST remplacer le faux comportement actuel par une transmission réelle des demandes au service de réception Netlify Forms configuré pour le site.
- **FR-002**: Le formulaire MUST conserver exactement les champs visibles « Prénom & nom », « Téléphone », « E-mail » et « Message » ; le nom, l'e-mail et le message sont obligatoires, le téléphone est facultatif.
- **FR-003**: Le système MUST appliquer les règles de normalisation, de format et de longueur définies dans les cas limites avant de considérer une demande comme valide.
- **FR-004**: Les contrôles MUST être appliqués dans le navigateur pour un retour immédiat, dans une Server Action Zod qui autorise et normalise la tentative avant toute transmission fournisseur du parcours applicatif, puis par une garde Netlify Edge qui revalide tout POST déclarant le formulaire `contact`, y compris le POST AJAX fournisseur issu du parcours autorisé.
- **FR-005**: Chaque erreur de saisie MUST être formulée en français, associée au champ concerné, annoncée de manière accessible et MUST préserver toutes les autres valeurs récupérables.
- **FR-006**: Lors d'une soumission invalide, le focus MUST rejoindre le premier champ en erreur selon l'ordre visuel et aucune confirmation de réception ne MUST être affichée.
- **FR-007**: Le formulaire MUST présenter quatre états mutuellement compréhensibles : neutre, envoi en cours, envoi réussi et erreur récupérable.
- **FR-008**: Pendant l'envoi, l'action principale MUST être indisponible, son libellé ou son état MUST exprimer l'attente et les activations répétées MUST NOT créer plusieurs tentatives simultanées.
- **FR-009**: Le succès MUST être affiché uniquement après l'autorisation positive de la Server Action puis une réponse HTTP positive de Netlify au POST AJAX fournisseur ; il signifie que Netlify a pris en charge la requête, sans promettre son classement final parmi les soumissions vérifiées. Une validation locale, l'autorisation seule ou l'absence d'erreur immédiate ne suffit pas.
- **FR-010**: Après une réponse HTTP positive, le système MUST annoncer l'envoi, vider les quatre champs éditables et permettre une nouvelle demande indépendante.
- **FR-011**: La transmission fournisseur MUST expirer 10 secondes après le début du `fetch` navigateur vers le blueprint statique. En cas d'échec réseau, de dépassement de cette limite, de réponse non positive ou de refus du service, le système MUST afficher une erreur actionnable, conserver toutes les valeurs et permettre un réessai. Après un délai ou une interruption ambigus, le message MUST préciser que la réception n'a pas pu être confirmée.
- **FR-012**: Le formulaire MUST intégrer un champ leurre invisible aux visiteurs ordinaires et faire traiter les tentatives qui le remplissent comme indésirables sans exposer le détail de la détection.
- **FR-013**: Le filtrage anti-spam fourni par la plateforme MUST rester actif et les demandes identifiées comme indésirables MUST rester séparées des demandes vérifiées consultées par l'institut.
- **FR-014**: Le mécanisme anti-spam MUST NOT ajouter de contrôle focalisable ou annoncé au parcours humain normal ; tout défi visible futur exige une décision produit distincte.
- **FR-015**: Une soumission vérifiée MUST apparaître dans l'interface Netlify avec le nom, le téléphone facultatif, l'e-mail, le message, un identifiant opaque de corrélation et sa date de réception. Les réessais d'une issue ambiguë MUST réutiliser cet identifiant afin de rendre un doublon éventuel détectable.
- **FR-016**: Les demandes de contact MUST NOT être enregistrées dans les tables publiques Supabase ni ajoutées à un nouvel écran de boîte de réception dans `/admin`.
- **FR-017**: Les messages d'interface et les diagnostics MUST NOT exposer d'adresse interne, de secret, de jeton, de trace, de réponse brute du fournisseur ou de contenu intégral d'une demande.
- **FR-018**: Le formulaire MUST conserver sa structure visuelle, ses libellés, son bouton pleine largeur, son comportement responsive et les tokens définis dans le système de design existant.
- **FR-019**: Les états, erreurs et confirmations MUST être utilisables au clavier et au toucher, posséder un focus visible, être annoncés de manière appropriée et ne pas dépendre uniquement de la couleur.
- **FR-020**: La réception réelle, la détection du formulaire, la protection anti-spam et les quatre états MUST être vérifiés sur un déploiement Netlify représentatif avant la mise en production.
- **FR-021**: Netlify MUST notifier automatiquement l'adresse opérationnelle confirmée de l'institut pour chaque soumission vérifiée du formulaire `contact`, avec l'e-mail du visiteur comme `Reply-To`. Aucune autoréponse au visiteur n'est incluse dans cette fonctionnalité.

### Scope Boundaries

**Included**:

- remplacement du faux succès du formulaire de la page Contact ;
- transmission réelle des quatre champs existants et consultation des demandes reçues dans l'interface Netlify ;
- notification automatique des soumissions vérifiées à l'adresse opérationnelle de l'institut ;
- validation immédiate et validation non contournable des règles définies ;
- protection anti-spam invisible et filtrage fourni par la plateforme ;
- états neutre, envoi en cours, envoi réussi et erreur récupérable ;
- prévention des doubles soumissions, conservation des valeurs après erreur et réessai ;
- accessibilité clavier, annonces de statut et maintien du responsive existant ;
- vérification du parcours sur un déploiement Netlify représentatif.

**Excluded**:

- réservation de rendez-vous, choix de créneau ou paiement ;
- pièce jointe, image ou autre fichier dans une demande ;
- compte client, historique visiteur ou suivi de ticket ;
- boîte de réception, traitement ou archivage des demandes dans `/admin` ;
- stockage des messages dans Supabase, ajout d'une table de contact ou d'un second fournisseur de formulaires ;
- réponse automatique, campagne marketing, intégration CRM ou synchronisation avec un outil tiers ;
- accusé de réception envoyé par e-mail au visiteur ;
- modification des coordonnées, horaires, carte et autres contenus temporaires de la page Contact ;
- refonte visuelle de la page ou ajout initial d'un défi anti-spam visible.

### Key Entities *(include if feature involves data)*

- **Demande de contact**: Message transmis par un visiteur, composé d'un nom, d'un e-mail, d'un téléphone facultatif, d'un message et d'une date de réception gérée par la plateforme. Il ne constitue ni un compte client ni une réservation.
- **Tentative d'envoi**: Interaction temporaire qui porte les valeurs normalisées, un identifiant opaque de corrélation, un état neutre, en cours, réussi ou échoué et les éventuelles erreurs de champ. Une réponse HTTP positive confirme la prise en charge de la requête, pas son classement anti-spam final.
- **Classement de réception**: Résultat de la protection de la plateforme qui sépare les demandes vérifiées des tentatives indésirables sans exposer la règle de classement au visiteur.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur 10 envois humains valides et espacés effectués depuis un déploiement de contrôle, 10 réponses HTTP positives sur 10 déclenchent le succès et les soumissions correspondantes sont retrouvées dans Netlify avec les valeurs et identifiants attendus ; tout classement indésirable est contrôlé séparément.
- **SC-002**: La matrice contrôlée V01–V20 ci-dessous produit 20 résultats sur 20 conformes dans le navigateur, la Server Action et la garde Edge ; chaque cas accepté est transmis au contrat fournisseur avec ses valeurs normalisées et chaque cas refusé par l'action ou la garde reste absent de Netlify Forms.
- **SC-003**: Lors de trois échecs simulés — absence de réseau, expiration exactement 10 secondes après le début du `fetch` navigateur fournisseur et refus du service — 3 parcours sur 3 conservent les quatre valeurs, annoncent une erreur sans succès et permettent un réessai ; l'expiration conserve le même identifiant de corrélation et ne prétend pas que la réception a échoué.
- **SC-004**: Sur 20 activations rapides du contrôle d'envoi pendant une même réponse lente, une seule autorisation Server Action et un seul POST fournisseur sont actifs, avec un seul identifiant de corrélation.
- **SC-005**: Une tentative remplissant le champ leurre produit 0 demande dans la liste vérifiée, cinq demandes humaines réalistes produisent 5 demandes vérifiées, et l'interface de gestion du formulaire confirme que le filtrage natif et la protection supplémentaire sont actifs.
- **SC-006**: Sur un protocole fixé avant le test avec 10 adultes francophones représentatifs des visiteurs de l'institut et n'ayant participé ni à la conception ni à l'implémentation, chaque participant part d'un formulaire vierge sur une Deploy Preview, saisit d'abord une adresse e-mail sans domaine, corrige l'erreur indiquée puis envoie une demande valide. Le chronomètre démarre au premier focus dans le formulaire et s'arrête au succès visible. Au moins 9 participants sur 10 MUST terminer en 120 secondes maximum sans aide verbale ou physique. Seuls le résultat agrégé, les durées et les causes d'échec expurgées sont conservés.
- **SC-007**: Les parcours neutre, validation invalide, envoi, succès, erreur et réessai sont entièrement réalisables au clavier à 320 px, 768 px et 1 024 px, sans débordement horizontal, contrôle non nommé ou information transmise uniquement par la couleur.
- **SC-008**: Les contrôles automatisés et manuels retrouvent 0 faux succès, 0 contenu intégral de message dans les journaux applicatifs, 0 secret ou détail technique dans les retours utilisateur et 0 demande enregistrée dans les tables Supabase.
- **SC-009**: Après livraison, les pages `/services`, `/galerie` et les contenus hors formulaire de `/contact` conservent leur navigation, leur hiérarchie et leur comportement responsive aux largeurs de référence.
- **SC-010**: Sur un envoi humain classé vérifié et un échantillon classé spam, l'institut reçoit exactement une notification pour l'envoi vérifié, aucune pour le spam, et peut répondre directement à l'adresse du visiteur grâce au `Reply-To`.

### Controlled Validation Matrix SC-002

Dans chaque cas, les champs non mentionnés utilisent des valeurs valides. Les longueurs sont mesurées après suppression des espaces périphériques.

| ID | Valeur contrôlée | Résultat attendu |
| --- | --- | --- |
| V01 | Nom vide | Refus |
| V02 | Nom composé uniquement d'espaces | Refus |
| V03 | Nom de 1 caractère | Refus |
| V04 | Nom de 2 caractères | Acceptation |
| V05 | Nom de 120 caractères | Acceptation |
| V06 | Nom de 121 caractères | Refus |
| V07 | E-mail vide | Refus |
| V08 | E-mail sans domaine exploitable | Refus |
| V09 | E-mail valide de 254 caractères | Acceptation |
| V10 | E-mail de 255 caractères | Refus |
| V11 | Téléphone absent | Acceptation |
| V12 | Téléphone contenant 5 chiffres | Refus |
| V13 | Téléphone contenant exactement 6 chiffres | Acceptation |
| V14 | Téléphone local valide avec espaces ou tirets | Acceptation |
| V15 | Téléphone de 31 caractères | Refus |
| V16 | Téléphone contenant une lettre ou un symbole non autorisé | Refus |
| V17 | Message de 9 caractères | Refus |
| V18 | Message de 10 caractères | Acceptation |
| V19 | Message de 2 000 caractères | Acceptation |
| V20 | Message de 2 001 caractères | Refus |

## Assumptions

- Netlify Forms reste le service de réception imposé par la demande et la détection des formulaires est activée pour le site avant le déploiement de validation.
- L'interface Netlify des soumissions vérifiées est la boîte de réception opérationnelle du MVP ; aucune interface de lecture des demandes n'est créée dans l'application.
- Le dispositif anti-spam initial combine le filtrage natif de la plateforme et un champ leurre invisible. Un défi visible n'est ajouté que si des abus réels le justifient et après décision produit sur son impact utilisateur.
- Les visiteurs disposent d'une connexion suffisamment stable pour tenter un envoi ; toute interruption reste récupérable grâce à la conservation locale des valeurs et au réessai.
- Les demandes servent uniquement à une prise de contact générale. Le formulaire ne sollicite ni mot de passe, ni donnée de paiement, ni donnée médicale, ni pièce jointe.
- La vérification complète de réception et d'anti-spam nécessite un déploiement Netlify représentatif ; le développement local peut vérifier la validation et les états mais ne prouve pas la réception finale.
- La notification e-mail Netlify est configurée lors du déploiement vers l'adresse opérationnelle confirmée par l'institut. Cette adresse n'est pas versionnée et la notification ne remplace pas la présence vérifiable de la demande dans l'interface des soumissions.
- Netlify Forms ne fournit pas au navigateur le classement final vérifié ou indésirable dans sa réponse de soumission ; l'interface emploie donc le terme « envoyé » et non « vérifié ».
- Une interruption réseau peut survenir après la prise en charge distante. Le système empêche les requêtes concurrentes et corrèle les réessais, mais ne promet pas une livraison exactement une fois que le fournisseur ne garantit pas.
