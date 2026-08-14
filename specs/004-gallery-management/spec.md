# Feature Specification: Gestion de la galerie

**Feature Branch**: `004-gallery-management` *(identifiant de fonctionnalité ; aucune branche Git créée par ce workflow)*

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "004-gallery-management"

## Clarifications

### Session 2026-08-12

- Q: Comment garantir côté serveur qu’un objet envoyé directement à Storage contient réellement le WebP validé dans le navigateur ? → A: Avant tout passage à `ready`, la finalisation contrôle d’abord les métadonnées bornées, télécharge ensuite l’objet réservé de 1 Mio maximum avec la session administrateur, valide ses octets RIFF/WebP, ses dimensions et l’absence de métadonnées, puis nettoie ou conserve un état réparable si le contrôle échoue.
- Q: Comment reprendre les neuf JPEG statiques alors que toute nouvelle écriture Storage est limitée à WebP ? → A: Un bootstrap Node séparé utilise une version épinglée de `sharp` uniquement comme outil de développement pour produire neuf WebP déterministes, vérifiés par manifeste SHA-256 et par le même validateur d’octets avant réservation, upload et finalisation sous une session administrateur ; `sharp` n’entre ni dans le bundle client ni dans le runtime applicatif.
- Q: Comment une ligne dont l’objet Storage a disparu devient-elle durablement réparable ? → A: La carte publique masque localement toute image en échec ; dans l’administration, l’échec d’une miniature ou l’action de contrôle déclenche une Server Action réautorisée qui vérifie le chemin exact, passe la ligne à `repair_required/object_missing` si l’objet est absent et invalide immédiatement le tag public.
- Q: Quand une opération `pending` sans finalisation est-elle considérée comme abandonnée ? → A: À l’entrée dans la liste administrative, une Server Action réautorisée réconcilie les opérations `pending` commencées depuis au moins 10 minutes ; chacune devient `repair_required` avec un code fermé calculé depuis la présence de l’objet, sans nettoyage destructif automatique.
- Q: Une image PNG ou WebP animée fait-elle partie des formats entrants acceptés ? → A: Non. Seules les images fixes JPEG, PNG et WebP sont acceptées ; un APNG ou un WebP animé est refusé avant décodage complet et sans résidu.
- Q: Que garantit le masquage d’une photo, y compris si son adresse d’image a déjà été observée ? → A: Les fichiers de galerie restent privés et chaque demande d’octets est réautorisée contre l’état courant de la photo. Dès qu’une photo est masquée, `pending`, `repair_required`, supprimée ou associée à une session administrateur devenue invalide, la même adresse ne livre plus ses octets au demandeur non autorisé.
- Q: Comment vérifier objectivement la conservation de la transparence ? → A: Deux fixtures RGBA versionnées couvrent le chemin sans redimensionnement et le chemin redimensionné de 2 000 × 1 000 vers 1 600 × 800. La première fixe 25 positions et leur alpha 8 bits attendu, avec 0 et 255 exacts et un écart intermédiaire maximal de 1. La seconde utilise un gradient alpha horizontal analytique : ses 25 positions normalisées attendent `arrondi(255 × u)`, avec 0 et 255 exacts aux extrémités et un écart intermédiaire maximal de 3. La garantie porte sur le canal alpha visible, pas sur les composantes RGB cachées derrière un alpha nul.

### Session 2026-08-11

- Q: Lorsqu’un ajout, un remplacement ou une suppression laisse une photo et son fichier désynchronisés, que doit retrouver l’administrateur après avoir rechargé la page ? → A: La photo est masquée du public et conserve un état persistant « À réparer » avec une action de reprise jusqu’au retour à la cohérence.
- Q: Après avoir corrigé l’orientation de la photo, quelles métadonnées intégrées au fichier publié faut-il conserver ? → A: L’orientation est appliquée aux pixels, puis toutes les métadonnées intégrées sont supprimées du fichier publié.
- Q: Lorsqu’une section publique — galerie principale ou journal social — ne contient aucune photo active, que doit afficher la page ? → A: Chaque section vide est masquée ; si les deux sections sont vides, un message neutre unique annonce que de nouvelles réalisations seront bientôt publiées.
- Q: Quelles longueurs maximales faut-il appliquer aux champs facultatifs « Titre » et « Libellé » d’une photo ? → A: Le titre est limité à 120 caractères et le libellé à 40 caractères.
- Q: Quelle limite de dimensions faut-il appliquer avant de décoder et redimensionner une image pourtant inférieure à 8 Mio ? → A: L'image est refusée au-delà de 25 000 000 pixels au total ou si l'un de ses côtés dépasse 8 192 px.
- Q: Jusqu’à quelle dimension le traitement peut-il réduire une photo pour atteindre la limite finale de 1 Mio ? → A: Le côté le plus long ne descend pas sous 1 200 px, sauf si l'original est plus petit ; si 1 Mio reste impossible à cette borne, la photo est refusée.
- Q: Après traitement, dans quel format faut-il enregistrer chaque nouvelle image ou chaque remplacement ? → A: Chaque nouvel ajout ou remplacement est encodé en WebP, transparence comprise ; les anciens fichiers JPEG et PNG restent lisibles.
- Q: Lorsqu’une image source contient des zones transparentes, comment ces zones doivent-elles être enregistrées dans le fichier WebP final ? → A: Le canal alpha visible est conservé dans le WebP final selon l'oracle mesurable précisé lors de la session suivante.
- Q: Jusqu’à quel niveau de compression avec perte le traitement peut-il descendre pour respecter la limite de 1 Mio ? → A: À chaque dimension essayée, l'encodage WebP utilise successivement les qualités 0,85, 0,80 puis 0,75 au minimum ; si nécessaire, les dimensions sont ensuite réduites et la séquence recommence.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulter la galerie administrative (Priority: P1)

L'administrateur ouvre la gestion de la galerie depuis l'espace protégé et consulte toutes les photos, quelle que soit leur intention de visibilité active ou masquée et leur état de fichier `ready`, `pending` ou `repair_required`, avec leur miniature, leur variante d'affichage, leur ordre et leur statut. Il peut ainsi comprendre ce qui est publié et préparer une modification sans manipuler le code du site.

**Why this priority**: Une vue complète et fiable de la galerie est le point d'entrée de toutes les opérations quotidiennes et réduit le risque d'agir sur la mauvaise photo.

**Independent Test**: Préparer des photos actives et masquées couvrant les états `ready`, `pending` et `repair_required` dans les cinq variantes, ouvrir la galerie avec un administrateur autorisé, puis vérifier que chaque photo apparaît une seule fois avec ses informations de repérage, des états vide et erreur distincts et uniquement des actions fonctionnelles.

**Acceptance Scenarios**:

1. **Given** des photos dont l'intention est active ou masquée et dont l'état de fichier est `ready`, `pending` ou `repair_required`, **When** l'administrateur ouvre la liste, **Then** toutes les photos sont affichées avec une miniature, un texte alternatif ou titre de repérage, leur variante, leur ordre, leur intention de visibilité et un statut de fichier textuel non communiqué par la seule couleur.
2. **Given** plusieurs photos partageant un même ordre, **When** la liste est affichée ou actualisée, **Then** leur ordre relatif reste déterministe selon leur date de création puis un départage stable.
3. **Given** aucune photo enregistrée, **When** l'administrateur ouvre la liste, **Then** un état vide explique qu'aucune photo n'existe et propose l'ajout uniquement si le formulaire correspondant est fonctionnel.
4. **Given** un échec de chargement récupérable, **When** la liste ne peut pas être obtenue, **Then** aucun faux état vide n'est affiché, l'indisponibilité est expliquée et une nouvelle tentative est proposée.
5. **Given** l'accueil administratif protégé, **When** la fonctionnalité est livrée, **Then** un accès clairement nommé « Galerie » mène à la liste fonctionnelle.

