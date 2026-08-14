# Rapport de validation — Galerie

## Validation automatisée locale

Validation exécutée le 12 août 2026 sur la pile Supabase loopback, avec Node.js 24.19.0. Le fichier local de liaison hébergée a été masqué temporairement puis restauré automatiquement ; aucun projet hébergé ni environnement de production n’a été modifié.

| Gate | Résultat observé |
| --- | --- |
| `gallery:check` | PASS : reset/migrations, bucket privé, pgTAP/RLS, Storage, bootstrap, unitaires, lint, TypeScript, build, Chromium/WebKit, scénarios, SQL lint, advisors et scan. |
| Base de données | PASS : 321 assertions pgTAP incluant `09_gallery_management.sql`. |
| Bootstrap | PASS : 9 paires déterministes, deux exécutions idempotentes, SHA-256/dimensions/RIFF et SSIM >=0,97 vérifiés. |
| Tests unitaires galerie | PASS : 74/74, et 162/162 sur l’ensemble unitaire ; F01–F20, S01–S08, binaires orientés/RGBA/sRGB/P3, validation serveur, garde de cible, SSIM, douze interruptions et endurance 30/20/20. |
| Navigateurs galerie | PASS : matrice Chromium/WebKit de 48 cas déclarés ; les skips liés à l’absence d’encodeur Canvas WebP dans Playwright WebKit sont documentés et les parcours compatibles y restent exécutés. |
| Performance locale | PASS Chromium/WebKit : au plus 2 requêtes uniques/2 Mio pendant 5 s avant défilement, 9 au total sans doublon après parcours, somme `layout-shift` des cartes égale à 0. |
| Auth | PASS : 42/42 parcours Chromium/WebKit après reset ; matrice DB, unitaires, lint, TypeScript, build et scan passés. |
| Prestations | PASS : orchestrateur complet, y compris DB/RLS, types, build, Chromium/WebKit, scénarios et scan. |
| Pagination | PASS : 201 éléments restitués en 100/100/1, identifiants uniques et ordre stable sur 20 navigations. |
| Scans | PASS : aucune clé privilégiée ni chemin Storage canonique concret dans le bundle partageable. |
| Checklist lifecycle/image | PASS : 39/39 exigences réévaluées après explicitation du MIME vide, de la dernière sélection, des quinze essais bornés, des états réparables, des fallbacks et de la frontière d’intégrité. |

Les douze interruptions C1–C4/R1–R5/D1–D3 convergent par reprise répétée ; la matrice d’endurance termine avec 10 lignes `ready` et 10 objets, sans ancien objet orphelin.

Les oracles Chromium comparent l’aperçu au WebP exact destiné à l’envoi sur 50 alphas et 150 mesures CIEDE2000. Le parcours complet séparé confirme que ce même WebP est envoyé, revalidé octet par octet côté serveur, finalisé, puis visible au premier rendu administratif. Les bornes `pending` à 9 min 59 s, 10 min et 11 min, le fichier retiré, la liste Storage anonyme vide, la révocation 200→404, l’actualisation publique sous cinq secondes et le budget de deux images/2 Mio passent également.

## Limites connues des outils

Le moteur WebKit distribué avec Playwright dans cet environnement ne fournit pas d’encodeur Canvas WebP. Il valide donc le message de compatibilité, mais ne remplace pas le gate manuel sur un Safari mobile actuel. Les parcours ne nécessitant pas cet encodeur restent exécutés dans WebKit.

## Gates restant externes ou humains

- Safari iPhone/iPad réel : orientation photo, alpha, Display-P3, limite mémoire et conversion WebP ;
- Firefox, technologie d’assistance et protocole utilisateur ci-joint ;
- preview Netlify et projet Supabase de test explicitement autorisé ;
- vérification des quotas officiels au jour de la preview ;
- aucune production n’a été modifiée.
