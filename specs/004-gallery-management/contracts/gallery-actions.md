# Contract: Actions et opérations de galerie

## Principes communs

Chaque Server Action est un endpoint POST direct et exécute dans cet ordre :

1. `requireAdminAction()` relit l'identité, le rôle et la session courante ;
2. Zod valide UUID, champs et valeurs fermées ;
3. la cible et son état sont relus sous RLS ;
4. la mutation exige l'`id` et, pour une reprise/finalisation, le même `operation_id` ;
5. le nombre/la ligne affectée est vérifié ;
6. `updateTag('galerie')` est appelé uniquement si la projection publique a réellement changé ;
7. l'action retourne un état structuré expurgé ou redirige après succès complet.

Les chemins libres, le rôle, l'état courant et l'existence de l'objet ne sont jamais crus depuis le client. Les appels Storage utilisent la session utilisateur et l'API officielle, jamais `service_role` ni SQL sur `storage.objects`.

Le bucket `galerie` est privé. Le configurateur d'infrastructure accepte uniquement une clé Supabase dédiée `sb_secret_...` dans son processus ponctuel, jamais la clé JWT historique `service_role`, et exige une URL/référence de cible explicitement concordante pour appliquer puis relire par l'API Storage le flag privé, la limite 8 Mio et les MIME. Il masque la clé dans toute sortie et son contrat impose sa révocation après succès. Le bootstrap exige ensuite ce flag et utilise seulement une session administrateur normale. Les deux échouent sur divergence et ne modifient jamais `storage.buckets` directement en SQL. Cette configuration ne fait pas partie du runtime CRUD, de Next.js ou de Netlify.

## `reserveCreateGalleryPhotoAction(previousState, formData)`

### Entrée

Métadonnées normalisées, caractéristiques du `PreparedImage` (`image/webp`, dimensions, poids) et intention active. Aucun octet image.

### Mutation

- Générer côté serveur `photoId`, `operationId` et `photos/<uuid-v4>.webp`.
- Insérer une ligne non publique `pending/create` avec `storage_path` et `pending_storage_path` réservés, dimensions/poids attendus et `operation_started_at` serveur.
- Retourner uniquement `photoId`, `operationId`, chemin réservé et bucket fixe nécessaires à l'upload.

### Échec

Aucune ligne ou une ligne `repair_required` explicite, jamais une réservation cachée non retrouvable. Aucun tag public n'est invalidé si aucune ligne publique n'existait.

## Upload direct client

Le navigateur envoie le Blob exact vers le chemin retourné : bucket `galerie`, `contentType:'image/webp'`, `upsert:false`. La politique Storage exige une ligne `pending` possédant ce `pending_storage_path`. Après succès Storage, le client appelle immédiatement la finalisation avec `photoId` et `operationId`. Une annulation appelle la compensation de création ; une fermeture brutale laisse la réservation récupérable et détectable.

## `finalizeCreateGalleryPhotoAction(previousState, formData)`

- Réautoriser et retrouver exactement `pending/create` avec les deux identifiants.
- Vérifier par l'API Storage que le chemin réservé existe et que MIME/poids concordent ; refuser avant téléchargement tout objet supérieur à 1 Mio.
- Télécharger le WebP final exact avec la session admin, valider ses octets RIFF, son caractère statique, ses dimensions et l'absence de chunks annexes avec `published-image-validation.ts` ; les dimensions navigateur ne sont jamais une preuve suffisante.
- Passer à `ready`, recopier les caractéristiques attendues dans les champs courants, vider tous les champs d'opération et appliquer l'intention `actif`.
- Appeler `updateTag('galerie')` si la ligne devient active ; annoncer le succès seulement après la mise à jour confirmée.
- Si l'objet ou la finalisation reste incertain, passer à `repair_required` avec un code fermé et ne pas annoncer de succès.

## `updateGalleryPhotoAction(previousState, formData)`

- Valider `photoId`, alt, titre, libellé, HTTPS, variante, ordre et visibilité.
- Refuser une modification générale pendant `pending`; pour `repair_required`, limiter les actions à réparer/remplacer/supprimer.
- Mettre à jour la même ligne et vérifier l'ID retourné.
- Invalider `galerie` si la ligne était ou devient publiable, si son contenu public change ou si elle est masquée.

## `setGalleryPhotoVisibilityAction(previousState, formData)`

- Entrée : UUID et booléen désiré explicite, jamais un toggle implicite.
- Autoriser seulement `file_state='ready'`.
- Mettre à jour `actif`, confirmer la ligne et invalider le tag.
- L'échec laisse l'ancien état non confirmé et ne prédit pas la base.

## Remplacement

### `reserveGalleryPhotoReplacementAction`

- Entrée : photo UUID et caractéristiques WebP préparées.
- Exiger une photo `ready` ; préserver ses champs éditoriaux et son `storage_path` courant.
- Générer `operationId` et nouveau chemin, puis passer la ligne à `pending/replace` avec les caractéristiques attendues.
- Le passage hors `ready` masque immédiatement la photo ; appeler `updateTag('galerie')` si elle était active, sans annoncer un remplacement réussi.