---

### User Story 2 - Ajouter une photo prête à publier (Priority: P2)

L'administrateur sélectionne une image depuis son appareil, vérifie son aperçu, renseigne son texte alternatif, choisit sa variante, son ordre et sa visibilité, puis l'ajoute à la galerie. Le fichier est contrôlé et optimisé avant que l'opération soit confirmée.

**Why this priority**: L'ajout autonome de nouvelles réalisations répond au besoin central de faire vivre la galerie sans intervention technique ni nouveau déploiement.

**Independent Test**: Ajouter successivement une image JPEG, PNG et WebP valides, vérifier leur aperçu et leurs caractéristiques finales, puis soumettre des fichiers trop lourds, mal étiquetés ou non autorisés afin de confirmer qu'aucune photo ni aucun fichier résiduel n'est créé lors d'un refus.

**Acceptance Scenarios**:

1. **Given** un administrateur sur le formulaire d'ajout, **When** il choisit une image valide et renseigne les champs obligatoires, **Then** un aperçu correctement orienté dans la variante choisie et les dimensions, le format et le poids finaux sont présentés avant confirmation.
2. **Given** une image valide et des métadonnées valides, **When** l'administrateur confirme l'ajout, **Then** une seule photo est créée avec un chemin généré, un fichier correspondant et un succès réel annoncé.
3. **Given** un fichier non autorisé, vide, supérieur à 8 Mio, supérieur à 25 000 000 pixels, présentant un côté supérieur à 8 192 px ou dont le contenu réel ne correspond pas à un format accepté, **When** il est sélectionné ou soumis, **Then** l'ajout est refusé avec une explication compréhensible et aucun résidu n'est conservé.
4. **Given** un texte alternatif absent ou invalide, **When** le formulaire est soumis, **Then** aucune photo n'est publiée, l'erreur est associée au champ et les autres valeurs récupérables restent disponibles.
5. **Given** une interruption après le transfert de l'objet réservé mais avant sa finalisation, **When** l'ajout ne peut pas être finalisé, **Then** cet objet réservé non finalisé est retiré avec annulation de la réservation ou, si ce nettoyage échoue, l'opération conserve après rechargement l'état « À réparer » avec une action de reprise ; aucun succès n'est annoncé.
6. **Given** une soumission en cours, **When** l'administrateur réactive l'action d'ajout, **Then** une seule opération est traitée et l'attente est visible et annoncée.

---

### User Story 3 - Modifier, classer, masquer ou remplacer une photo (Priority: P3)

L'administrateur corrige les informations d'une photo, change sa variante ou son ordre, la masque temporairement ou remplace son fichier. Les modifications confirmées apparaissent dans l'administration et dans la galerie publique sans nouveau déploiement, tandis qu'une photo masquée reste administrable.

**Why this priority**: Les textes, cadrages, compositions et sélections évoluent ; ils doivent pouvoir être corrigés sans suppression inutile et sans laisser d'anciens fichiers orphelins.

**Independent Test**: Modifier chaque champ d'une photo existante, la masquer puis la réactiver, et enfin remplacer son fichier ; vérifier après chaque opération que l'identifiant logique est conservé, que l'état public attendu change et qu'un remplacement réussi ne laisse qu'un seul fichier référencé.

**Acceptance Scenarios**:

1. **Given** une photo existante, **When** l'administrateur enregistre des informations valides modifiées, **Then** la même photo est mise à jour, un succès est annoncé et aucun doublon n'est créé.
2. **Given** une photo active, **When** l'administrateur la masque, **Then** elle reste visible avec le statut « Masquée » dans l'administration, disparaît de la consultation publique et son adresse d’image précédemment observée cesse de livrer ses octets aux visiteurs et comptes non administrateurs.
3. **Given** une photo masquée, **When** l'administrateur la réactive, **Then** elle retrouve le statut « Active » et redevient visible dans la section et à l'ordre attendus.
4. **Given** une nouvelle image valide pour une photo existante, **When** le remplacement réussit, **Then** les informations choisies sont conservées ou mises à jour, le nouveau fichier est utilisé et l'ancien fichier n'est plus conservé inutilement.
5. **Given** un échec pendant le remplacement, **When** toutes les ressources ne peuvent pas être mises en cohérence, **Then** aucun faux succès n'est annoncé, la photo est masquée du public et conserve après rechargement le statut « À réparer » avec une action de reprise jusqu'à résolution.
6. **Given** une session expirée ou un droit administrateur retiré pendant l'édition, **When** l'enregistrement ou le remplacement est demandé, **Then** aucune mutation privilégiée n'est confirmée et une reconnexion est nécessaire avant une nouvelle tentative.

---

### User Story 4 - Supprimer définitivement une photo et son fichier (Priority: P4)

L'administrateur supprime une photo devenue inutile après une confirmation explicite qui l'identifie et rappelle que son fichier disparaîtra également. Une suppression n'est annoncée comme réussie que lorsque la photo et son fichier ont tous deux été traités.

**Why this priority**: La suppression durable est nécessaire pour maîtriser le stockage, mais elle vient après le masquage car une erreur peut retirer définitivement une image importante.

**Independent Test**: Demander la suppression d'une photo, annuler une première fois, puis confirmer ; vérifier que seule la cible disparaît de l'administration, de la galerie publique et des fichiers stockés. Simuler ensuite un échec partiel et vérifier qu'il reste visible et récupérable sans faux succès.

**Acceptance Scenarios**:

1. **Given** une photo existante, **When** l'administrateur choisit de la supprimer, **Then** une confirmation accessible affiche sa miniature, son texte de repérage, la conséquence définitive et des actions distinctes pour annuler ou confirmer.
2. **Given** la confirmation affichée, **When** l'administrateur annule, **Then** la photo et son fichier restent inchangés et aucun succès n'est annoncé.
3. **Given** la confirmation affichée, **When** l'administrateur confirme et que l'opération réussit, **Then** la photo disparaît de l'administration et de la galerie publique, son fichier n'est plus conservé et le succès réel est annoncé.
4. **Given** une suppression partiellement refusée ou indisponible, **When** la photo ou son fichier ne peut pas être retiré, **Then** le système n'annonce pas une suppression complète, masque la cible du public, conserve après rechargement le statut « À réparer » et permet de reprendre le nettoyage sans supprimer une autre photo.

---

### User Story 5 - Consulter la galerie publique actualisée (Priority: P5)

Le visiteur consulte uniquement les photos à la fois actives et dans l'état cohérent `ready` dans la galerie principale et le journal social existants. Il retrouve la composition visuelle actuelle, des images stables et adaptées à son écran, des légendes accessibles et uniquement des liens externes valides et confirmés.

**Why this priority**: L'administration n'apporte de valeur que si ses changements sont publiés correctement sans révéler les contenus masqués, dégrader les performances ou altérer l'identité visuelle existante.

