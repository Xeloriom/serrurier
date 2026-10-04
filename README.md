# Serrurier Dépannage Rapide

Site vitrine statique Astro pour une entreprise de serrurerie et de dépannage à Lyon et alentours. Astro génère des pages HTML pré-rendues et n'ajoute pas de JavaScript client par défaut.

## Stack

- Astro (génération statique)
- CSS
- JavaScript
- Alpine.js
- Lenis
- Leaflet (carte)

## Prévisualisation locale

```bash
npm ci
npm run dev
```

Ensuite, ouvrez l'adresse locale affichée par Astro (par défaut `http://localhost:4321`).

Pour générer la version de production, exécutez `npm run build`. Les pages prêtes à publier sont générées dans `dist/`.

## Contrôles qualité

Avant publication, les contrôles vérifient le JavaScript avec ESLint, les pages et liens avec le script SEO, et les parcours essentiels dans Chromium sans erreur JavaScript ni erreur de console.

```bash
npx playwright install chromium
npm run check
```

GitHub Actions exécute ces contrôles sur chaque pull request vers `main` et avant chaque déploiement. Un contrôle en échec bloque la publication.

## Publication sur GitHub Pages

Le workflow GitHub Actions construit le site avec Astro puis publie uniquement le dossier `dist/` sur GitHub Pages.

1. Pousser le dépôt sur GitHub.
2. Ouvrir les paramètres du dépôt.
3. Aller dans `Pages`.
4. Choisir `GitHub Actions` comme source de publication.
5. Le workflow inclus dans `.github/workflows/pages.yml` construira et déploiera automatiquement le site.

Le fichier `CNAME` est déjà configuré pour le domaine personnalisé :

`xn--serrurierdpannagerapide-kcc.fr`

## Fichiers utiles

- `CNAME` : domaine personnalisé pour GitHub Pages
- `.nojekyll` : évite le traitement Jekyll de GitHub Pages
- `src/pages/` : pages Astro pré-rendues avec les URL publiques existantes
- `astro.config.mjs` : configuration de génération statique
- `.github/workflows/pages.yml` : vérifications, build et déploiement automatique

## SEO et Google Search Console

- `robots.txt` et `sitemap.xml` : consignes d'exploration et URL canonique du site statique
- `llms.txt` : résumé factuel et liens canoniques pour les outils qui choisissent de le lire (non officiel pour Google)
- `SEARCH-CONSOLE.md` : procédure de vérification, soumission et contrôle après publication
- `ouverture-porte-lyon/`, `serrure-porte-blindee-lyon/`, `volet-roulant-lyon/`, `vitrerie-lyon/` : pages informatives dédiées aux prestations
- `zone-intervention-serrurier-lyon/` : secteurs et communes cités, avec confirmation de disponibilité par téléphone
- `scripts/check-seo.py` : vérification de la sortie de production ; ajouter `--live https://xn--serrurierdpannagerapide-kcc.fr/` pour contrôler la version publiée et le sitemap

Les pages villes quasi identiques ne sont pas créées : ne publiez des pages locales supplémentaires que si elles contiennent de vraies informations propres à chaque secteur. Ne soumettez pas le sitemap statique avant que cette version soit effectivement déployée sur le domaine. Le contrôle en ligne échoue tant que le domaine sert encore une autre version du site.

## Licence

MIT