### Upload et `finalizeGalleryPhotoReplacementAction`

- Upload direct vers le nouveau chemin, sans upsert.
- Avant cette bascule, télécharger et valider les octets du nouveau WebP exactement comme pour une création ; un objet invalide est retiré ou conservé sous `repair_required/invalid_object_bytes` sans toucher l'ancien fichier.
- Après validation, remplacer atomiquement les champs courants par le chemin/dimensions/poids WebP confirmés et placer l'ancien chemin dans `cleanup_storage_path`.
- Supprimer l'ancien objet par Storage. En cas de réussite, vider l'opération, revenir `ready`, invalider le tag et annoncer le succès.
- Si le nouvel objet doit être retiré ou si l'ancien subsiste, conserver `repair_required` avec les chemins exacts. La photo reste masquée et aucun faux succès n'est annoncé.

Les métadonnées éditoriales se sauvegardent par `updateGalleryPhotoAction`; le remplacement de fichier préserve leur dernière valeur confirmée afin de ne pas devoir stocker un second brouillon durable.

## Suppression

### `beginDeleteGalleryPhotoAction`

- Reçoit seulement la photo UUID après confirmation UI.
- Passe la ligne à `pending/delete`, copie le chemin courant dans `cleanup_storage_path`, la masque et invalide le tag si nécessaire.

### `finalizeDeleteGalleryPhotoAction`

- Supprime l'objet exact via `remove`; « déjà absent » est une convergence valable.
- Supprime ensuite la ligne correspondant à `id + operation_id + delete`.
- Annonce le succès uniquement après absence de l'objet et de la ligne.
- Si la ligne ne peut être supprimée après l'objet, conserver `repair_required/row_delete_unconfirmed` et proposer une reprise.

## `repairGalleryPhotoAction(previousState, formData)`

- Entrée : photo UUID et `operation_id` seulement.
- Relire l'état et choisir la compensation depuis `operation_kind`/`repair_code` stockés.
- Créer : finaliser si le fichier attendu est valide, sinon nettoyer objet/réservation.
- Remplacer : finaliser le nouveau fichier, nettoyer le nouveau résidu ou retirer l'ancien selon l'étape conservée.
- Supprimer : confirmer l'absence de l'objet puis retirer la ligne.
- Une reprise répétée aboutit au même état ; aucune autre photo ni chemin n'est touché.

## `reconcileStaleGalleryOperationsAction()`

- Réautoriser, puis sélectionner côté serveur uniquement les lignes `pending` dont `operation_started_at <= now() - interval '10 minutes'` ; aucun ID de cible n'est accepté du navigateur.
- Inspecter pour chacune le ou les chemins exacts stockés et choisir `stale_pending_no_object` ou `stale_pending_object_present` selon le type d'opération et l'existence constatée.
- Passer la ligne à `repair_required`, invalider `galerie` si nécessaire et ne supprimer aucun objet automatiquement.
- Un second appel ne modifie pas les lignes déjà réconciliées ; une ligne âgée de 9 min 59 s reste `pending`.

## `markGalleryPhotoObjectMissingAction(previousState, formData)`

- Entrée : UUID de photo seulement, émis après l'échec d'une miniature admin ou une demande explicite de contrôle.
- Réautoriser, relire la ligne et son `storage_path`, puis vérifier l'objet exact par l'API Storage.
- Si l'objet existe, retourner l'état courant sans mutation ; s'il est absent, générer une enveloppe idempotente serveur `operation_kind=replace`, nouvel `operation_id`, date serveur et `repair_code=object_missing`, sans nouveau chemin réservé, masquer immédiatement la projection publique et appeler `updateTag('galerie')`.
- Depuis cet état, « Remplacer » crée la réservation WebP avant toute finalisation ; « Supprimer » démarre une nouvelle opération delete. Une reprise générique ne peut jamais traiter le `storage_path` absent comme un nouveau fichier valide.
- Une erreur réseau reste `network` et ne prétend jamais que l'objet est absent.

## Classification des résultats

| Condition | État public |
| --- | --- |
| Champ/UUID/caractéristiques invalides | `validation` |
| Session absente, expirée ou révoquée | `session_expired` |
| Rôle refusé | `forbidden` |
| Cible/opération absente ou changée | `not_found` ou `conflict` |
| Réseau/429/5xx/timeout | `network` |
| Quota/limite Storage | `quota` |
| Ressources désynchronisées mais reprenables | `repair_required` |
| Erreur inconnue/contrainte incohérente | `internal` |

Les codes et messages bruts du fournisseur ne sont jamais renvoyés. Une corrélation opaque peut relier l'état et un journal serveur expurgé.

## Pending et double activation

Chaque formulaire client utilise `useActionState`, désactive son action pendant `pending` et annonce l'attente. Cela garantit une mutation par activation UI ; l'`operation_id` et les préconditions d'état empêchent qu'une réémission directe finalise ou nettoie une autre opération.