**Independent Test**: Constituer une galerie comprenant les cinq variantes, des titres et liens présents ou absents, des ordres identiques et des photos masquées, puis vérifier le rendu public, l'ordre, les légendes, les liens, le chargement et l'absence des éléments masqués aux largeurs de référence.

**Acceptance Scenarios**:

1. **Given** des photos actives, masquées, `pending` ou `repair_required`, **When** un visiteur ouvre la galerie ou redemande une adresse d’image déjà observée, **Then** seules les photos `actif=true AND file_state='ready'` sont affichées et livrent leurs octets dans la section et l'ordre attendus.
2. **Given** des variantes `featured`, `small`, `wide_small` et `wide_large`, **When** la galerie principale est affichée sur ordinateur ou mobile, **Then** la composition documentée est conservée et une combinaison incomplète retombe proprement sur une carte standard sans chevauchement ni débordement.
3. **Given** des photos `social`, **When** le journal social est affiché, **Then** elles apparaissent uniquement dans cette section, dans un ordre stable et sans être présentées comme une publication automatique vers un réseau social.
4. **Given** une photo sans titre, libellé ou lien externe, **When** elle est affichée, **Then** aucun libellé vide, contrôle inactif ou espace incohérent n'est présenté.
5. **Given** un lien externe présent, **When** le visiteur l'active, **Then** seule une adresse HTTPS validée est ouverte et l'action possède un nom accessible indiquant sa destination.
6. **Given** les neuf images actuellement publiées, **When** la source administrable devient active, **Then** leurs images, textes alternatifs, variantes, sections et ordre relatif sont repris sans interruption visible ; aucune URL Instagram non confirmée n'est inventée comme donnée définitive.
7. **Given** une création active, une modification, un masquage, une réactivation, un remplacement ou une suppression confirmée, **When** une nouvelle consultation publique est ouverte, **Then** le nouvel état attendu est visible en moins de cinq secondes sans déploiement.
8. **Given** une galerie principale ou un journal social sans photo active et `ready`, **When** la page est affichée, **Then** la section vide est masquée ; si les deux sections sont vides, un message neutre unique sous l'en-tête annonce que de nouvelles réalisations seront bientôt publiées, sans image de secours ni lien inactif.

### Edge Cases

