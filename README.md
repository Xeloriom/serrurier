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

## Contrôles qualité

Avant publication, les contrôles vérifient le JavaScript avec ESLint, les pages et liens avec le script SEO, et les parcours essentiels dans Chromium sans erreur JavaScript ni erreur de console.

```bash
npm ci
npx playwright install chromium
python3 scripts/check-seo.py
npm run check
```

GitHub Actions exécute ces contrôles sur chaque pull request vers `main` et avant chaque déploiement. Un contrôle en échec bloque la publication.

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
- `llms.txt` : résumé factuel et liens canoniques pour les outils qui choisissent de le lire (non officiel pour Google)
- `SEARCH-CONSOLE.md` : procédure de vérification, soumission et contrôle après publication
- `ouverture-porte-lyon/`, `serrure-porte-blindee-lyon/`, `volet-roulant-lyon/`, `vitrerie-lyon/` : pages informatives dédiées aux prestations
- `zone-intervention-serrurier-lyon/` : secteurs et communes cités, avec confirmation de disponibilité par téléphone
- `scripts/check-seo.py` : vérification locale de toutes les pages ; ajouter `--live https://xn--serrurierdpannagerapide-kcc.fr/` pour contrôler la version publiée et le sitemap

Les pages villes quasi identiques ne sont pas créées : ne publiez des pages locales supplémentaires que si elles contiennent de vraies informations propres à chaque secteur. Ne soumettez pas le sitemap statique avant que cette version soit effectivement déployée sur le domaine. Le contrôle en ligne échoue tant que le domaine sert encore une autre version du site.

## Licence

MIT
