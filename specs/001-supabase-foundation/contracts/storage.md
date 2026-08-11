# Gallery Storage Contract

## Bucket

| Property | Value |
| --- | --- |
| ID/name | `galerie` |
| Visibility | Public distribution |
| File size limit | 8 MiB (8 388 608 bytes) |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Application prefix | `photos/` |

Le bucket est déclaré dans la configuration Supabase locale et établi de façon reproductible. Sa lecture publique ne confère aucun droit public d'écriture ni de liste sur `storage.objects`.

## Object identity enforced now

La fondation accepte uniquement le chemin canonique suivant :

```text
photos/<uuid-v4>.<jpg|jpeg|png|webp>
```

- Le segment est un UUID v4 minuscule ; aucun segment `..`, sous-dossier, slash additionnel ou préfixe étranger n'est admis.
- La contrainte des métadonnées exige la cohérence entre extension et `mime_type`; le bucket borne le `contentType` déclaré, sans prétendre inspecter les octets.
- Le même chemin est stocké dans `photos_galerie.storage_path` et doit être unique.
- Les politiques `INSERT`, `SELECT`, `UPDATE` (`USING` et `WITH CHECK`) et `DELETE` répètent toutes les frontières administrateur, bucket et chemin canonique.

La future gestion de galerie générera le chemin effectif sans se fier au nom original. Un UUID produit par le contrôle d'intégration n'est qu'une fixture et ne livre pas ce générateur applicatif.

## Future write workflows (not implemented here)

### Upload

1. Le futur client vérifie taille et format pour un retour rapide.
2. La future gestion de galerie génère le chemin canonique.
3. Storage réapplique limite, MIME déclaré et politique `INSERT` avec la session admin.
4. Après succès réel, la future action insère la métadonnée validée.
5. Si l'insertion SQL échoue, le futur workflow applique sa stratégie de nettoyage ou de reprise et ne produit aucun faux succès.

### Replace

1. Conserver le chemin canonique existant ou générer un nouveau chemin selon le workflow galerie futur.
2. Exiger les politiques `INSERT`, `SELECT` et `UPDATE` pour un upsert.
3. N'actualiser dimensions, MIME, taille et `updated_at` qu'après succès Storage.
4. En cas d'échec partiel, ne pas afficher de réussite et conserver une stratégie de reprise explicite.

### Delete

1. Demander une confirmation explicite dans la future interface.
2. Supprimer l'objet avec la politique `DELETE` admin dédiée.
3. Supprimer la métadonnée uniquement selon l'ordre transactionnel défini par la future feature galerie.
4. Si une étape échoue, conserver suffisamment de contexte serveur non sensible pour reprendre ou nettoyer sans faux succès.

Cette fondation fournit et teste chaque permission isolément ; elle ne met en œuvre aucun de ces workflows multi-étapes et n'expose aucune opération produit « supprimer une photo ».

### Concurrent writes

Cette fondation ne fournit ni verrouillage optimiste, ni version fonctionnelle, ni résolution de conflit pour deux écritures simultanées sur la même ligne ou le même chemin. Les contraintes d'unicité PostgreSQL, les frontières RLS et les politiques Storage restent applicables, mais la future gestion de galerie devra choisir une stratégie explicite de sérialisation ou de détection de conflit et la tester avant d'exposer ces mutations à l'administrateur.

## Visibility semantics

- `photos_galerie.actif = true` autorise l'apparition dans la liste publique.
- `actif = false` conserve la métadonnée et l'objet pour l'administration.
- Comme le bucket est public, masquer ou supprimer la métadonnée ne garantit pas la révocation immédiate d'une URL déjà connue.
- La suppression définitive doit retirer à terme l'objet et la métadonnée.

## Deferred image-processing constraints

La conversion, le redimensionnement, la compression, la prévisualisation, l'inspection du contenu binaire et la génération de chemin sont hors de cette feature. Le format cible WebP, la largeur finale maximale de 1 600 px, la vérification fiable octets/MIME/extension et le plafond applicatif après traitement seront appliqués par la future feature galerie. Le bucket accepte temporairement les trois MIME déclarés et la limite d'entrée finalisée de 8 MiB.

## Verification contract

Le contrôle `scripts/check-supabase-storage.mjs` s'exécute uniquement contre une URL loopback. Après vérification de l'aide CLI, il capture en mémoire la capacité administrative depuis la sortie machine de `supabase status` pour créer et nettoyer les identités de test, sans l'écrire ni l'imprimer. Chaque opération Storage contrôlée utilise la clé publiable et une vraie session du profil concerné. Le nettoyage des utilisateurs, objets et métadonnées s'exécute dans un bloc final, sans imprimer de clé, JWT, mot de passe ou réponse brute sensible.

- L'administrateur envoie une petite image valide sous `photos/<uuid-v4>.png`; un `fetch` non authentifié de l'URL publique retourne réellement ses octets (`getPublicUrl()` seul ne suffit pas).
- `anon`, le connecté non-admin et l'ancien admin révoqué ne peuvent ni envoyer, remplacer ni supprimer; après chaque refus, l'administrateur prouve l'absence d'objet résiduel ou de changement d'octets.
- L'administrateur peut lister, envoyer, remplacer et supprimer. L'upsert prouve ensemble `INSERT`, `SELECT` et `UPDATE`; `DELETE` est contrôlé séparément.
- Pour la non-découverte publique, une liste vide filtrée ou un refus est acceptable; aucun code HTTP précis n'est imposé.
- `other/<uuid>.png`, `photos/nested/<uuid>.png`, `photos/not-a-uuid.png`, un UUID non-v4 ou en majuscules, `image/gif` et un contenu de 8 MiB + 1 octet sont refusés.
- Supprimer temporairement l'objet laisse sa métadonnée intacte; supprimer temporairement la métadonnée laisse l'objet publiquement lisible. Le contrôle nettoie ensuite les deux côtés. Ces assertions prouvent la séparation des permissions, pas un workflow coordonné.
- Les tests n'utilisent jamais la capacité privilégiée locale pour faire réussir une opération Storage du parcours applicatif.
