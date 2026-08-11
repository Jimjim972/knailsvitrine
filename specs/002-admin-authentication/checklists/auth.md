# Auth Requirements Quality Checklist: Authentification administrateur

**Purpose**: Évaluer la complétude, la clarté, la cohérence et la mesurabilité des exigences d'authentification, de récupération et d'accessibilité avant la génération des tâches
**Created**: 2026-08-10
**Feature**: [spec.md](../spec.md)

**Note**: Ce checklist évalue la qualité des exigences écrites ; il ne constitue ni un plan de test ni une validation de l'implémentation.

## Requirement Completeness

- [x] CHK001 Les exigences définissent-elles explicitement quelles routes sous `/admin` sont publiques, protégées ou volontairement hors périmètre, y compris les futures routes encore absentes ? [Completeness, Spec §FR-001, §FR-007–FR-008, Scope Boundaries]
  - Résolu le 2026-08-10 : FR-001/007/008 rendent seule `/admin/connexion` publique et protègent tout autre chemin présent ou futur sous `/admin`; les fonctions non livrées restent exclues.
- [x] CHK002 Les trois composantes du droit d'accès — identité, session courante et rôle administrateur — sont-elles chacune définies avec leur source d'autorité et leur condition de validité ? [Completeness, Spec §FR-004, Key Entities]
  - Résolu le 2026-08-10 : FR-004 définit séparément la reconnaissance de l'identité, l'existence/appartenance/non-expiration de la session et l'autorité protégée du droit administrateur.
- [x] CHK003 Les exigences décrivent-elles le résultat attendu pour chaque catégorie d'erreur de connexion, de contrôle d'autorisation et de déconnexion, y compris lorsqu'un nettoyage de session échoue partiellement ? [Gap, Spec §FR-005, §FR-018, Edge Cases]
  - Résolu le 2026-08-10 : FR-005/018 et les Edge Cases couvrent validation, refus, limitation, indisponibilité, échec de contrôle, nettoyage local incertain et erreur de déconnexion sans faux succès.
- [x] CHK004 Les exigences de confidentialité couvrent-elles séparément l'interface, les réponses serveur, les diagnostics partageables, l'historique du navigateur et les restitutions mises en cache ? [Completeness, Spec §FR-019, §FR-022, SC-005, SC-008]
  - Résolu le 2026-08-10 : FR-019/022 et SC-005/008 couvrent sorties client, diagnostics, historique et caches privés/partagés.
- [x] CHK005 Les exclusions signup, récupération de mot de passe, MFA, multi-rôles, CRUD et révocation globale sont-elles formulées de façon à empêcher qu'un contrôle ou lien factice soit interprété comme requis dans cette feature ? [Completeness, Spec §FR-002, §FR-015, Scope Boundaries]
  - Résolu le 2026-08-10 : FR-002/015 et Scope Boundaries excluent explicitement chaque parcours et interdisent les actions CRUD factices.

## Requirement Clarity

- [x] CHK006 La notion de « session courante » précise-t-elle si elle désigne une session Supabase, un profil navigateur partagé entre onglets ou l'ensemble des sessions d'un appareil ? [Ambiguity, Spec §FR-013–FR-014, Assumptions]
  - Résolu le 2026-08-10 : les Assumptions bornent la session courante à celle utilisée par le navigateur, partagée entre ses onglets, sans révocation globale des autres sessions.
- [x] CHK007 Le terme « action sensible » est-il défini ou borné afin que les auteurs sachent quelles actions présentes et futures doivent répéter le contrôle d'autorisation ? [Ambiguity, Spec §FR-011–FR-012]
  - Résolu le 2026-08-10 : FR-011 borne ces actions aux lectures/mutations de données administratives ; la déconnexion est l'exception explicite de nettoyage de session, sans accès métier.
- [x] CHK008 Le critère « même message public » indique-t-il clairement si l'identité exigée porte uniquement sur le texte visible ou également sur la catégorie, la structure accessible et les autres signaux observables ? [Clarity, Spec §FR-006, SC-004]
  - Résolu le 2026-08-10 : FR-006/SC-004 exigent le même texte, la même catégorie publique, la même structure d'état et la même annonce accessible ; le zéro information est borné à ces sorties et les différences temporelles intrinsèques au fournisseur sont explicitement hors mesure.
- [x] CHK009 Les critères d'acceptation d'une destination de retour « interne et autorisée » définissent-ils précisément les chemins admis, les chemins exclus et le traitement des query strings/fragments ? [Gap, Spec §FR-009, Edge Cases]
  - Résolu le 2026-08-10 : FR-009 borne le namespace `/admin`, exclut la connexion, conserve la query string et rejette origine externe/protocol-relative, fragment, barre inverse, contrôles et encodage ambigu.
