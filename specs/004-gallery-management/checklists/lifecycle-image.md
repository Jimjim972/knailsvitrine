# Lifecycle and Image Requirements Checklist: Gestion de la galerie

**Purpose**: Évaluer la complétude, la précision et la cohérence des exigences de cycle de vie, de récupération et d’encodage avant la génération des tâches
**Created**: 2026-08-11
**Feature**: [spec.md](../spec.md)

**Note**: Cette checklist évalue la qualité des exigences écrites ; elle ne constitue ni un plan de test ni une validation de l’implémentation.

## Requirement Completeness

- [x] CHK001 Les exigences décrivent-elles, pour la création, le remplacement et la suppression, chaque passage entre état cohérent, opération en cours, état réparable et état final ? [Completeness, Spec §FR-014–FR-020]
- [x] CHK002 Les informations qui doivent survivre au rechargement pour identifier et reprendre chaque opération partielle sont-elles toutes spécifiées ? [Completeness, Spec §FR-018]
- [x] CHK003 Les exigences couvrent-elles toute la chaîne de préparation d’image, depuis l’identification binaire jusqu’au fichier WebP final aperçu et transférable ? [Completeness, Spec §FR-010–FR-013, §FR-037–FR-041]
- [x] CHK004 Le traitement attendu des fichiers JPEG et PNG déjà publiés est-il défini pour la lecture publique, le remplacement et la suppression, et pas seulement pour leur affichage ? [Completeness, Spec §FR-011]
- [x] CHK005 Les conditions de bascule des neuf images initiales définissent-elles les exigences applicables en cas de paire ligne-fichier absente, déjà conforme ou divergente ? [Completeness, Spec §FR-030, §SC-009]

## Requirement Clarity

- [x] CHK006 Les critères d’entrée et de sortie de chacun des états « en cours », « à réparer », « active » et « masquée » sont-ils définis sans dépendre d’une interprétation technique implicite ? [Clarity, Spec §FR-016, §FR-018, §FR-036]
- [x] CHK007 L’expression « action de reprise ou de nettoyage ciblé » précise-t-elle les résultats autorisés pour chaque type d’opération partielle ? [Ambiguity, Spec §FR-018]
- [x] CHK008 La réduction des dimensions indique-t-elle une suite de dimensions exhaustive, y compris lorsque la dimension initiale n’est pas un multiple de 100 px au-dessus du plancher ? [Ambiguity, Spec §FR-040–FR-041]
- [x] CHK009 La notion de couleurs « visuellement cohérentes » après conversion sRGB est-elle associée à une tolérance ou à un critère d’évaluation objectif ? [Ambiguity, Spec §SC-021]
- [x] CHK010 L’exigence de suppression de « toute métadonnée intégrée » définit-elle explicitement le traitement des blocs WebP inconnus ainsi que des profils ICC, EXIF et XMP nommés ? [Clarity, Spec §FR-037, §SC-016]

## Requirement Consistency

- [x] CHK011 La promesse d’exactement une photo et un fichier est-elle cohérente avec l’existence temporaire d’une réservation sans objet, de deux objets pendant un remplacement ou d’une ligne sans objet pendant une réparation ? [Conflict, Spec §FR-014, §FR-017–FR-020]
- [x] CHK012 Les exigences de conservation des JPEG et PNG historiques restent-elles cohérentes avec l’obligation WebP applicable uniquement aux ajouts et remplacements ? [Consistency, Spec §FR-011, §FR-030]
- [x] CHK013 L’obligation de conserver le canal alpha visible est-elle cohérente entre aperçu, conversion sRGB, encodage WebP et sanitation des métadonnées ? [Resolved: oracle RGBA 25 positions, Spec §FR-011, §FR-037, §SC-004]
- [x] CHK014 Les règles de visibilité publique sont-elles identiques pour une photo masquée, une opération en cours, un état réparable et un fichier exceptionnellement indisponible ? [Consistency, Spec §FR-018, §FR-022, §FR-026, §FR-036]

## Acceptance Criteria Quality

- [x] CHK015 La matrice de douze interruptions attribue-t-elle explicitement chaque point de rupture aux opérations de création, remplacement et suppression afin que sa couverture soit reproductible ? [Acceptance Criteria, Spec §SC-006]
- [x] CHK016 Le retour à la cohérence après une reprise est-il mesurable par une définition unique du couple photo-fichier attendu et de l’absence de résidu ? [Measurability, Spec §SC-006–SC-007]
- [x] CHK017 Les critères d’acceptation distinguent-ils objectivement une orientation correcte, une transparence conservée, une conversion sRGB acceptable et une absence totale de métadonnées ? [Resolved: oracle alpha, CIEDE2000 et inspection de chunks, Spec §SC-004, §SC-016, §SC-021]
- [x] CHK018 Les résultats attendus à chaque borne de poids, dimensions, nombre de pixels et qualité sont-ils suffisamment explicites pour départager acceptation et refus sans interprétation ? [Acceptance Criteria, Spec §SC-003–SC-004, §SC-019–SC-020]
- [x] CHK019 Un délai ou une condition de convergence est-il défini pour une opération qui reste « À réparer », ou cette durée illimitée est-elle explicitement acceptée comme limite du MVP ? [Gap, Spec §FR-018, §SC-006]

## Scenario Coverage