- Les espaces périphériques sont supprimés des champs textuels ; un texte alternatif composé seulement d'espaces est refusé et un champ facultatif vide est enregistré comme absent.
- Un texte alternatif de 1 ou 200 caractères est accepté ; un texte de 201 caractères est refusé sans créer ni modifier de photo.
- Un titre absent ou de 1 à 120 caractères et un libellé absent ou de 1 à 40 caractères sont acceptés après normalisation ; les valeurs immédiatement au-delà sont refusées sans mutation.
- Les images fixes JPEG, PNG et WebP sont acceptées jusqu'à 8 Mio inclus avant traitement ; un fichier vide, un octet au-dessus de la limite, un SVG, un GIF, un APNG, un WebP animé, une vidéo ou un fichier exécutable est refusé.
- Tout nouvel ajout ou remplacement valide produit un fichier WebP ; lorsqu'une image source contient de la transparence, son canal alpha visible est conservé dans l'aperçu et le fichier final selon SC-004. Les fichiers JPEG et PNG déjà publiés restent pris en charge sans conversion obligatoire.
- Une image totalisant au plus 25 000 000 pixels et dont chaque côté mesure au plus 8 192 px est admissible ; un pixel total ou un pixel de côté au-delà de ces bornes provoque un refus avant le décodage complet et sans résidu.
- Une extension ou un type déclaré autorisé ne suffit pas si le contenu réel du fichier ne correspond pas ; le fichier est refusé avant publication.
- Un type MIME navigateur vide n'empêche pas l'acceptation lorsque la signature binaire et l'extension JPEG, PNG ou WebP concordent ; un type non vide discordant reste refusé.
- Une image dont le côté le plus long dépasse 1 600 px est réduite proportionnellement ; une image plus petite n'est pas agrandie et les dimensions finales restent strictement positives.
- L'orientation intégrée à l'original est appliquée visuellement avant l'aperçu et l'enregistrement, puis toutes les métadonnées intégrées — notamment position, date, appareil et orientation d'origine — sont absentes du fichier publié.
- Avant le retrait d'un profil colorimétrique intégré, les pixels sont convertis vers sRGB afin que le fichier WebP sans profil conserve des couleurs cohérentes sur le Web.
- Pour un original dont le côté le plus long mesure au moins 1 200 px, le traitement ne descend jamais sous 1 200 px pour atteindre 1 Mio. Un original plus petit n'est pas agrandi et conserve sa dimension comme plancher ; si 1 Mio reste impossible à ce plancher, l'ajout ou le remplacement est refusé avec une consigne claire.
- Les noms fournis par l'appareil ne deviennent jamais l'identifiant public du fichier ; deux fichiers portant le même nom peuvent être ajoutés sans collision.
- Les variantes autorisées sont `featured`, `small`, `wide_small`, `wide_large` et `social`. Une autre valeur est refusée, mais plusieurs photos peuvent partager une variante ou un ordre.
- Une galerie principale sans photo mise en avant, avec plusieurs photos mises en avant ou avec une combinaison de variantes incomplète reste lisible grâce au repli visuel standard.
- Une section sans photo à la fois active et `ready` est absente de la page ; lorsque les deux sections sont vides, un seul message neutre remplace les grilles sans réafficher les anciennes images statiques.
- Un titre ou libellé facultatif très long revient à la ligne sans masquer l'image, le statut ou les actions ; aucune valeur n'est tronquée silencieusement lors de l'enregistrement.
- Une adresse externe vide est traitée comme absente ; une adresse non HTTPS, invalide ou utilisant un protocole actif est refusée.
- Une photo modifiée ou supprimée depuis un autre contexte avant la soumission ne produit pas de faux succès ; la liste est actualisée et explique que la cible doit être rechargée.
- Une perte de réseau à chaque étape d'un ajout, remplacement ou retrait conserve un état compréhensible, ne duplique pas la mutation après une nouvelle tentative et permet d'identifier tout nettoyage restant.
- Une nouvelle sélection pendant la préparation annule le traitement précédent, révoque son aperçu et garantit que seul le résultat de la dernière sélection peut être affiché ou envoyé.
- Une incohérence partielle place la photo concernée dans l'état persistant « À réparer », la masque immédiatement du public, refuse toute nouvelle livraison de ses octets et conserve une action de reprise après rechargement jusqu'au retour à un couple photo-fichier cohérent.
- Le masquage, l’état `pending`, l’état `repair_required` et la suppression empêchent une adresse d’image précédemment observée de continuer à livrer les octets au public ; aucune adresse publique durable vers le stockage n’est exposée.
- Si une photo active référence exceptionnellement un fichier indisponible, le visiteur ne voit ni détail technique ni mise en page cassée, tandis que l'administrateur reçoit un état permettant de remplacer ou supprimer la cible.
- Un visiteur, un compte non administrateur ou une ancienne session révoquée qui appelle directement une opération ne peut ni lire les photos masquées ni ajouter, modifier, remplacer, masquer, réactiver ou supprimer une photo ou un fichier.
- Au-delà de 100 photos, la liste administrative reste navigable par pages de 100 avec total, précédent et suivant, sans perdre l'ordre ni les actions sur la cible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST fournir à l'administrateur autorisé une gestion de la galerie accessible depuis l'espace protégé et clairement nommée « Galerie ».
- **FR-002**: La liste administrative MUST afficher toutes les photos, pour les deux intentions de visibilité `actif=true|false` et les trois états de fichier `ready|pending|repair_required`, avec au minimum une miniature, un texte de repérage, la variante, l'ordre, l'intention de visibilité, un statut de fichier textuel et les actions disponibles.
- **FR-003**: La liste administrative MUST conserver un ordre déterministe par section, ordre d'affichage croissant, date de création croissante puis départage stable ; plusieurs photos MAY partager le même ordre.
- **FR-004**: Le système MUST fournir des états distincts pour le chargement initial, la liste vide, les données chargées, l'indisponibilité récupérable et la session expirée ; un échec de lecture ne MUST pas être présenté comme une liste vide.
- **FR-005**: Le système MUST permettre de créer et modifier une photo avec les informations administrables suivantes : fichier image, texte alternatif, titre facultatif, libellé facultatif, lien externe facultatif, variante d'affichage, ordre et statut actif ou masqué.
- **FR-006**: Après suppression des espaces périphériques, le texte alternatif MUST contenir de 1 à 200 caractères, le titre facultatif de 1 à 120 caractères lorsqu'il est présent et le libellé facultatif de 1 à 40 caractères lorsqu'il est présent. Un titre ou libellé composé uniquement d'espaces MUST être traité comme absent et aucune valeur textuelle MUST être tronquée silencieusement.
- **FR-007**: Un lien externe facultatif MUST être une adresse HTTPS valide ; toute autre adresse MUST être refusée et une valeur vide MUST être traitée comme absente.
- **FR-008**: La variante MUST être choisie dans la liste fermée « Mise en avant », « Petite carte », « Petite carte large », « Grande carte large » ou « Journal social », correspondant respectivement à `featured`, `small`, `wide_small`, `wide_large` et `social` ; cette fonctionnalité MUST NOT permettre de créer ou renommer une variante.
- **FR-009**: L'ordre d'affichage MUST être un entier supérieur ou égal à zéro, avec zéro proposé par défaut ; une nouvelle photo MUST être active par défaut sauf choix explicite contraire.
- **FR-010**: Les seuls formats entrants acceptés MUST être des images fixes JPEG, PNG et WebP, avec une taille comprise entre 1 octet et 8 Mio inclus ; SVG, GIF, APNG, WebP animé, vidéo, fichier arbitraire et contenu réel incompatible avec le format déclaré MUST être refusés avant publication et sans résidu.
- **FR-011**: Avant confirmation, tout nouvel ajout ou remplacement MUST être préparé avec une orientation visuelle correcte appliquée aux pixels, un côté le plus long de 1 600 px maximum sans agrandissement des images plus petites, des proportions conservées, des dimensions finales positives, un poids maximal de 1 Mio et un encodage final WebP. Lorsque la source contient de la transparence, son canal alpha visible MUST être conservé dans l'aperçu et le fichier final selon SC-004 ; les composantes RGB non visibles d'un pixel totalement transparent ne font pas partie de cette garantie. Les fichiers JPEG et PNG déjà publiés MUST rester lisibles sans conversion obligatoire.
- **FR-012**: Avant un ajout ou remplacement, l'administrateur MUST voir un aperçu représentatif de la variante choisie ainsi que le format, le poids et les dimensions finales du fichier.
- **FR-013**: Le nom final et le chemin du fichier MUST être générés indépendamment du nom fourni par l'appareil et MUST être uniques afin d'éviter les collisions et les remplacements involontaires.
- **FR-014**: Une création confirmée MUST produire exactement une photo administrable et exactement un fichier correspondant ; si l'objet téléversé sur le chemin réservé ne peut pas être finalisé, cet objet réservé non finalisé MUST être retiré avec annulation de la réservation ou, si ce nettoyage échoue, l'opération MUST conserver après rechargement l'état « À réparer » et une action de reprise sans annoncer de succès.
- **FR-015**: Le système MUST permettre de modifier les informations, l'ordre, la variante et la visibilité sans créer une nouvelle photo logique.
- **FR-016**: Le système MUST permettre de masquer une photo sans supprimer son fichier, de réactiver une photo masquée et de conserver les photos masquées dans la liste administrative. Le masquage MUST retirer immédiatement la photo de toute nouvelle projection publique ; la révocation de ses octets suit FR-047.
- **FR-017**: Le système MUST permettre de remplacer le fichier d'une photo existante. Un remplacement entièrement réussi MUST utiliser un nouveau fichier unique et MUST retirer l'ancien fichier devenu inutilisé.
- **FR-018**: Un échec partiel d'ajout, de remplacement ou de suppression MUST placer la photo concernée dans l'état persistant « À réparer », la masquer du public, identifier l'opération concernée et conserver après rechargement une action de reprise ou de nettoyage ciblé jusqu'au retour à la cohérence, sans affecter une autre photo ni annoncer de faux succès. Une opération encore `pending` suit la règle d’abandon bornée de FR-046.
- **FR-019**: Toute suppression MUST être précédée d'une confirmation accessible identifiant la photo et indiquant que la photo et son fichier seront définitivement retirés ; l'annulation MUST les conserver sans annoncer de succès.
- **FR-020**: Une suppression MUST être annoncée comme réussie uniquement lorsque la photo et son fichier ne sont plus conservés. Un résultat partiel MUST rester masqué du public et visible à l'administrateur avec le statut « À réparer » jusqu'à sa résolution.
- **FR-021**: Avant chaque lecture administrative et chaque mutation, le système MUST confirmer l'identité, la session courante et le droit administrateur auprès de l'autorité protégée ; l'interface ou un ancien contexte de session ne MUST jamais constituer l'unique autorisation.
- **FR-022**: Un visiteur ou un utilisateur connecté sans droit administrateur MUST pouvoir découvrir et lire uniquement les photos `actif=true AND file_state='ready'`, selon le contrat de livraison de FR-047, et MUST être empêché d'effectuer toute mutation sur les photos et fichiers.
- **FR-023**: Chaque formulaire MUST valider l'ensemble des données au moment de la confirmation ; une saisie invalide MUST produire des erreurs associées aux champs sans mutation partielle et avec conservation des valeurs récupérables.
- **FR-024**: Les formulaires MUST exposer un état d'attente, empêcher les doubles soumissions et n'annoncer un succès qu'après confirmation réelle de l'opération complète.
- **FR-025**: Après une création, modification, activation, masquage, réactivation, remplacement ou suppression confirmée, l'administration et la galerie publique MUST refléter le nouvel état sans nouveau déploiement.
- **FR-026**: La galerie publique MUST afficher uniquement les photos `actif=true AND file_state='ready'`, les répartir entre galerie principale et journal social selon leur variante, puis les trier par ordre croissant, date de création croissante et départage stable.
- **FR-027**: Les variantes principales MUST conserver la composition publique documentée sur ordinateur et leur passage sur une colonne sur mobile. Une combinaison de variantes incomplète ou inhabituelle MUST se replier sur une carte standard sans chevauchement, déformation ni débordement.
- **FR-028**: La galerie publique MUST restituer le texte alternatif de chaque image informative, afficher les titres et libellés facultatifs sans emplacement vide et ne rendre une carte interactive que lorsqu'une destination HTTPS valide existe.
- **FR-029**: Les images immédiatement visibles MAY être prioritaires ; toutes les autres MUST être déclarées différées, sans priorité ni chargement eager. Chaque image MUST réserver son espace avant son chargement et choisir une taille adaptée à l'écran afin d'éviter un décalage perceptible.
- **FR-030**: La mise en service de la source administrable MUST reprendre les neuf images actuellement publiées — cinq dans la galerie principale et quatre dans le journal social — en produisant neuf WebP conformes qui préservent leur contenu visuel, leurs textes alternatifs, variantes, sections et ordre relatif, puis supprimer leur duplication comme contenu métier codé en dur.
- **FR-031**: La fonctionnalité MUST NOT inventer une URL ou un compte de réseau social définitif. Une image `social` MUST pouvoir être présentée sans lien et MUST NOT être publiée automatiquement sur un service externe.
- **FR-032**: Les interfaces administratives MUST rester utilisables à 320 px, 768 px et 1 024 px, au clavier et au toucher, avec des libellés visibles, un focus contrasté, des cibles d'au moins 44 × 44 px, des erreurs reliées aux champs et des annonces de statut accessibles.
- **FR-033**: La liste administrative MUST devenir une présentation lisible adaptée à l'espace disponible ; aucune information ni action essentielle ne MUST dépendre uniquement du survol, de la couleur ou d'une icône sans nom accessible.
- **FR-034**: Les erreurs visibles MUST distinguer au minimum validation, session expirée ou refus d'accès, réseau, quota de stockage et erreur interne, sans exposer de trace, secret, jeton, cookie ni détail d'infrastructure.
- **FR-035**: Jusqu'à 100 photos, la liste administrative MUST rester utilisable sans pagination visible ; au-delà, elle MUST proposer des pages de 100 éléments avec total exact, numéro courant, précédent et suivant, tout en préservant l'ordre stable et l'accès à chaque action.
- **FR-036**: Une photo dont le fichier est exceptionnellement indisponible MUST passer à l'état persistant « À réparer », être masquée du public sans casser la mise en page ni exposer un détail technique, et présenter dans l'administration une action de remplacement ou de suppression jusqu'à résolution.
- **FR-037**: Avant le retrait d'un profil colorimétrique intégré, les pixels MUST être convertis vers sRGB. Le fichier publié MUST ensuite être dépourvu de toute métadonnée intégrée, notamment profil ICC, position, date, appareil, logiciel et orientation d'origine ; seules les informations administrables explicitement enregistrées avec la photo MAY être conservées séparément.
- **FR-038**: La page publique MUST masquer indépendamment la galerie principale ou le journal social lorsqu'il ne contient aucune photo `actif=true AND file_state='ready'`. Si les deux sections sont vides, elle MUST conserver l'en-tête de page et afficher un message neutre unique annonçant de nouvelles réalisations, sans image statique de secours ni lien inactif.
- **FR-039**: Avant le décodage complet, le système MUST refuser toute image dont la largeur multipliée par la hauteur dépasse 25 000 000 pixels ou dont la largeur ou la hauteur dépasse 8 192 px, même si son poids reste inférieur ou égal à 8 Mio.
- **FR-040**: Pour atteindre le poids final maximal de 1 Mio, le traitement MUST NOT réduire le côté le plus long sous 1 200 px lorsque l'original atteint cette dimension. Si l'original est plus petit, il MUST NOT être agrandi et sa dimension d'origine devient le plancher ; si la limite de poids ne peut pas être respectée à ce plancher, l'image MUST être refusée.
- **FR-041**: La première dimension évaluée MUST être `min(côté long original, 1 600)`. Le traitement MUST ensuite diminuer ce côté par pas de 100 px tant que le résultat reste au-dessus du plancher de FR-040, puis ajouter exactement le plancher s'il n'a pas déjà été évalué. À chaque dimension, il MUST tenter l'encodage WebP dans cet ordre : qualité 0,85, puis 0,80, puis 0,75. Il MUST NOT descendre sous 0,75, agrandir l'original, lancer plusieurs encodages en parallèle ni dépasser cinq dimensions et quinze encodages ; les ressources intermédiaires MUST être libérées entre sélections ou après abandon. Si aucun résultat admissible n'est obtenu, ou si l'appareil ne peut allouer le décodage ou le Canvas borné, l'image MUST être refusée avec une consigne compréhensible.
- **FR-042**: Avant de rendre une création ou un remplacement `ready`, la finalisation serveur MUST vérifier que les métadonnées Storage annoncent au plus 1 Mio et `image/webp`, télécharger l’objet réservé exact avec la session administrateur, puis valider ses octets RIFF/WebP, son caractère non animé, ses dimensions attendues et l’absence de chunks ICCP, EXIF, XMP ou inconnus. Les dimensions fournies par le navigateur ne MUST pas suffire seules.
- **FR-043**: Un objet qui échoue à la validation serveur des octets MUST rester non public et être supprimé par l’API Storage ; si l’absence ne peut pas être confirmée, la ligne MUST devenir `repair_required/invalid_object_bytes` avec le chemin exact de nettoyage, sans faux succès.
- **FR-044**: Le bootstrap initial MUST convertir hors runtime les neuf assets connus avec une version épinglée de `sharp`, vérifier leur manifeste d’entrée et de sortie, produire uniquement des WebP conformes, puis utiliser une session administrateur, les chemins déterministes réservés et la même validation finale d’octets. Il MUST refuser une cible non autorisée, une divergence ou un hash inattendu et MUST NOT employer `service_role`.
- **FR-045**: Une image persistée qui échoue à se charger MUST être retirée de la vue courante sans casser la composition. Dans l’administration, l’échec de miniature ou une demande explicite de contrôle MUST déclencher une Server Action réautorisée qui revérifie le chemin serveur exact ; une absence confirmée MUST produire `repair_required/object_missing`, masquer la ligne du public et invalider `galerie`.
- **FR-046**: À chaque entrée dans la liste administrative, le système MUST demander une réconciliation réautorisée des opérations `pending` dont `operation_started_at` date d’au moins 10 minutes. La présence ou l’absence des objets exacts détermine respectivement le code fermé `stale_pending_object_present` ou `stale_pending_no_object`, la ligne devient `repair_required`, reste non publique et aucune suppression automatique n’a lieu avant une action de reprise confirmée.
- **FR-047**: Les fichiers de galerie MUST rester dans un espace de stockage privé. Toute livraison d’octets MUST revalider le contexte d’accès applicable — projection publique anonyme ou session administrateur courante —, l’état courant de la photo et son chemin enregistré côté serveur ; aucune adresse publique durable, aucun chemin fourni librement par le demandeur et aucun lien temporaire encore valable après un changement d’état ne MUST permettre de contourner le masquage. Les réponses d’image MUST être non persistantes dans les caches partagés afin que la première demande suivant un masquage, un passage non `ready` ou une suppression soit refusée.

