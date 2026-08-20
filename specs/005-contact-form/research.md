# Phase 0 Research: Formulaire de contact

## 1. Mutation applicative et détection Netlify Forms

**Decision**: le formulaire React invoque d'abord une Server Action avec `useActionState`. L'action valide et retourne un instantané normalisé fermé. Le navigateur encode ensuite cet instantané et le POSTe vers la définition statique relative `public/__forms.html`; la garde Edge revalide la charge avant Netlify Forms.

**Rationale**: la constitution impose une Server Action au parcours applicatif et Netlify documente le POST AJAX navigateur vers un blueprint statique. Le POST fournisseur est un contrat HTTP externe distinct ; la validation Edge protège aussi les soumissions directes qui contournent l'interface.

**Alternatives considered**:

- AJAX navigateur sans autorisation préalable : rejeté, car contraire à la règle constitutionnelle des mutations ;
- Route Handler : rejeté, la Server Action couvre proprement un formulaire React ;
- attribut `data-netlify` sur le seul JSX : rejeté, insuffisant pour la détection OpenNext documentée.

**Evidence**: le 19 août 2026, le POST serveur-à-serveur a expiré après 10 secondes sans créer de soumission, tandis qu'un POST AJAX valide vers le même blueprint a reçu HTTP 200 et créé exactement une soumission datée. L'utilisateur a approuvé le remplacement par le contrat AJAX documenté. La chaîne hybride complète reste à revalider en Deploy Preview.

## 2. Cible fournisseur fermée

**Decision**: le transport navigateur utilise uniquement le chemin relatif constant `/__forms.html`, avec `credentials: "omit"`, `redirect: "manual"` et un corps URL-encodé. Aucune URL, origine ou en-tête fourni par l'appelant ne peut modifier cette cible.

**Rationale**: une cible relative suit automatiquement l'origine courante, y compris une Deploy Preview, évite le risque preview-vers-production et ne nécessite aucune variable ou résolution SSRF. L'omission explicite des credentials évite de joindre une éventuelle session d'administration au POST public.

**Alternatives considered**:

- origine absolue capturée au build : retirée, inutile avec le transport navigateur et dangereuse en cas de repli preview-vers-production ;
- valeur de `FormData`, `Host` ou en-tête : rejetée comme cible ;
- cookies navigateur : rejetés, inutiles et susceptibles de fuiter une session.

## 3. Validation non contournable

**Decision**: partager un schéma Zod pur entre navigateur, Server Action et Netlify Edge Function. L'action protège le parcours applicatif ; la garde Edge couvre tous les POST directs qui déclarent `form-name=contact`.

**Rationale**: Netlify Forms n'impose pas les bornes métier 2/120, 254, 6/30 et 10/2 000. La garde analyse URL-encoded et multipart, refuse 415/422 de façon expurgée, puis poursuit avec une nouvelle `Request` normalisée. Les POST non-contact, dont l'invocation de la Server Action, restent intacts.

**Runtime evidence**: sur Deploy Preview, la lecture d'un clone multipart de Server Action par Edge a produit `Unexpected end of form` dans le handler Next. La garde court-circuite donc tout en-tête interne `Next-Action` avant lecture. Ces requêtes sont routées au framework ; les POST fournisseur, qui ne portent pas cet en-tête, restent revalidés sur tous les chemins.

**Alternatives considered**:

- validation navigateur seule : rejetée, contournable ;
- Server Action seule : rejetée, le blueprint reste directement postable ;
- webhook après soumission : rejeté, trop tard pour empêcher une entrée invalide.

## 4. Sémantique du succès

**Decision**: seul un HTTP 2xx reçu par le transport navigateur après autorisation de la Server Action produit le succès visible. Le corps fournisseur est ignoré.

**Rationale**: le classement Akismet est géré par la plateforme et le honeypot est rejeté silencieusement. Un 2xx prouve la prise en charge HTTP, pas le classement final Verified/Spam. Un 3xx avec `redirect: "manual"`, non-2xx, réseau ou timeout produit une erreur récupérable.

