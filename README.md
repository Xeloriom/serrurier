# Serrurier Dépannage Rapide

Site vitrine statique pour une entreprise de serrurerie et de dépannage à Lyon et alentours.

## Stack

- HTML
- CSS
- JavaScript
- Alpine.js
- Lenis
- Leaflet (carte)

## Prévisualisation locale

```bash
python3 -m http.server 8000
```

Ensuite, ouvrez `http://localhost:8000` dans votre navigateur.

## Publication sur GitHub Pages

Ce dépôt est prêt pour un déploiement GitHub Pages sans build.

1. Pousser le dépôt sur GitHub.
2. Ouvrir les paramètres du dépôt.
3. Aller dans `Pages`.
4. Choisir `GitHub Actions` comme source de publication.
5. Le workflow inclus dans `.github/workflows/pages.yml` déploiera automatiquement le site.

Le fichier `CNAME` est déjà configuré pour le domaine personnalisé :

`xn--serrurierdpannagerapide-kcc.fr`

## Fichiers utiles

- `CNAME` : domaine personnalisé pour GitHub Pages
- `.nojekyll` : évite le traitement Jekyll de GitHub Pages
- `.github/workflows/pages.yml` : workflow de déploiement automatique

## SEO et Google Search Console

- `robots.txt` et `sitemap.xml` : consignes d'exploration et URL canonique du site statique
- `SEARCH-CONSOLE.md` : procédure de vérification, soumission et contrôle après publication
- `scripts/check-seo.py` : vérification locale ; ajouter `--live https://xn--serrurierdpannagerapide-kcc.fr/` pour contrôler la version publiée

Ne soumettez pas le sitemap statique avant que cette version soit effectivement déployée sur le domaine. Le contrôle en ligne échoue tant que le domaine sert encore une autre version du site.

## Licence

MIT