### Scope Boundaries

**Included**:

- accès « Galerie » depuis l'administration protégée ;
- liste complète des photos pour les intentions active et masquée et les états `ready`, `pending` et `repair_required` ;
- ajout unitaire depuis l'appareil, contrôle, optimisation, aperçu et enregistrement des métadonnées ;
- modification, classement numérique, changement de variante, masquage, réactivation et remplacement unitaire ;
- suppression coordonnée de la photo et de son fichier avec reprise des échecs partiels ;
- reprise des neuf images actuellement affichées et lecture publique des seules photos actives et `ready` sans redéploiement ;
- variantes existantes de la galerie principale et du journal social, avec repli visuel sûr ;
- états chargement, vide, attente, succès, erreur, session expirée et confirmation de suppression ;
- maintien du design, du responsive, des performances perçues et de l'accessibilité existants.

Le MVP fonctionnel de gestion de galerie comprend obligatoirement les cinq user stories et leur intégration. US1 seule est un incrément de consultation démontrable, pas un MVP livrable.

**Excluded**:

- envoi multiple, import par archive, opérations groupées, export et historique complet des modifications ;
- éditeur de recadrage manuel, filtres, retouche avancée, suppression d'arrière-plan ou génération d'image ;
- création ou personnalisation de nouvelles variantes de mise en page ;
- publication ou synchronisation automatique avec Instagram ou un autre réseau social ;
- gestion du compte, du fil, des statistiques ou des commentaires d'un réseau social ;
- recherche avancée, taxonomie, albums, commentaires, favoris ou droits multi-rôles ;
- réservation, paiement, compte client, application mobile ou backend séparé ;
- modification de la direction artistique publique et correction des coordonnées temporaires hors galerie.