## 5. Timeout, réessai et doublons

**Decision**: définir `CONTACT_SUBMISSION_TIMEOUT_MS = 10_000`. Le délai commence juste avant le `fetch` fournisseur navigateur. À 10 000 ms sans 2xx, l'interface retourne `timeout`, conserve les quatre valeurs et l'UUID, et aucun réessai automatique n'est lancé.

**Rationale**: une borne unique et testable supprime l'ambiguïté. Netlify Forms ne documente ni clé d'idempotence ni livraison exactement une fois ; une requête interrompue peut avoir été acceptée. L'UUID rend un doublon repérable sans promettre de l'empêcher.

**Alternatives considered**:

- délai non chiffré : rejeté, invérifiable ;
- réessai automatique : rejeté, risque de doublon ;
- promettre zéro doublon : rejeté, impossible sans contrat fournisseur.

## 6. Validation, UI et accessibilité

**Decision**: conserver les valeurs brutes, supprimer uniquement les espaces périphériques au submit, ne jamais tronquer et mesurer les longueurs comme JavaScript/Zod. Utiliser les états `idle | pending | success | error`, les erreurs par champ, le focus sur la première erreur, une région live persistante, `aria-invalid`, `aria-describedby`, `aria-busy`, focus visible et contrôles de 44 px minimum.

Le nom n'a pas de regex restrictive. Le téléphone vide est valide ; sinon il contient 6 à 30 caractères parmi chiffres ASCII, `+`, espaces, `.`, `-`, `(`, `)` et au moins six chiffres. Le honeypot est caché, non focalisable et absent de l'arbre d'accessibilité. Un verrou `ref` synchrone complète `pending`, car plusieurs Server Actions pourraient autrement être mises en file.

## 7. Anti-spam et notifications

**Decision**: conserver le honeypot natif et Akismet sans captcha visible. Un honeypot rempli est transmis sans erreur révélatrice. Netlify notifie uniquement l'adresse opérationnelle confirmée pour les soumissions vérifiées, avec le champ `email` comme `Reply-To`. Aucune autoréponse visiteur.

**Rationale**: le couple anti-spam est invisible et conforme au MVP. L'adresse destinataire est une configuration distante non versionnée. La confirmation explicite de cette adresse est un prérequis bloquant du gate, et seule une preuve expurgée est conservée.

## 8. Coût et exploitation

**Decision**: rester sur Netlify Forms dans le plan Free à crédits et surveiller les requêtes web. Aucune variable secrète ou variable d'origine fournisseur n'est nécessaire.

**Rationale**: Netlify indique que Forms est inclus sur les plans à crédits ; le trafic et les invocations restent comptabilisés. Les comptes Legacy suivent un modèle différent et doivent être vérifiés sur le site réel.

## Sources officielles

- [Next.js — Forms](https://nextjs.org/docs/app/guides/forms)
- [Next.js — Mutating data](https://nextjs.org/docs/app/getting-started/mutating-data)
- [React — useActionState](https://react.dev/reference/react/useActionState)
- [OpenNext — Netlify Forms](https://opennext.js.org/netlify/forms)
- [Netlify — Forms setup](https://docs.netlify.com/manage/forms/setup/)
- [Netlify — Spam filters](https://docs.netlify.com/manage/forms/spam-filters/)
- [Netlify — Verified and spam submissions](https://docs.netlify.com/manage/forms/submissions/)
- [Netlify — Form notifications](https://docs.netlify.com/manage/forms/notifications/)
- [Netlify — Edge request chain](https://docs.netlify.com/build/edge-functions/optional-configuration/#request-chain)
- [Netlify — Edge Functions API](https://docs.netlify.com/build/edge-functions/api/)
- [Netlify — Function environment variables](https://docs.netlify.com/build/functions/environment-variables/)
- [Netlify — Build environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/)
- [Netlify — Forms usage and billing](https://docs.netlify.com/manage/forms/usage-and-billing/)
