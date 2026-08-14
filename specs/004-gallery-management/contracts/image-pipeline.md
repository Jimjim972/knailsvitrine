# Contract: Préparation et encodage des images

## Entrée

Une image unitaire sélectionnée depuis l'appareil. Formats candidats : JPEG, PNG, WebP.

## Préflight binaire

1. Refuser 0 octet ou plus de 8 Mio.
2. Lire les octets et identifier le conteneur par signature ; `File.type` n'est qu'un indice.
3. JPEG : parcourir les segments bornés jusqu'à un SOF valide ; PNG : signature, `IHDR` de 13 octets et chunks bornés ; WebP : `RIFF`/taille/`WEBP` et chunks paddés valides.
4. Refuser APNG (`acTL`) et WebP animé (`ANIM`, `ANMF` ou flag animation).
5. Refuser troncature, longueur hors limites, absence de dimensions, incohérence MIME non vide/signature.
6. Refuser un côté supérieur à 8 192 px ou un produit supérieur à 25 000 000 pixels avant décodage.

## Décodage et couleurs

- Préférer `createImageBitmap(file, { imageOrientation:'from-image', colorSpaceConversion:'default', premultiplyAlpha:'default', resizeQuality:'high' })`.
- Si les options échouent, réessayer `createImageBitmap(file)` ; si l'API échoue, utiliser `HTMLImageElement.decode()` depuis une URL Blob.
- Ne jamais appliquer manuellement une seconde rotation au repli HTML.
- Exiger que les dimensions décodées correspondent aux dimensions inspectées, éventuellement échangées par l'orientation.
- Dessiner dans un Canvas 2D `{ alpha:true, colorSpace:'srgb' }`; le défaut sRGB est accepté si l'attribut n'est pas reconnu.
- Ne peindre aucun fond ; le canal alpha visuel est conservé.
- La vérification alpha utilise deux fixtures RGBA versionnées. La première ne déclenche aucun redimensionnement et fixe 25 coordonnées avec leur alpha 8 bits attendu : 0 et 255 exacts, valeurs intermédiaires à ±1. La seconde mesure 2 000 × 1 000, porte un gradient alpha horizontal analytique et doit sortir en 1 600 × 800 : aux 25 positions normalisées, l'alpha attendu est `arrondi(255 × u)`, avec 0/255 exacts aux extrémités et valeurs intermédiaires à ±3. Les composantes RGB cachées sous un alpha nul ne sont pas comparées.

## Redimensionnement et encodage

Dimensions candidates du côté long : `min(original,1600)`, puis -100 jusqu'à 1 200. Un original inférieur à 1 200 n'est jamais agrandi et conserve une seule dimension candidate. Les proportions sont conservées et chaque côté reste au moins 1 px.

À chaque dimension, essayer exactement :

1. WebP qualité 0,85 ;
2. WebP qualité 0,80 ;
3. WebP qualité 0,75.

Accepter le premier résultat de 1 048 576 octets maximum. La qualité est un indice d'encodeur ; le poids réel est la règle. Au plus 15 essais sont exécutés, séquentiellement, avec restitution régulière du contrôle à l'interface. Si aucun résultat n'est accepté, refuser sans upload.

## Validation/sanitation WebP finale

Après chaque `toBlob` candidat :

- Blob non nul ;
- `blob.type === 'image/webp'` ;
- signature `RIFF`/`WEBP` et conteneur valide ;
- aucune animation ;
- retirer `ICCP`, `EXIF`, `XMP ` et tout chunk inconnu ;
- conserver uniquement la structure/données requises (`VP8X`, `ALPH`, `VP8 ` ou `VP8L`) ;
- effacer les flags de métadonnées, recalculer padding et taille RIFF ;
- revalider dimensions, alpha et poids.

Un export silencieusement retombé en PNG ou un résultat nul provoque une erreur de compatibilité ; aucun format de secours n'est envoyé.

## Sortie

`PreparedImage` contient le Blob exact aperçu et envoyé, nommé `<uuid>.webp`, MIME WebP, dimensions, poids et qualité. L'URL Blob précédente est révoquée à chaque changement et au démontage. Les `ImageBitmap` sont fermés et les Canvas libérés.

## Concurrence et erreurs

- Une génération identifie la sélection courante ; tout résultat d'une ancienne sélection est ignoré/nettoyé.
- Aucun encodage parallèle et aucune boucle non bornée.
- Allocation/décodage impossible : message « Image trop complexe pour cet appareil » et choix d'un fichier plus petit.
- WebP indisponible : message invitant à mettre Safari à jour ou changer de navigateur.
- Aucune sortie partielle, aucun original non traité et aucune trace sensible ne sont envoyés.

## Validation serveur complémentaire

Le client n'est ni une frontière d'autorisation ni une preuve d'intégrité des octets. La finalisation réautorisée suit cet ordre :

1. relire la réservation par `photoId + operationId` et son chemin exact ;
2. lire les métadonnées Storage et refuser avant téléchargement tout objet absent, supérieur à 1 048 576 octets ou dont le type annoncé n'est pas `image/webp` ;
3. télécharger l'objet exact avec le client SSR de la session administrateur, jamais une URL ou un chemin fourni librement ;
4. limiter l'ArrayBuffer à 1 048 576 octets et exécuter le validateur RIFF pur partagé ;
5. exiger RIFF/WEBP, image statique, dimensions identiques à la réservation, structure alpha cohérente et absence de `ICCP`, `EXIF`, `XMP ` ou chunk inconnu ;
6. passer à `ready` seulement après ce résultat.

Un échec entraîne `remove([exactPath])`. Si l'absence de l'objet ne peut pas être confirmée, la ligne devient `repair_required/invalid_object_bytes` et conserve uniquement le chemin exact de nettoyage. Aucun octet original de 8 Mio ne traverse la Server Action ; seul le WebP final de 1 Mio maximum est relu une fois. Aucun `service_role` ni antivirus externe n'est ajouté au MVP.

Les fonctions de parsing, validation RIFF et génération des dimensions candidates restent indépendantes de Canvas et testables sous `node:test`. Les opérations réelles `createImageBitmap`, Canvas, orientation, conversion sRGB et encodage sont couvertes dans Playwright Chromium/WebKit et sur Safari mobile réel.