### Key Entities *(include if feature involves data)*

- **Photo de galerie**: Élément administrable identifié de manière stable, associé à un fichier, un texte alternatif, un titre facultatif, un libellé facultatif, un lien HTTPS facultatif, une variante, un ordre, une visibilité et des dates de création et de modification.
- **Fichier image correspondant**: Objet présent sur le chemin courant enregistré d'une photo `ready`, dont le format, la largeur, la hauteur et le poids positifs concordent avec les valeurs validées. Pendant une opération, le chemin réservé et le chemin à nettoyer restent distincts du chemin courant ; une réservation sans objet ou un ancien objet en attente de nettoyage n'est pas présenté comme le fichier final correspondant.
- **Variante d'affichage**: Une des cinq compositions fermées. Quatre appartiennent à la galerie principale et `social` au journal social ; elle détermine la présentation sans modifier le contenu de l'image.
- **État de visibilité**: État actif ou masqué d'une photo. Il contrôle sa présence publique sans empêcher sa consultation, sa modification ou sa réactivation par l'administrateur.
- **Opération de fichier**: Enveloppe durable d'un ajout, remplacement ou retrait. Elle conserve un type fermé, un identifiant idempotent, une date de début serveur, les chemins exacts réservé et/ou à nettoyer et, le cas échéant, un code de réparation fermé. Une opération `pending` ou `repair_required` masque la photo du public ; après 10 minutes, une opération encore `pending` devient éligible à l'audit d'abandon, et toute reprise vérifie le même identifiant avant d'agir.
- **Codes de réparation**: `upload_unconfirmed` et `metadata_unconfirmed` demandent une revérification de l'objet réservé ; `invalid_object_bytes` impose son retrait ; `new_file_cleanup` et `old_file_cleanup` ciblent uniquement le nouveau ou l'ancien chemin conservé ; `object_delete_unconfirmed` et `row_delete_unconfirmed` reprennent la suppression à l'étape restante ; `object_missing` exige remplacement ou suppression ; `stale_pending_no_object` et `stale_pending_object_present` décrivent l'audit d'abandon sans nettoyage automatique.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dans 100 % des scénarios contrôlés, l'administrateur courant peut lister, ajouter, modifier, classer, masquer, réactiver, remplacer et supprimer une photo, tandis que le visiteur, le compte non administrateur et l'ancienne session révoquée ne peuvent effectuer aucune mutation ni obtenir les informations ou octets d'une photo masquée, `pending`, `repair_required` ou supprimée. Après chacun de ces changements d’état, la première nouvelle demande faite à la même adresse d’image précédemment fonctionnelle est refusée, sans attendre le retrait physique du fichier.
- **SC-002**: Un utilisateur cible non technique peut sélectionner une image, comprendre son aperçu, compléter les informations obligatoires et la retrouver dans la galerie publique en moins de 3 minutes, sans aide autre que les libellés et messages de l'interface.
- **SC-003**: Le corpus versionné F01–F20 défini ci-dessous produit 20 résultats sur 20 conformes : F01–F06 sont acceptés, F07–F20 sont refusés, et aucun refus ne laisse de photo ou fichier résiduel.
- **SC-004**: Pour 100 % des ajouts et remplacements acceptés, le fichier final est un WebP encodé à l'une des qualités autorisées 0,85, 0,80 ou 0,75, mesure au plus 1 600 px sur son côté le plus long sans agrandissement, pèse au plus 1 Mio et ses dimensions, son format et son poids affichés correspondent aux valeurs conservées. Deux fixtures RGBA versionnées couvrent 50 échantillons dans l’aperçu exact et le WebP finalisé : la fixture non redimensionnée conserve ses 25 alphas avec 0 et 255 exacts et un écart intermédiaire maximal de 1 ; la fixture 2 000 × 1 000 redimensionnée en 1 600 × 800 conserve aux 25 positions normalisées l’alpha analytique `arrondi(255 × u)`, avec extrémités 0 et 255 exactes et écart intermédiaire maximal de 3.
- **SC-005**: Après chacun des sept changements confirmés — ajout actif, modification, masquage, réactivation, changement d'ordre ou de variante, remplacement et suppression — le premier rendu administratif produit après la réponse de l'action affiche le nouvel état sans actualisation manuelle supplémentaire, et une nouvelle consultation publique l'affiche en moins de 5 secondes, sans déploiement.
- **SC-006**: Les 12 interruptions nommées C1–C4, R1–R5 et D1–D3 dans la matrice ci-dessous produisent 12 résultats sur 12 conformes : aucun faux succès, doublon ou chemin tiers touché ; tout état non convergé reste masqué du public et réparable après rechargement, tandis qu'une interruption survenue après convergence se résout par la répétition idempotente de la même opération.
- **SC-007**: Après 30 ajouts, 20 remplacements et 20 suppressions réussis dans un environnement de contrôle, chaque photo conservée référence exactement un fichier attendu et aucun ancien fichier devenu inutilisé ne subsiste.
- **SC-008**: Un jeu de 100 photos réparties entre les cinq variantes est restitué dans le même ordre lors de 20 actualisations consécutives, y compris lorsque plusieurs éléments partagent la même valeur d'ordre, sans élément perdu ou dupliqué.
- **SC-009**: Les neuf images publiques présentes avant la bascule conservent leur image complète après application de l'orientation, sans recadrage ni déformation : chaque sortie respecte les dimensions attendues du manifeste à un pixel d'arrondi près et obtient un SSIM supérieur ou égal à 0,97 face à la source opaque, orientée, convertie en sRGB puis redimensionnée aux dimensions exactes de la sortie. Le calcul porte sur la luminance sRGB 8 bits non linéaire `Y = 0,299R + 0,587G + 0,114B`, utilise une fenêtre gaussienne 11 × 11 de sigma 1,5, `K1=0,01`, `K2=0,03`, `L=255`, une extension réfléchie aux bords et la moyenne arithmétique des fenêtres centrées sur chaque pixel de sortie. Leurs textes alternatifs, variantes, sections et ordre relatif restent identiques ; les neuf sorties sont des WebP validés et le second bootstrap ne modifie ni ne duplique aucune paire.
- **SC-010**: Dans 100 % des tests des cinq variantes, des titres, libellés et liens présents ou absents, des intentions actif ou masqué et des états `ready`, `pending` ou `repair_required`, la galerie publique utilise la section et la présentation attendues, ne révèle que `actif=true AND file_state='ready'` et ne laisse aucun contrôle ou emplacement vide incohérent.
- **SC-011**: Les parcours de liste, ajout, modification, masquage, réactivation, remplacement et suppression sont réalisables sans souris, sans débordement horizontal à 320 px, 768 px et 1 024 px, avec 100 % des contrôles nommés, un focus perceptible et des statuts annoncés.
- **SC-012**: Dans un contexte navigateur isolé neuf, sans cache mémoire ou disque, sans Service Worker, sans bridage réseau artificiel et avec l'observateur réseau installé avant la navigation, une consultation locale même origine à viewport 320 × 800 px ne demande, pendant les deux secondes chronométrées depuis l'événement `load` et sans défilement, aucune image différée identifiable dont le bord supérieur se trouve à au moins 2 400 px sous le bord inférieur du viewport initial. Après un défilement terminé qui place ce bord supérieur à 800 px ou moins sous le viewport, la requête commence dans les deux secondes suivant la fin du défilement. La somme des entrées `layout-shift` sans interaction attribuables aux conteneurs d'images de galerie vaut 0 et chaque image informative expose un texte alternatif non vide.
- **SC-013**: Lors d'un test utilisateur guidé standardisé, un utilisateur cible non technique reçoit successivement cinq consignes — retrouver une photo masquée, ajouter une photo, corriger son texte alternatif, la remplacer puis la supprimer. Au moins 4 tâches sur 5 sont accomplies chacune lors d'une première tentative ininterrompue, sans indice de l'observateur, et aucune action destructive n'est déclenchée sans confirmation explicite.
- **SC-014**: Après la fonctionnalité, les pages publiques `/`, `/services`, `/galerie` et `/contact` conservent leurs adresses, leur navigation, leurs titres et textes hors données de galerie, leurs destinations de liens confirmées, leur ordre de sections et l'absence de débordement horizontal aux largeurs 320 px, 768 px et 1 024 px.
- **SC-015**: Les contrôles des messages utilisateur et sorties partageables trouvent 0 secret, jeton, cookie, trace, requête brute, détail d'infrastructure ou donnée de session.
- **SC-016**: Pour 100 % d'un jeu de fichiers contenant une orientation, une position, une date et des informations d'appareil, l'aperçu et le fichier publié présentent l'orientation visuelle attendue et une inspection du fichier publié retrouve 0 métadonnée intégrée.
- **SC-017**: Les quatre combinaisons de disponibilité des sections — toutes deux remplies, principale seule, sociale seule et toutes deux vides — produisent 4 rendus sur 4 conformes : chaque section vide est absente et le message neutre unique apparaît uniquement lorsque les deux sont vides.
- **SC-018**: Une matrice de 8 valeurs — titre absent, de 1, 120 et 121 caractères, puis libellé absent, de 1, 40 et 41 caractères — produit 8 résultats sur 8 conformes après normalisation et aucune valeur refusée ne produit de mutation.
- **SC-019**: Une matrice de 6 images sous 8 Mio — sous les deux limites, exactement 25 000 000 pixels, 25 000 001 pixels, côté de 8 192 px, côté de 8 193 px et dimensions déclarées incohérentes — produit 6 résultats sur 6 conformes, sans décodage complet ni résidu pour les trois cas refusés.
- **SC-020**: Trois images nécessitant une réduction supplémentaire pour atteindre 1 Mio — une acceptée à exactement 1 200 px, une qui exigerait 1 199 px et un original de 900 px encore trop lourd à sa dimension d'origine — produisent respectivement un succès, un refus et un refus, sans agrandissement ni fichier résiduel.
- **SC-021**: Un corpus versionné de six images opaques avec profil intégré — trois sRGB et trois Display-P3 — définit 25 positions normalisées `(u,v)` dans `[0,1]²` et 25 triplets sRGB 8 bits de référence par image, soit 150 échantillons fixes. Pour chaque aperçu et WebP finalisé, la position devient `x=floor(u×(largeur−1)+0,5)` et `y=floor(v×(hauteur−1)+0,5)`, puis est bornée au pixel valide ; l'échantillon décodé et la référence sont convertis de sRGB vers CIE Lab avec l'illuminant D65, observateur 2°, sans adaptation D50, avant calcul CIEDE2000. La médiane des 150 valeurs est inférieure ou égale à 2 et le P95 par rang le plus proche — valeur triée de rang `ceil(0,95×150)=143`, en base 1 — est inférieur ou égal à 5 pour l'aperçu comme pour le fichier finalisé ; une inspection de chaque fichier final retrouve zéro profil ICC ou autre bloc de métadonnées.
- **SC-022**: Une matrice serveur de 8 objets téléversés sous un chemin `.webp` réservé — 1 WebP conforme, 1 PNG déclaré WebP, 1 RIFF tronqué, 1 WebP animé, 1 WebP aux dimensions discordantes, 1 WebP avec EXIF, 1 avec ICCP et 1 avec chunk inconnu — produit 8 résultats sur 8 conformes : seul le premier devient `ready` et les sept autres sont absents ou `repair_required/invalid_object_bytes` sans exposition publique.
- **SC-023**: Après création de trois opérations `pending` âgées respectivement de 9 min 59 s, 10 min et 11 min, une entrée administrative conserve la première `pending` et convertit exactement les deux autres en `repair_required/stale_pending_object_present` si leur objet exact existe ou `repair_required/stale_pending_no_object` s'il est absent, sans suppression automatique ni action sur une autre ligne.
- **SC-024**: Pour une photo `ready` dont l’objet est retiré dans l’environnement de contrôle, la demande d’image publique est refusée et ne laisse ni carte cassée ni détail technique ; le contrôle administratif suivant produit `repair_required/object_missing`, puis une nouvelle consultation publique ne contient plus la photo après invalidation du tag.
- **SC-025**: Avec 201 photos administratives, la liste produit exactement trois pages de 100, 100 et 1 élément ; les 201 identifiants apparaissent chacun une fois, dans le même ordre stable lors de 20 navigations complètes, avec total, page courante, précédent et suivant exacts.
- **SC-026**: Dans un contexte navigateur froid sans cache ni Service Worker, avec les neuf photos du bootstrap remplacées par neuf WebP de exactement 1 Mio et un viewport de 320 × 800 px, les cinq secondes suivant `load` sans défilement déclenchent au plus deux demandes vers `/api/gallery-images/<id>` et livrent au plus 2 Mio de corps d’image. Sur la preview, une navigation complète qui fait apparaître successivement les neuf photos déclenche au plus neuf invocations de livraison et 9 Mio de corps d’image, sans requête dupliquée pour un même ID ; le rapport extrapolé à 1 000 consultations complètes reste donc au plus à 9 000 invocations et 9 000 Mio, et compare ces valeurs aux quotas officiels en vigueur avant validation du déploiement.

