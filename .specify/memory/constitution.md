<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Modified principle:
  - VI. Intégrité des données et changements reproductibles : distingue les migrations
    SQL des configurations Storage appartenant au fournisseur et impose, pour celles-ci,
    un script API/CLI versionné, idempotent, contrôlé et vérifiable.
- Added sections: aucune
- Removed sections: aucune
- Templates reviewed:
  - `.specify/templates/plan-template.md` : compatible, aucune modification requise
  - `.specify/templates/spec-template.md` : compatible, aucune modification requise
  - `.specify/templates/tasks-template.md` : compatible, aucune modification requise
- Runtime guidance reviewed:
  - `AGENTS.md` : déjà aligné sur les migrations SQL et l'API Storage officielle
- Follow-up TODOs: aucun
-->

# Constitution de K'Nails Vitrine

## Principes fondamentaux

### I. Priorité au MVP et maîtrise du périmètre

Chaque changement DOIT servir directement le MVP décrit dans `doc/spec.md` : présenter
l'activité, afficher environ quarante prestations, gérer une galerie et fournir une
administration sécurisée pour ces contenus. Les fonctionnalités déclarées hors MVP
NE DOIVENT PAS être ajoutées sans demande explicite de l'utilisateur et mise à jour
préalable de la documentation concernée. La solution la plus simple répondant au
besoin validé DOIT être privilégiée ; toute complexité supplémentaire DOIT être
justifiée par une exigence vérifiable.

### II. Décisions guidées par la documentation

Avant toute spécification, planification ou implémentation, l'agent DOIT consulter les
sources du projet dans l'ordre défini par `AGENTS.md` : `doc/spec.md`, `doc/design.md`,
`doc/architecture.md`, `doc/infra.md`, puis la documentation locale de la version de
Next.js installée et, lorsque nécessaire, la documentation officielle de Supabase.
Une décision qui modifie le produit, l'interface, l'architecture ou l'infrastructure
DOIT mettre à jour les documents touchés dans le même changement. Une hypothèse ne
DOIT PAS silencieusement devenir une exigence.

### III. Fidélité au design et accessibilité

Toute modification du frontend DOIT respecter `doc/design.md` à la lettre, notamment
ses couleurs, typographies, espacements, composants, comportements responsive,
animations et états interactifs. Une divergence visuelle exige une demande explicite
de l'utilisateur et une mise à jour préalable de `doc/design.md`. Les interfaces
publiques et d'administration DOIVENT rester utilisables au clavier et au toucher,
présenter un focus visible, respecter des cibles d'au moins 44 px et viser WCAG 2.1 AA.
Tout nouveau contenu visuel DOIT disposer d'un texte alternatif pertinent.

### IV. Architecture Next.js côté serveur

Le projet DOIT rester une application unique Next.js App Router, sans backend Express
séparé. Les Server Components sont la valeur par défaut ; un Client Component n'est
autorisé que lorsqu'une interaction navigateur le requiert réellement. Les mutations
DOIVENT passer par des Server Actions qui authentifient, autorisent, valident, écrivent
et invalident le cache concerné. Les Route Handlers sont réservés aux véritables
interfaces HTTP. Avant de modifier du code Next.js, la documentation correspondant à
la version installée dans `node_modules/next/dist/docs/` DOIT être consultée.

### V. Sécurité Supabase en profondeur

La sécurité DOIT être appliquée dans la base et pas seulement dans l'interface. Toute
table exposée DOIT avoir des privilèges minimaux et des politiques RLS explicites : le
public ne peut lire que les contenus actifs et seul l'administrateur authentifié peut
modifier les données. Le rôle administrateur DOIT provenir de `app_metadata`, jamais
de métadonnées modifiables par l'utilisateur. La clé `service_role`, les secrets et les
identifiants privilégiés NE DOIVENT JAMAIS atteindre le navigateur. Les opérations
Storage DOIVENT être protégées par des politiques cohérentes et la suppression d'une
photo DOIT traiter à la fois l'objet stocké et son enregistrement.

### VI. Intégrité des données et changements reproductibles

Toute entrée externe DOIT être validée côté serveur avec Zod et protégée par des
contraintes de base de données lorsque la règle peut y être exprimée. Les types métier
DOIVENT rester stricts ; `any` est interdit sans justification écrite et localisée.
Les changements de schéma applicatif, de politiques RLS — y compris les politiques
sur les tables Storage — et de privilèges SQL DOIVENT être livrés sous forme de
migrations versionnées et reproductibles. Lorsqu'une configuration ou un objet
Storage appartient au fournisseur et que sa documentation exige de traiter son schéma
comme étant en lecture seule, le changement DOIT passer par l'API ou la CLI officielle
au moyen d'un script versionné, idempotent et fail-closed. Ce script DOIT vérifier sa
cible exacte, exiger une autorisation explicite avant toute cible distante, protéger
ses identifiants privilégiés, ne jamais les journaliser et vérifier la postcondition
attendue. Une modification manuelle non tracée d'un environnement distant est
interdite. Les erreurs partielles, notamment lors d'un téléversement ou d'une
suppression, DOIVENT produire un état compréhensible et récupérable.