- [x] CHK010 La notion de contenu administratif « exploitable » après déconnexion est-elle définie de manière objective pour distinguer un affichage historique inerte d'un état encore utilisable ? [Ambiguity, Spec §User Story 3.2, SC-005]
  - Résolu le 2026-08-10 : le scénario US3.2 et SC-005 interdisent objectivement donnée privée, commande administrative active et réponse privée restaurée, puis exigent le refus de la première interaction ou demande protégée suivante.

## Requirement Consistency

- [x] CHK011 Le comportement d'un administrateur déjà connecté ouvrant `/admin/connexion` est-il cohérent entre la redirection obligatoire vers l'accueil et l'usage éventuel d'une destination de retour sûre ? [Conflict, Spec §User Story 1.4, §FR-008–FR-009]
  - Résolu le 2026-08-10 : une session déjà autorisée va toujours à `/admin` et ignore `returnTo`; la destination validée ne s'applique qu'après une nouvelle connexion réussie.
- [x] CHK012 Les exigences de révocation sont-elles cohérentes entre « prochaine vérification protégée », « prochaine demande protégée » et refus des actions sensibles, sans promettre une disparition proactive du contenu déjà affiché ? [Consistency, Spec §FR-011–FR-012, Edge Cases, SC-003]
  - Résolu le 2026-08-10 : FR-011/012, les Edge Cases et SC-003 convergent sur le refus de la toute première demande protégée suivante, sans promettre d'effacement proactif de l'écran déjà rendu.
- [x] CHK013 La conservation de l'adresse email dans le formulaire est-elle clairement compatible avec l'interdiction d'enregistrer ou d'exposer une adresse complète dans les sorties partageables ? [Consistency, Spec §FR-017, §FR-019, SC-008]
  - Résolu le 2026-08-10 : FR-017 autorise uniquement l'état local du formulaire, tandis que FR-019 définit les sorties partageables où l'adresse complète est interdite.
- [x] CHK014 La déconnexion de portée locale est-elle cohérente avec l'exigence multi-onglets et avec l'exclusion explicite de la révocation globale des autres sessions/appareils ? [Consistency, Spec §FR-013–FR-014, User Story 3.3, Scope Boundaries]
  - Résolu le 2026-08-10 : US3.3 refuse la prochaine demande des onglets partageant la session courante; Scope Boundaries et Assumptions excluent les autres sessions/appareils.

## Acceptance Criteria Quality

- [x] CHK015 La matrice « cinq contextes » de SC-001 définit-elle sans chevauchement les entrées et résultats attendus, notamment la différence entre identifiants invalides et session administrateur révoquée ? [Acceptance Criteria, Spec §SC-001]
  - Résolu le 2026-08-10 : SC-001 et les scénarios US1/US2 distinguent tentative sans identité obtenue, compte non-admin, ancien contexte révoqué et admin courant.
- [x] CHK016 Le délai de 60 secondes précise-t-il le point de départ, le point de fin, les conditions réseau, le profil du participant et ce qui constitue une aide technique ? [Measurability, Spec §SC-002]
  - Résolu le 2026-08-10 : SC-002 fixe navigateur/connexion, profil, instruction unique, départ formulaire utilisable et fin au contexte « Administration » visible.
- [x] CHK017 Les « 20 cycles » définissent-ils ce qu'est un cycle, quelles pages sont concernées et comment distinguer maintien de session et renouvellement transparent ? [Measurability, Spec §SC-003]
  - Résolu le 2026-08-10 : chaque cycle fixe navigation vers `/admin`, vérification, actualisation complète et seconde vérification, soit 40 demandes protégées pour 20 cycles.
- [x] CHK018 Le délai d'attente « perceptible en moins d'une seconde » précise-t-il l'événement de départ et le signal perceptible attendu afin d'être mesuré objectivement ? [Measurability, Spec §SC-006]
  - Résolu le 2026-08-10 : SC-006 part de la première activation, exige attente visible et annoncée sous 1 000 ms, exactement une soumission applicative et exactement une vérification des identifiants ; les preuves navigateur et unitaire sont séparées.
- [x] CHK019 Le critère de non-régression des pages publiques possède-t-il une référence écrite du « comportement visuel et fonctionnel actuel » suffisamment précise pour éviter une appréciation subjective ? [Gap, Spec §SC-010, §FR-021]
  - Résolu le 2026-08-10 : SC-010 référence `doc/design.md` et une fiche pré-déplacement couvrant URLs, chrome public, contenus visibles, liens, ordre des sections et débordement aux trois largeurs.