### Corpus contrôlé SC-003

| ID | Fichier et déclaration | Résultat attendu |
| --- | --- | --- |
| F01 | JPEG fixe valide usuel, extension `.jpg`, type `image/jpeg` | Accepté |
| F02 | PNG fixe valide usuel, extension `.png`, type `image/png` | Accepté |
| F03 | WebP fixe valide usuel, extension `.webp`, type `image/webp` | Accepté |
| F04 | JPEG fixe valide de 8 Mio moins 1 octet | Accepté |
| F05 | PNG fixe valide de exactement 8 Mio | Accepté |
| F06 | WebP fixe valide de exactement 8 Mio | Accepté |
| F07 | Fichier vide de 0 octet | Refusé |
| F08 | JPEG valide de 8 Mio plus 1 octet | Refusé |
| F09 | PNG valide de 8 Mio plus 1 octet | Refusé |
| F10 | SVG | Refusé |
| F11 | GIF | Refusé |
| F12 | APNG | Refusé |
| F13 | WebP animé | Refusé |
| F14 | Vidéo MP4 | Refusé |
| F15 | Fichier exécutable | Refusé |
| F16 | Octets JPEG déclarés `image/png` | Refusé |
| F17 | Octets PNG déclarés `image/webp` | Refusé |
| F18 | Octets WebP déclarés `image/jpeg` | Refusé |
| F19 | Octets et type JPEG avec extension `.png` | Refusé |
| F20 | Octets et type PNG avec extension `.webp` | Refusé |