- [x] CHK020 Les exigences couvrent-elles la répétition d’une finalisation ou d’une reprise déjà réussie afin de définir le résultat idempotent attendu ? [Coverage, Recovery Flow, Spec §FR-018]
- [x] CHK021 Les scénarios distinguent-ils la fermeture du navigateur avant transfert, pendant le transfert et après transfert mais avant finalisation ? [Coverage, Exception Flow, Spec §FR-014, §SC-006]
- [x] CHK022 Le remplacement couvre-t-il explicitement les combinaisons où le nouveau fichier est absent ou présent et où l’ancien fichier est absent ou présent ? [Coverage, Recovery Flow, Spec §FR-017–FR-018]
- [x] CHK023 La suppression définit-elle le résultat attendu lorsque le fichier est déjà absent, puis lorsque la ligne persiste après le retrait confirmé du fichier ? [Coverage, Recovery Flow, Spec §FR-020, §FR-036]
- [x] CHK024 Les exigences couvrent-elles une nouvelle sélection d’image pendant une préparation en cours afin de définir le sort de l’ancien aperçu et de son résultat tardif ? [Gap, Alternate Flow, Spec §FR-012, §FR-024]

## Edge Case Coverage

- [x] CHK025 Le statut des PNG animés et WebP animés est-il explicitement défini parmi les formats acceptés ou refusés ? [Resolved: APNG/WebP animé refusés, Spec §FR-010, §SC-003]
- [x] CHK026 Le comportement attendu lorsque le type MIME déclaré est vide mais que la signature binaire est valide est-il spécifié ? [Ambiguity, Edge Case, Spec §FR-010]
- [x] CHK027 Les exigences distinguent-elles les sources exactement égales à 1 200 px, inférieures à 1 200 px et situées entre deux dimensions candidates de réduction ? [Coverage, Edge Case, Spec §FR-040–FR-041]
- [x] CHK028 La conservation de la transparence précise-t-elle si elle concerne l’alpha visible uniquement ou aussi les couleurs cachées des pixels totalement transparents ? [Resolved: alpha visible uniquement, RGB caché hors garantie, Spec §FR-011, §SC-004]
- [x] CHK029 Les exigences définissent-elles le résultat attendu lorsqu’un fichier décodé annonce des dimensions différentes de celles extraites de son conteneur, orientation comprise ? [Coverage, Edge Case, Spec §FR-039, §SC-019]

## Non-Functional Requirements

- [x] CHK030 Les limites de calcul et de mémoire de la préparation locale sont-elles quantifiées par un nombre maximal d’essais, une absence de traitements parallèles et une stratégie d’abandon bornée ? [Non-Functional, Gap, Spec §FR-039–FR-041]
- [x] CHK031 Les exigences de compatibilité définissent-elles les navigateurs et appareils cibles ainsi que le résultat utilisateur attendu lorsqu’un encodage WebP n’est pas disponible ? [Non-Functional, Gap, Spec §FR-034]
- [x] CHK032 Les exigences de confidentialité couvrent-elles à la fois les métadonnées du fichier source, celles éventuellement ajoutées lors de l’encodage et les détails techniques des erreurs de traitement ? [Security, Completeness, Spec §FR-034, §FR-037]
- [x] CHK033 Le niveau d’intégrité attendu face à un administrateur compromis ou à un transfert contournant la préparation locale est-il explicitement borné comme hypothèse du MVP ? [Security, Assumption, Spec §FR-021–FR-022]

## Dependencies & Assumptions

- [x] CHK034 La dépendance à la prise en charge de WebP, de l’orientation intégrée, du canal alpha et de la conversion colorimétrique par les navigateurs cibles est-elle documentée avec ses solutions de repli ? [Dependency, Assumption]
- [x] CHK035 Les exigences distinguent-elles clairement les garanties transactionnelles internes des garanties de convergence entre la ligne de données et le service de fichiers externe ? [Dependency, Clarity, Spec §FR-014–FR-020]
- [x] CHK036 Le bootstrap des neuf images documente-t-il ses préconditions d’accès, sa règle de non-écrasement et le critère autorisant le retrait des données statiques ? [Dependency, Spec §FR-030, §SC-009]

## Ambiguities & Conflicts

- [x] CHK037 La spécification établit-elle quelle source est normative lorsque le plan d’encodage précise un pas de 100 px ou un maximum de quinze essais que les exigences fonctionnelles ne quantifient pas ? [Conflict, Spec §FR-040–FR-041]
- [x] CHK038 Le terme « fichier correspondant » possède-t-il une définition stable qui couvre le chemin réservé, l’objet présent, ses caractéristiques attendues et son état de publication ? [Ambiguity, Spec §FR-014, §SC-007]
- [x] CHK039 Les codes ou catégories de réparation nécessaires pour choisir une reprise déterministe sont-ils complètement définis et reliés à chaque état partiel autorisé ? [Gap, Spec §FR-018, §FR-020, §FR-036]

## Notes

- Cocher les éléments résolus avec `[x]`.
- Documenter les décisions ou corrections à côté de l’élément concerné.
- Traiter les éléments marqués `[Conflict]`, `[Ambiguity]` ou `[Gap]` avant `$speckit-tasks` lorsqu’ils changent le découpage des tâches.
- Correction du 2026-08-12 : formats animés, bucket privé avec réautorisation de chaque octet, révocation immédiate de la même URL applicative et deux oracles alpha couvrant les chemins avec et sans redimensionnement rendus explicites dans la spécification, le plan, les contrats et les tâches.
- Réévaluation finale du 2026-08-12 : les 39 questions sont résolues par FR-010–FR-020 et la matrice SC-006 pour les transitions/reprises, FR-037–FR-043 et SC-003/004/016/019–022 pour l'encodage et la validation d'octets, FR-044/SC-009 pour le bootstrap, FR-045–FR-047/SC-023–024 pour les absences et abandons, ainsi que les définitions et hypothèses explicites sur le MIME vide, la dernière sélection, les quinze essais bornés, la compatibilité, la durée de réparation et la limite d'un compte administrateur compromis.