## Scenario Coverage

- [x] CHK020 Les scénarios primaires couvrent-ils distinctement première connexion, session déjà valide, accès direct protégé, maintien de session et déconnexion, avec un résultat observable pour chacun ? [Coverage, Spec §User Stories 1–3]
  - Résolu le 2026-08-10 : les scénarios d'acceptation US1–US3 couvrent séparément ces cinq parcours et leur résultat observable.
- [x] CHK021 Les scénarios alternatifs couvrent-ils un compte valide non-admin, un rôle retiré, une session expirée, une session supprimée et un JWT contenant encore un ancien rôle ? [Coverage, Spec §User Story 2, Edge Cases]
  - Résolu le 2026-08-10 : US1.3, US2.3–2.5 et les Edge Cases couvrent non-admin, rôle retiré, expiration, suppression et ancien contexte de rôle.
- [x] CHK022 Les scénarios d'exception distinguent-ils validation locale, refus générique, limitation temporaire, panne réseau, panne Auth et panne du contrôle d'autorisation ? [Coverage, Spec §FR-018, Edge Cases]
  - Résolu le 2026-08-10 : FR-005/018/019 et les Edge Cases distinguent chacune de ces catégories sans détail fournisseur public.
- [x] CHK023 Les scénarios de récupération précisent-ils l'action disponible après limitation, indisponibilité, expiration de session et erreur de déconnexion, sans annoncer de faux succès ? [Coverage, Recovery Flow, Spec §FR-016, §FR-018, Edge Cases]
  - Résolu le 2026-08-10 : FR-005/016/018, US2.3 et les Edge Cases imposent réessai ou reconnexion, état récupérable et absence de faux succès.
- [x] CHK024 Les scénarios non fonctionnels couvrent-ils le parcours complet — succès, erreurs et déconnexion — pour clavier, toucher, technologie d'assistance et chaque largeur cible ? [Coverage, Spec §User Story 4, §FR-020, SC-007]
  - Résolu le 2026-08-10 : US4, FR-020 et SC-007 couvrent le parcours complet, les trois modes d'entrée/assistance et les trois largeurs.

## Edge Case Coverage

- [x] CHK025 Les exigences traitent-elles les valeurs email entourées d'espaces, de casse différente, vides, mal formées et anormalement longues sans introduire une règle de création de mot de passe hors périmètre ? [Coverage, Edge Cases, Spec §FR-003]
  - Résolu le 2026-08-10 : FR-003 et les Edge Cases imposent trim/casse, format, borne 1–254 caractères et présence seule du mot de passe.
- [x] CHK026 Les destinations de retour absentes, absolues, protocol-relative, encodées de manière ambiguë, pointant vers la connexion ou comportant un fragment sont-elles explicitement couvertes ou intentionnellement exclues ? [Gap, Edge Cases, Spec §FR-009]
  - Résolu le 2026-08-10 : FR-009 couvre explicitement chaque classe et impose le fallback `/admin`.
- [x] CHK027 Le cas où l'authentification réussit mais où le contrôle administrateur ou le nettoyage du contexte échoue est-il spécifié comme un état distinct, récupérable et sans accès conservé ? [Gap, Exception Flow, Spec §FR-005, §FR-018]
  - Résolu le 2026-08-10 : FR-005 et les Edge Cases imposent indisponibilité récupérable, refus fermé continu et aucune annonce de succès/nettoyage confirmé.
- [x] CHK028 Les exigences distinguent-elles une déconnexion distante non confirmée d'un nettoyage local déjà effectué afin que l'état et l'action de récupération restent compréhensibles ? [Ambiguity, Recovery Flow, Spec §FR-013–FR-014, Edge Cases]
  - Résolu le 2026-08-10 : l'Edge Case de déconnexion et le contrat LogoutState interdisent de promettre une révocation distante et conservent une action de réessai.
- [x] CHK029 Le comportement attendu lors d'une soumission ouverte avant un nouveau déploiement ou devenue obsolète est-il documenté, ou ce scénario est-il explicitement reporté au gate de déploiement ? [Gap, Recovery Flow, Plan §Post-design Constitution Re-check]
  - Résolu le 2026-08-10 : le plan et le quickstart reportent explicitement ce scénario au gate Netlify avec message récupérable et test d'onglet pré-déploiement.

## Non-Functional Requirements