### Matrice d'interruption SC-006

| ID | Point d'interruption injecté | État durable et reprise attendus |
| --- | --- | --- |
| C1 | Création réservée, avant l'upload | Ligne `pending/create`, objet absent ; l'audit d'abandon la rend réparable, puis la reprise annule uniquement cette réservation. |
| C2 | Upload de création terminé, avant validation/finalisation | Ligne `pending/create`, objet réservé présent ; la reprise revalide cet objet exact puis finalise ou le nettoie. |
| C3 | Validation serveur des octets refusée, avant confirmation du nettoyage | L'objet invalide n'est jamais public ; il est supprimé avec annulation de la réservation ou la ligne devient `repair_required/invalid_object_bytes` jusqu'au nettoyage ciblé. |
| C4 | Ligne de création passée à `ready`, avant réception de la réponse client | Une ligne et un objet cohérents existent ; répéter le même `operation_id` confirme le succès sans deuxième ligne ni deuxième objet. |
| R1 | Remplacement masqué et réservé, avant l'upload | Ancien objet conservé, nouvel objet absent, ligne `pending/replace` non publique ; reprise ou annulation ciblée sans perdre l'ancien. |
| R2 | Nouvel objet uploadé, avant validation serveur | Ancien et nouvel objets présents, ancien chemin encore courant ; la reprise valide le nouveau ou le supprime, sans exposer la ligne. |
| R3 | Nouvel objet validé, avant bascule atomique de la ligne | Ancien et nouvel objets présents, ancien chemin encore courant ; la même bascule peut être répétée sans dupliquer ni supprimer le courant. |
| R4 | Bascule vers le nouvel objet terminée, avant retrait de l'ancien | Nouveau chemin courant et ancien chemin dans `cleanup_storage_path` ; la reprise supprime uniquement l'ancien objet exact. |
| R5 | Ancien objet retiré, avant passage final à `ready` | Seul le nouvel objet courant subsiste ; la reprise constate l'absence attendue de l'ancien et efface idempotemment l'état de nettoyage. |
| D1 | Suppression marquée `pending/delete`, avant retrait de l'objet | Ligne et objet présents mais non publics ; la reprise retire uniquement l'objet exact. |
| D2 | Objet retiré, avant suppression de la ligne | Ligne `pending/delete` sans objet ; la reprise constate l'absence attendue puis supprime la ligne. |
| D3 | Ligne supprimée, avant réception de la réponse client | Ligne et objet déjà absents ; répéter le même identifiant converge vers un succès idempotent sans toucher une autre cible. |

## Assumptions

- Les fonctionnalités `001-supabase-foundation` et `002-admin-authentication` sont disponibles et fournissent respectivement les données et fichiers protégés ainsi que l'espace administrateur et le contrôle de session. La gestion des prestations n'est pas une dépendance fonctionnelle, mais son interface établit des conventions réutilisables.
- Le MVP utilise un seul niveau de droit administrateur et une galerie de quelques dizaines à quelques centaines de photos ; aucune collaboration simultanée ni résolution avancée de conflits n'est nécessaire.
- En cas de modifications concurrentes exceptionnelles, la dernière mutation entièrement confirmée devient l'état courant ; une cible disparue produit un message récupérable plutôt qu'un faux succès.
- Les cinq variantes existantes et leur signification visuelle restent fermées. Plusieurs éléments ou aucun élément peuvent utiliser une variante donnée ; la galerie publique gère ces combinaisons sans imposer un éditeur de composition.
- La préparation de l'image conserve son cadrage d'origine. Le recadrage visible dépend de la variante et de la présentation publique ; aucun outil de recadrage manuel n'est attendu dans le MVP.
- Le fichier entrant peut atteindre 8 Mio, mais seul le fichier préparé de 1 Mio maximum est conservé. Les originaux importants restent sous la responsabilité de l'institut conformément à la procédure de sauvegarde du projet.
- Les neuf images actuellement codées en dur constituent le jeu initial à reprendre : cinq photos principales et quatre images du journal social. Aucun import générique d'autres données de démonstration n'est attendu.
- Les textes temporaires et l'adresse Instagram non confirmée du prototype ne deviennent pas des données définitives. Les champs de lien peuvent rester absents jusqu'à validation d'une destination officielle.
- Une nouvelle consultation publique correspond à une ouverture ou une actualisation de la page après confirmation administrative ; les onglets déjà rendus ne sont pas mis à jour en temps réel.
- Le stockage de la galerie reste privé. Les pages utilisent des adresses d’image applicatives stables par identifiant, mais chaque demande d’octets est réautorisée contre l’état courant ; les liens temporaires dont la durée dépasserait un changement de visibilité ne sont pas utilisés.
- Un état `repair_required` n'expire pas automatiquement dans le MVP : il reste masqué et administrable jusqu'à une reprise ou une suppression explicitement confirmée. Aucun délai ne déclenche de suppression destructive.
- Les navigateurs cibles sont les versions actuelles de Chrome, Firefox et Safari, avec un contrôle obligatoire sur Safari mobile. La préparation privilégie le décodage orienté natif, retombe sur un élément image décodé et un Canvas sRGB lorsque nécessaire, et refuse l'opération avec une consigne de mise à jour ou de changement de navigateur si l'export WebP reste indisponible ; aucun original n'est envoyé au serveur comme repli.
- Les contrôles navigateur améliorent l'expérience mais ne sont pas une frontière d'intégrité. La finalisation serveur de FR-042 protège contre un transfert contournant la préparation locale sous une session admin valide ; un compte administrateur entièrement compromis peut néanmoins effectuer les mutations administratives autorisées, risque accepté dans le MVP mono-rôle et traité par la révocation du compte plutôt que par un second rôle d'approbation.
- L'histoire 1 constitue un incrément vérifiable de consultation administrative, mais le MVP fonctionnel de gestion de galerie n'est atteint qu'après livraison des cinq histoires et de leur intégration croisée.