### VII. Vérification avant livraison

Un changement n'est terminé que lorsque son comportement et ses limites sont vérifiés
à un niveau proportionné au risque. Les contrôles pertinents DOIVENT inclure le lint,
la vérification TypeScript, le build de production et les tests ciblés. Les règles
d'accès Supabase DOIVENT être testées pour les rôles anonyme, authentifié non autorisé
et administrateur. Les parcours critiques DOIVENT couvrir les états chargement, vide,
succès et erreur. Aucun formulaire ne DOIT afficher un faux succès. Une livraison qui
ne peut pas passer un contrôle DOIT documenter clairement le contrôle manquant et sa
cause ; elle ne peut pas être présentée comme entièrement validée.

## Contraintes produit et techniques

- Le produit est un MVP commercial de site vitrine pour une activité d'onglerie.
- Le socle autorisé est Next.js 16 App Router, React 19, TypeScript strict, Supabase
  Postgres, Auth et Storage, avec Zod pour la validation.
- L'administration couvre uniquement l'authentification de l'administrateur et le CRUD
  des prestations et de la galerie. L'inscription publique est interdite.
- Les rendez-vous, paiements, comptes clients, fidélité, publication Instagram,
  application mobile et backend séparé restent hors périmètre.
- L'hébergement commercial cible Netlify et Supabase dans les limites documentées de
  leurs offres gratuites. Vercel Hobby ne doit pas être proposé pour ce site commercial.
- Les images DOIVENT respecter les formats, dimensions, poids, chemins et métadonnées
  définis dans `doc/spec.md`; leur chargement public DOIT être optimisé et différé quand
  approprié.
- Les textes visibles par le public DOIVENT rester en français et les valeurs métier
  répétées DOIVENT être centralisées.

## Workflow de développement et critères de qualité

1. Identifier l'exigence et confirmer qu'elle appartient au MVP.
2. Lire les documents de référence et la documentation technique pertinente.
3. Produire ou mettre à jour les artefacts Spec Kit de la fonctionnalité sans contredire
   cette constitution ni les sources de vérité du projet.
4. Définir des critères d'acceptation observables, les risques de sécurité et les cas
   d'erreur avant l'implémentation.
5. Implémenter par petits changements cohérents, sans refactorisation hors périmètre.
6. Exécuter les contrôles applicables et vérifier les parcours publics et administratifs.
7. Synchroniser `doc/spec.md`, `doc/design.md`, `doc/architecture.md`, `doc/infra.md` et
   `AGENTS.md` dès qu'une décision les affecte.

Une revue DOIT refuser tout changement qui élargit silencieusement le MVP, altère le
design documenté, contourne l'autorisation côté serveur, expose un secret, modifie la
base ou Storage sans le mécanisme versionné exigé par le principe VI, ou ne fournit
pas de preuve de validation proportionnée au risque.

## Gouvernance

Cette constitution fixe les règles non négociables des artefacts Spec Kit et de leur
implémentation. `AGENTS.md` traduit ces règles en consignes opérationnelles ; les deux
DOIVENT rester alignés. En cas de contradiction entre la constitution et un document
du projet, l'implémentation DOIT s'arrêter jusqu'à ce que la contradiction soit résolue.
Une demande explicite et actuelle de l'utilisateur peut faire évoluer ces règles, mais
elle DOIT entraîner l'amendement des documents concernés avant ou avec le changement.

Tout amendement exige : une justification, l'approbation explicite de l'utilisateur,
une analyse d'impact, la mise à jour des modèles ou guides dépendants et une nouvelle
version conforme au versionnage sémantique :

- MAJOR pour le retrait d'un principe ou une redéfinition incompatible de la gouvernance ;
- MINOR pour l'ajout d'un principe, d'une section ou d'une obligation substantielle ;
- PATCH pour une clarification sans changement d'intention normative.

Chaque spécification, plan, liste de tâches et revue de changement DOIT vérifier la
conformité à cette constitution. Toute exception temporaire DOIT être écrite, justifiée,
approuvée par l'utilisateur et accompagnée d'une condition de suppression. La date de
dernière modification DOIT évoluer à chaque amendement, même lorsque le numéro de
version ne change que pour une clarification.

**Version**: 1.1.0 | **Ratified**: 2026-08-08 | **Last Amended**: 2026-08-12
