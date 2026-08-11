# Foundation Requirements Checklist: Fondation Supabase

**Purpose**: Évaluer si les exigences du socle Supabase sont complètes, claires, cohérentes et mesurables avant la génération des tâches
**Created**: 2026-08-08
**Feature**: [spec.md](../spec.md)

**Note**: Cette checklist évalue la qualité des exigences écrites ; elle ne contrôle pas l'implémentation.

## Requirement Completeness

- [x] CHK001 Les exigences définissent-elles, pour chaque champ des prestations et photos, son caractère obligatoire ou facultatif, sa valeur par défaut et ses limites métier ? [Completeness, Spec §FR-001–FR-005]
- [x] CHK002 Les exigences couvrent-elles explicitement chaque combinaison valide et invalide entre `type_prix` et `prix` ? [Completeness, Spec §FR-003]
- [x] CHK003 Les droits requis sont-ils documentés pour chaque ressource et chaque opération des trois profils, y compris la lecture directe d'une ligne masquée ? [Completeness, Spec §FR-007–FR-010, §FR-016]
- [x] CHK004 Les exigences distinguent-elles complètement le cycle de vie d'une métadonnée de photo de celui de son fichier Storage ? [Completeness, Spec §FR-004, §FR-013–FR-015]
- [x] CHK005 La création manuelle du premier administrateur précise-t-elle l'acteur responsable, l'autorité autorisée et l'absence de tout parcours public alternatif ? [Completeness, Spec §FR-011–FR-012]
  - Validé : le mainteneur propriétaire du projet utilise une capacité administrative Supabase protégée hors navigateur ; aucun parcours public ne partage cette autorité.
- [x] CHK006 Les exigences de configuration recensent-elles toutes les informations permises dans le navigateur et toutes les catégories de secrets interdites dans le dépôt, le bundle et les journaux ? [Completeness, Spec §FR-018, §SC-007]

## Requirement Clarity

- [x] CHK007 Les trois catégories métier possèdent-elles des identifiants canoniques non ambigus, distincts de leurs libellés français d'affichage ? [Clarity, Spec §FR-002]
- [x] CHK008 Est-il explicite qu'une prestation `quote` doit avoir un prix absent, ou seulement qu'elle peut avoir un prix absent ? [Ambiguity, Spec §FR-003, Edge Cases]
- [x] CHK009 Le tri stable définit-il un dernier critère lorsque plusieurs éléments partagent à la fois l'ordre d'affichage et la date de création ? [Ambiguity, Spec §FR-006]
- [x] CHK010 Les notions de droit administrateur « absent, expiré ou obsolète » sont-elles définies par des critères d'autorisation distincts et observables ? [Clarity, Spec §FR-011, Edge Cases]
- [x] CHK011 Le résultat attendu d'un refus « sans divulguer de détail sensible » précise-t-il quelles informations restent permises pour l'utilisateur et pour le diagnostic serveur ? [Clarity, Spec §FR-021, User Story 2]
- [x] CHK012 La forme autorisée d'un chemin de galerie est-elle définie assez précisément pour exclure les variantes de préfixe, séparateur, extension et traversée non prévues ? [Clarity, Spec §FR-014]
- [x] CHK013 La différence entre « photo masquée non découvrable » et « fichier public encore accessible par une URL déjà connue » est-elle explicitement compréhensible pour les parties prenantes ? [Clarity, Spec §FR-007, Assumptions]

## Requirement Consistency

- [x] CHK014 L'acceptation temporaire de JPEG, PNG et WebP dans le socle est-elle cohérente avec le format cible WebP et l'exclusion du traitement d'image ? [Consistency, Spec §FR-013–FR-015, Scope Boundaries]
- [x] CHK015 La largeur maximale de 1 600 px est-elle présentée de façon cohérente comme contrainte du socle ou comme résultat différé du traitement d'image ? [Conflict, Spec §FR-004, Edge Cases, Scope Boundaries]
- [x] CHK016 L'exigence d'un rôle contrôlé par le service couvre-t-elle explicitement la vérification supplémentaire d'une session encore active retenue dans le plan ? [Consistency, Spec §FR-011, Edge Cases]
- [x] CHK017 Les quatre causes exigées par `FR-021` et `SC-009` utilisent-elles une taxonomie cohérente avec les cas d'authentification, de conflit et de panne réseau décrits dans les contrats ? [Consistency, Spec §FR-021, §SC-009]
- [x] CHK018 L'exclusion de l'import de contenu est-elle cohérente avec la reproductibilité du socle, notamment sur l'absence intentionnelle de seed métier ? [Consistency, Spec §FR-017, Scope Boundaries, Clarifications]

## Acceptance Criteria Quality

- [x] CHK019 La « matrice complète » est-elle énumérée de manière exhaustive pour que le résultat attendu de chaque profil, ressource, visibilité et opération soit objectivement déterminable ? [Measurability, Spec §FR-020, §SC-001]
- [x] CHK020 Le critère couvrant 100 % des données invalides définit-il un inventaire fini des contraintes et de leurs valeurs limites ? [Measurability, Spec §SC-005]
- [x] CHK021 Un « environnement vierge compatible » et une « seule procédure documentée » sont-ils définis avec un point de départ et un état final mesurables ? [Clarity, Measurability, Spec §FR-017, §SC-006]
- [x] CHK022 Le critère de stabilité pour environ 40 prestations et 100 photos précise-t-il les données d'égalité nécessaires pour prouver l'absence de résultat instable ? [Measurability, Spec §FR-006, §SC-008]

