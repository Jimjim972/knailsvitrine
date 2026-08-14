# Contract: Interface de gestion et galerie publique

## Routes administratives

| Route | Accès | But |
| --- | --- | --- |
| `/admin` | admin courant | Ajouter le lien réel « Galerie ». |
| `/admin/galerie` | admin courant | Liste complète, statuts et actions. |
| `/admin/galerie/nouvelle` | admin courant | Préparer et créer une photo. |
| `/admin/galerie/[id]/modifier` | admin courant | Modifier métadonnées et remplacer le fichier. |
| `/api/gallery-images/[id]` | public si photo active et `ready` | Livrer les octets privés après relecture de l'état courant. |
| `/api/admin/gallery-images/[id]` | admin courant | Livrer une miniature privée de tout état administrable. |

`params`/`searchParams` sont des promesses Next.js 16. Les `error.tsx` sont des Client Error Boundaries ; pages, listes et chargements restent serveur.

## Liste

La liste sémantique devient des rangées sur ordinateur et des cartes sous 760 px. Chaque item expose :

- miniature ou état de fichier indisponible ;
- titre ou texte alternatif de repérage ;
- variante et ordre ;
- format, dimensions et poids ;
- intention de visibilité textuelle « Active » ou « Masquée » ;
- état de fichier textuel « Prête », « En cours » ou « À réparer » ;
- actions textuelles Modifier, Masquer/Réactiver, Remplacer, Supprimer et, lorsque pertinent, Réparer.

Les états distincts sont chargement, vide avec CTA réel, données, erreur récupérable, session expirée, mutation en cours et réparation. Aucune information essentielle ne dépend de la couleur, du survol ou d'une icône.

Jusqu'à 100 lignes, aucune pagination n'est affichée. À partir de la 101e, la liste présente des pages de 100 éléments avec précédent/suivant, numéro courant et total ; l'ordre serveur reste section/ordre/date/ID et chaque action conserve l'ID exact de sa ligne.

Après hydratation de la liste, `PendingOperationReconciler` invoque une seule fois la Server Action de réconciliation. Seuls les `pending` âgés d'au moins 10 minutes passent à « À réparer » ; l'attente est annoncée sans bloquer la consultation et aucun nettoyage destructif n'est automatique.

## Formulaire et préparation

Groupes :

1. **Image** : sélection unitaire, progression de traitement, aperçu exact, format/dimensions/poids/qualité ;
2. **Description** : alt obligatoire, titre et libellé facultatifs, lien HTTPS facultatif ;
3. **Présentation** : cinq variantes, aperçu de cadrage avec `object-fit:cover`, ordre, visibilité ;
4. **Actions** : enregistrer, annuler, zone destructive séparée en édition.

Les labels sont visibles, champs requis indiqués, erreurs liées avec `aria-describedby`/`aria-invalid`, valeurs récupérables conservées et pending annoncé. Le choix d'un nouveau fichier annule/nettoie l'ancien aperçu. Aucun bouton de confirmation n'est actif avant un `PreparedImage` valide.

## Remplacement

Le fichier courant reste visible pendant la préparation locale. Après réservation, la photo devient non publique jusqu'à convergence. L'interface distingue clairement : traitement local, transfert, finalisation, nettoyage ancien fichier et réparation requise. Les champs éditoriaux se sauvegardent indépendamment avant ou après le remplacement.

## Suppression

Dialogue accessible titré « Supprimer cette photo ? », miniature et texte de repérage, conséquence « la photo et son fichier seront supprimés », actions Annuler/Supprimer définitivement. Focus initial sur l'annulation, Escape annule, focus restauré. Aucun appel n'a lieu avant confirmation.

## Réparation

Une carte d'avertissement explique sans jargon que le fichier et la fiche doivent être remis en cohérence. Elle propose exactement l'action sûre calculée depuis l'état serveur : reprendre, nettoyer, remplacer ou terminer la suppression. Le chemin Storage et le code fournisseur ne sont pas affichés.

Une miniature admin qui échoue affiche « Fichier indisponible » et un bouton nommé « Vérifier ». Ce contrôle explicite déclenche l'audit ciblé réautorisé avec l'ID seulement, ce qui évite une rafale de mutations si plusieurs fichiers d'une page sont absents. Le public masque seulement la carte en erreur dans la vue courante ; aucune erreur d'image n'expose un chemin ou un détail fournisseur.

## Galerie publique

- Conserver `PageHeading`, la grille 12 colonnes, les quatre variantes principales, le journal social, les transitions et le responsive documentés.
- Une combinaison incomplète utilise la carte standard sans modifier les données.
- Une section vide est absente ; si les deux le sont, afficher le message neutre unique sous l'en-tête.
- Une carte sans lien reste non interactive. Une URL HTTPS présente utilise un nom accessible décrivant la destination.
- Aucun lien/compte Instagram temporaire n'est migré comme vérité ; la section sociale peut exister sans CTA externe.
- `next/image` reçoit une URL même origine par ID, alt, dimensions ou `fill` avec parent dimensionné, `sizes`, `unoptimized`; les deux premières images sont montées après hydratation sans doublon de requête. Les autres ne sont montées qu'après le premier défilement, par `IntersectionObserver` avec une marge verticale de 800 px. La même URL cesse de livrer les octets dès le masquage ou le passage non `ready`.

## Responsive et accessibilité

- Aucun débordement à 320, 768 et 1 024 px ; contrôle visuel aussi à 375 et 1 440 px.
- Cibles de 44 × 44 px, focus `--gold`, ordre clavier logique, annonces importantes et erreurs liées.
- Manrope pour l'administration, Playfair uniquement pour le titre principal ; tokens/rayons/ombres de `doc/design.md`.
- Overlay/légende utilisables sans hover sur mobile/clavier ; `prefers-reduced-motion` conservé.
- Contrôles automatisés Chromium/WebKit et contrôles manuels Safari mobile réel/Firefox/technologie d'assistance.

## Interdictions visuelles/fonctionnelles

Pas de drag-and-drop, upload multiple, recadrage manuel, nouvelle couleur/police/breakpoint, icône seule, dark mode, publication Instagram, donnée factice ou Header/Footer public dans l'administration.
