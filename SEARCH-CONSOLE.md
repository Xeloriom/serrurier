# Préparer et suivre Google Search Console

## Avant l'ajout dans Search Console

Search Console ne déploie pas le site et ne peut pas être configurée complètement depuis ce dépôt : Google doit vérifier la propriété du domaine, ce qui nécessite l'accès au compte Google et au DNS ou à l'hébergement.

**Point bloquant vérifié le 4 octobre 2026 :** `https://xn--serrurierdpannagerapide-kcc.fr/` sert encore une page WordPress avec un titre différent de celui de cette refonte. Le `robots.txt` en ligne annonce `sitemap_index.xml`; son sitemap contient encore des URLs de démonstration du thème et des pages sans rapport avec la serrurerie. Les fichiers `robots.txt` et `sitemap.xml` de ce dépôt ne sont donc pas encore les fichiers servis par le domaine.

Avant de demander l'indexation de cette refonte :

1. Déployer cette version sur le domaine canonique et vérifier que la page d'accueil, ses images, `robots.txt` et `sitemap.xml` répondent en HTTPS.
2. Si le site reste sous WordPress, ne remplacez pas son `robots.txt` ni son sitemap par ceux de ce dépôt sans avoir changé le déploiement. Corrigez plutôt les pages de démonstration dans le CMS et dans le sitemap produit par son extension SEO.
3. Vérifier que la page d'accueil en ligne affiche le titre et le H1 de cette refonte, possède une URL canonique vers elle-même et renvoie `200`. Les anciennes pages réellement supprimées doivent être redirigées vers leur équivalent pertinent, ou renvoyer `404`/`410` si aucun équivalent n'existe ; ne pas les rediriger toutes vers l'accueil.
4. Lancer `python3 scripts/check-seo.py` pour contrôler le dépôt, puis `python3 scripts/check-seo.py --live https://xn--serrurierdpannagerapide-kcc.fr/` après le déploiement. Le contrôle en ligne échoue intentionnellement si Google pourrait encore voir l'ancien site ou un sitemap contenant des pages de démonstration.

## Vérifier la propriété

1. Ouvrir [Google Search Console](https://search.google.com/search-console/) avec le compte Google qui doit garder l'accès.
2. Ajouter la propriété de domaine `xn--serrurierdpannagerapide-kcc.fr` (forme ASCII/punycode du domaine IDN). Cette propriété couvre HTTP/HTTPS et les sous-domaines.
3. Google fournira un enregistrement DNS TXT unique. L'ajouter chez le fournisseur DNS en conservant les autres enregistrements existants, puis cliquer sur **Vérifier** dans Search Console. La propagation DNS peut prendre du temps.
4. Si vous n'avez pas accès au DNS, demander l'accès au propriétaire actuel ou choisir la propriété de préfixe d'URL `https://xn--serrurierdpannagerapide-kcc.fr/` et utiliser une méthode proposée par Google (fichier HTML à déposer à la racine ou balise HTML à placer dans le `<head>`).

Le jeton de vérification est propre à votre compte et doit être généré dans Search Console. N'ajoutez pas de jeton fictif au HTML, ne supprimez pas un jeton existant et ne partagez pas le DNS ou les accès Google. Conservez une seconde méthode de vérification si possible.

## Envoyer le sitemap et contrôler l'indexation

Après déploiement, ouvrir **Indexation → Sitemaps**, saisir `sitemap.xml` (ou le chemin réellement annoncé par le `robots.txt` déployé), puis envoyer. Le sitemap comprend l'accueil, quatre pages de services et une page qui décrit la zone desservie. Ne soumettez pas le sitemap statique de ce dépôt tant que le site WordPress actuel le sert encore.

Ensuite, inspecter `https://xn--serrurierdpannagerapide-kcc.fr/` avec **Inspection de l'URL** :

- tester l'URL publiée et confirmer que Google peut l'explorer, qu'elle est indexable et que le canonique choisi par Google correspond au canonique déclaré ;
- après correction d'un problème ou publication d'une mise à jour importante, demander une nouvelle exploration une fois. Cela ne garantit ni l'indexation ni un délai précis ;
- surveiller **Pages**, **Sitemaps**, **Résultats enrichis**, **Expérience → Signaux Web essentiels**, **Actions manuelles** et **Problèmes de sécurité** ;
- consulter **Performances → Résultats de recherche** pour les impressions, clics, requêtes et pages après accumulation des données.

Vérifier les URL préfixes et variantes de domaine utiles si elles existent (HTTP, `www`, sous-domaines) : elles ne remplacent pas la propriété de domaine et doivent rediriger vers l'URL canonique HTTPS.

## Fiche d'établissement et données de l'entreprise

La présence dans Search Console n'inscrit pas automatiquement l'entreprise sur Google Maps et ne garantit aucun classement. Si l'entreprise est éligible, créer ou revendiquer sa [fiche d'établissement Google](https://www.google.com/business/) et utiliser le vrai nom, le vrai téléphone, les horaires réels et les zones effectivement desservies.

Le balisage `Locksmith` du site n'inclut pas d'adresse, car aucune adresse publique vérifiée n'a été fournie. Ne publiez pas une adresse privée pour compléter le balisage. Google demande une adresse pour certains résultats enrichis `LocalBusiness`; le balisage n'est pas une promesse d'affichage. Ne marquez pas les avis de l'entreprise comme des avis indépendants donnant droit à des étoiles.

## Références Google

- [Premiers pas avec Search Console](https://developers.google.com/search/docs/monitor-debug/search-console-start)
- [Vérifier la propriété d'un site](https://support.google.com/webmasters/answer/9008080)
- [Créer et envoyer un sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Demander une nouvelle exploration](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Données structurées LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Fonctionnalités IA dans Google Search](https://developers.google.com/search/docs/appearance/ai-features)
- [Création de contenu utile et fiable](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Consignes anti-spam](https://developers.google.com/search/docs/essentials/spam-policies)

## Google Search, résultats IA et autres assistants

Google indique qu'il n'existe pas d'exigences techniques supplémentaires ni d'optimisation spéciale pour AI Overviews ou AI Mode : les pages doivent être indexables et respecter les bases SEO habituelles. Garder les informations importantes visibles dans le texte HTML, les liens accessibles, le balisage identique au contenu réel, des images descriptives et les données de fiche d'établissement exactes. Les visites depuis les fonctionnalités IA sont incluses dans le rapport de performances Search Console, type de recherche **Web**.

`/llms.txt` est fourni comme résumé lisible par certains outils d'IA; ce n'est pas un format officiellement pris en charge par Google Search ni une garantie d'accès ou de citation. Les règles d'exploration de `robots.txt` restent la référence pour les bots qui les respectent. Ne copiez pas d'informations sensibles dans un fichier public. Lisez et tenez à jour les pages canoniques : elles priment sur le résumé.