## Scenario Coverage

- [x] CHK023 Les exigences couvrent-elles le passage d'un compte non-admin à administrateur, y compris le moment où la nouvelle autorisation devient valide ? [Coverage, Alternate Flow, Spec §FR-011–FR-012]
- [x] CHK024 Les exigences couvrent-elles la rétrogradation d'un administrateur et la révocation de ses sessions ou preuves d'autorisation déjà émises ? [Coverage, Recovery Flow, Spec §FR-011, Edge Cases]
- [x] CHK025 Les exigences couvrent-elles une demande directe par identifiant afin que la protection d'un contenu masqué ne dépende pas uniquement des listes publiques ? [Coverage, Exception Flow, Spec §FR-007–FR-010]
- [x] CHK026 Le scénario de remplacement décrit-il les exigences lorsque `INSERT` est autorisé mais que `SELECT` ou `UPDATE` manque, sans laisser d'état présenté comme réussi ? [Coverage, Exception Flow, Spec §FR-015, Edge Cases]
- [x] CHK027 Les exigences précisent-elles comment distinguer un privilège SQL manquant d'un refus normal d'autorisation sans exposer le détail de l'infrastructure ? [Coverage, Exception Flow, Spec §FR-016, §FR-021]
- [x] CHK028 Les exigences de cette fondation indiquent-elles explicitement si les écritures concurrentes sur un même chemin ou un même enregistrement sont couvertes maintenant ou différées ? [Gap, Alternate Flow]
  - Validé : la fondation garantit uniquement unicité et autorisation ; verrouillage optimiste et résolution fonctionnelle des conflits sont différés à la future gestion de galerie.

## Edge Case Coverage

- [x] CHK029 Les exigences définissent-elles le traitement des chaînes composées uniquement d'espaces et la différence entre valeur vide et valeur facultative absente ? [Coverage, Edge Case, Spec §FR-001–FR-005]
- [x] CHK030 Les formes d'URL HTTPS acceptées et refusées sont-elles suffisamment bornées au-delà du simple préfixe `https://` ? [Clarity, Edge Case, Spec §FR-005]
- [x] CHK031 La précision, l'échelle et la valeur maximale d'un prix sont-elles documentées, en plus de son caractère positif ou nul ? [Gap, Edge Case, Spec §FR-001, §FR-003]
  - Validé : `numeric(10,2)` est explicité comme dix chiffres, deux décimales et un maximum non négatif de `99 999 999,99`.
- [x] CHK032 Le comportement attendu est-il défini lorsque deux lignes partagent aussi bien `ordre_affichage` que `created_at` ? [Coverage, Edge Case, Spec §FR-006]
- [x] CHK033 Les états « métadonnée sans objet » et « objet sans métadonnée » sont-ils reconnus, avec une responsabilité de récupération clairement incluse ou différée ? [Gap, Recovery Flow, Spec §FR-013–FR-015, Assumptions]
- [x] CHK034 Les exigences couvrent-elles ensemble nom utilisateur malveillant, préfixe voisin, chemin imbriqué, extension trompeuse et incohérence MIME/contenu ? [Coverage, Edge Case, Spec §FR-014, Edge Cases]

## Non-Functional Requirements

- [x] CHK035 La portée de la détection de secrets est-elle mesurable pour les fichiers versionnés, le bundle navigateur, les variables d'environnement et les journaux ? [Security, Measurability, Spec §FR-018, §SC-007]
- [x] CHK036 L'absence de seuil de latence pour les lectures au volume du MVP est-elle une exclusion intentionnelle, ou manque-t-il un objectif mesurable ? [Gap, Performance, Spec §SC-008]
  - Validé : aucun SLA local n'est fixé ; volume 40/100, tri, pagination, index et absence de N+1 constituent les critères de cette fondation, la latence de bout en bout étant différée à Netlify.
- [x] CHK037 Les exigences de journalisation définissent-elles le contexte utile permis et les données sensibles interdites pour chaque famille d'erreur ? [Security, Completeness, Spec §FR-021, §SC-009]
- [x] CHK038 Les exigences de reproductibilité fixent-elles les versions ou critères de compatibilité nécessaires pour éviter qu'un environnement « compatible » varie dans le temps ? [Dependency, Clarity, Spec §FR-017, §SC-006]

## Dependencies & Assumptions

- [x] CHK039 L'hypothèse d'accès à un projet Supabase géré est-elle cohérente avec une validation limitée au socle local et avec l'exclusion du déploiement de production ? [Assumption, Spec §Assumptions, Scope Boundaries]
- [x] CHK040 Les exigences attribuent-elles clairement à une future fonctionnalité les limites après traitement, la coordination fichier/métadonnée et la stratégie de reprise, avec des critères empêchant leur oubli ? [Dependency, Gap, Spec §Scope Boundaries, Assumptions]

## Notes

- Cocher un élément uniquement lorsque la qualité de l'exigence correspondante a été examinée : `[x]`.
- Ajouter les décisions ou liens de clarification directement sous l'élément concerné.
- Les éléments marqués `[Gap]`, `[Ambiguity]` ou `[Conflict]` signalent les zones à résoudre avant de dériver des tâches d'implémentation.