- [x] CHK030 Les exigences d'isolation des sessions définissent-elles objectivement ce qui est interdit en matière de cache partagé, de réutilisation inter-utilisateur et de réponses d'authentification stockables ? [Clarity, Security, Spec §FR-022]
  - Résolu le 2026-08-10 : FR-022 interdit cache partagé/réutilisation inter-utilisateur, impose des réponses privées non stockables et borne la restauration navigateur après perte d'accès.
- [x] CHK031 Les exigences de journalisation définissent-elles une taxonomie minimale des événements, les champs permis, les champs interdits et le périmètre exact d'une « sortie partageable » ? [Gap, Security, Spec §FR-019, SC-008]
  - Résolu le 2026-08-10 : FR-019 définit sept catégories, trois champs autorisés, les surfaces partageables et la liste des données interdites.
- [x] CHK032 Les exigences de non-énumération couvrent-elles les messages visibles, les annonces accessibles, les codes/catégories publics et les variations involontaires liées au rôle du compte ? [Completeness, Security, Spec §FR-006, §FR-018, SC-004]
  - Résolu le 2026-08-10 : FR-006 et SC-004 imposent l'égalité du texte, de la catégorie, de la structure d'état et de l'annonce accessible pour les trois cas de refus, tandis que T015 exige leur comparaison dans le navigateur.
- [x] CHK033 Les exigences d'accessibilité quantifient-elles le contraste du focus, définissent-elles les annonces d'attente/erreur et couvrent-elles tous les contrôles de connexion et déconnexion ? [Clarity, Accessibility, Spec §FR-020, SC-007]
  - Résolu le 2026-08-10 : FR-016/020, US4 et SC-006/007 exigent focus contrasté/perceptible, annonces d'attente/erreur et parcours connexion/déconnexion complet.
- [x] CHK034 Les exigences responsive définissent-elles « sans débordement horizontal » et la lisibilité des erreurs longues aux largeurs 320, 768 et 1 024 px, sans modifier les breakpoints du design source ? [Clarity, Accessibility, Spec §FR-020–FR-021]
  - Résolu le 2026-08-10 : US4.4, FR-020/021 et SC-007 fixent lisibilité/utilisabilité sans débordement aux trois largeurs tout en préservant le design source.
- [x] CHK035 Les exigences de limitation temporaire et d'indisponibilité précisent-elles le comportement utilisateur attendu sans imposer un seuil fournisseur non maîtrisé ni un mécanisme anti-abus hors périmètre ? [Clarity, Resilience, Spec §FR-018, Edge Cases]
  - Résolu le 2026-08-10 : FR-018 et les Edge Cases imposent un état récupérable/réessayable sans seuil fournisseur ni extension anti-abus.

## Dependencies & Assumptions

- [x] CHK036 L'hypothèse que `001-supabase-foundation` fournit compte, rôle protégé, session révocable et signup fermé est-elle reliée à des exigences vérifiables dont dépend explicitement cette feature ? [Dependency, Assumption, Spec §Assumptions, SC-009]
  - Résolu le 2026-08-10 : Assumptions relie explicitement la fondation aux comptes/rôles/sessions/signup; FR-002/004/012 et SC-009 rendent ces dépendances vérifiables.
- [x] CHK037 La procédure externe de création du premier administrateur et de retrait de son rôle est-elle suffisamment documentée comme dépendance, sans être transformée en fonctionnalité de l'interface 002 ? [Dependency, Assumption, Spec §FR-002, Assumptions, Scope Boundaries]
  - Résolu le 2026-08-10 : FR-002, Assumptions et Scope Boundaries placent création, attribution/retrait et révocation dans une maintenance protégée hors interface 002.

## Ambiguities & Conflicts

- [x] CHK038 Les exigences distinguent-elles clairement les décisions produit obligatoires de la spécification et les choix techniques révisables du plan, notamment Proxy, RPC, cache, outils de test et gate Netlify ? [Clarity, Traceability, Spec §FR-004, §FR-011, §FR-022; Plan §Summary, §Technical Context]
  - Résolu le 2026-08-10 : la spec exprime les résultats d'identité/session/droit/isolation; Proxy, RPC, directives de cache, outils et gate Netlify restent documentés comme choix du plan.

## Notes

- Cocher un élément uniquement lorsque la qualité rédactionnelle correspondante est satisfaite ou qu'une décision explicite est consignée.
- Ajouter les constats et références directement sous l'élément concerné.
- Les éléments marqués `[Gap]`, `[Ambiguity]` ou `[Conflict]` signalent des points à résoudre ou à accepter explicitement avant `$speckit-tasks`.
