# Architecture — Time Travel Globe

## 1. Stack technique

| Composant      | Technologie                                                   |
| -------------- | ------------------------------------------------------------- |
| Globe 3D       | Three.js r128 (vanilla en dev)                                |
| Clustering     | Supercluster 8.0.1 (CDN jsDelivr)                             |
| Frontend       | HTML/CSS/JS vanilla, pas de framework                         |
| Build          | Vite (production uniquement, file hashing pour cache-busting) |
| Source         | Site Prehistoric Domain, route `/api/globe` (base du site) ; Webflow abandonné le 2026-10-19 |
| Scripts        | Node.js natif (0 dépendances npm, fetch natif Node 18+)       |
| Géocodage      | PBDB API (paleobiodb.org)                                     |
| Reconstruction | GPlates API MERDITH2021 (gws.gplates.org, limite 410 Ma)      |
| Hébergement    | Cloudflare Pages (`prehistoric-domain-timetravel.pages.dev`) ; ancienne copie sur Hostinger pour le site Webflow |
| Intégration    | iframe dans le site (page `/time-travel`)                     |

---

## 2. Structure du projet

```
├── index.html                  → Point d'entrée globe principal
├── browse.html                 → Page de recherche/catalogue de contenus
├── placement.html              → Outil de placement manuel interactif
├── src/
│   ├── app.js                  → Contrôleur principal (AppController)
│   ├── globe.js                → Globe Three.js (GlobeManager)
│   ├── browse.js               → Page Browse (BrowseManager)
│   ├── placement.js            → Contrôleur placement (PlacementController)
│   ├── popup.js                → Popup contenu (PopupManager)
│   ├── filters.js              → Filtres type (FiltersManager)
│   ├── favorites.js            → Gestion favoris (FavoritesManager)
│   └── webflow-api.js          → Chargeur de données (WebflowAPI)
├── scripts/
│   ├── sync-contents.js        → Orchestrateur principal (point d'entrée)
│   ├── cms-helpers.js          → Utilitaires CMS partagés (categories, previews)
│   ├── import-cms-items.js     → Géocodage moderne (PBDB + free-tags)
│   ├── paleo-reconstruction.js → Module central de reconstruction (partagé)
│   ├── reconstruct-paleogeography.js          → Reconstruction (complète ou --incremental)
│   ├── validate-content-data.js → Validation structure JSON
│   ├── validate-free-tags.js    → Validation qualité free-tags
│   ├── fetch-merdith2021.py     → Téléchargement coastlines (one-shot, archivé)
│   ├── placement-server.js      → Serveur HTTP pour l'outil de placement
│   ├── help.sh                  → Aide rapide (npm run help)
│   └── manual-coordinate-fixes.json → Corrections manuelles de position
├── assets/
│   ├── data/
│   │   └── content-data.json   → Données finales (généré par scripts)
│   ├── merdith2021-coastlines/ → 34 fichiers GeoJSON (0-500 Ma)
│   ├── cao-paleogeography/     → 24 fichiers GeoJSON (6-396 Ma)
│   ├── geojson/                → 13 polygones pour validation point-sur-terre
│   └── css/                    → Styles
└── package.json                → Scripts npm (sync, validate, dev)
```

---

## 3. Pipeline de données

```
SITE PRÉHISTORIC DOMAIN (/api/globe, forme des anciens items Webflow)
    │
    ▼
┌──────────────────────────────────────────────────┐
│ sync-contents.js (orchestrateur)                 │
│ Détecte new/modifié/supprimé via lastUpdated     │
│ Filtre BTS (texts) : exclus de l'auto-activation │
│ Auto-active display-on-app pour items éligibles  │
│ Options: --all, --slugs=x,y, --dry-run           │
└──────────────┬───────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────┐
│ import-cms-items.js (géocodage moderne)          │
│ - Parse free-tags → continent + espèce           │
│ - PBDB API → coordonnées modernes des fossiles   │
│ - Anti-collision entre points proches            │
│ - manual-coordinate-fixes.json appliqué en       │
│   priorité                                       │
│ Output: geocoded-items.json                      │
└──────────────┬───────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────┐
│ reconstruct-paleogeography.js                    │
│ (utilise paleo-reconstruction.js)                │
│ - GPlates API MERDITH2021                        │
│ - Coordonnées modernes → coordonnées paléo       │
│ - 1 appel par item (période géologique)          │
│ - Validation point-sur-terre                     │
│ Output: content-data.json                        │
└──────────────────────────────────────────────────┘
```

### APIs externes

| API                           | Usage                            | Auth            | Limite       |
| ----------------------------- | -------------------------------- | --------------- | ------------ |
| **Site PD** (`/api/globe`)    | Lecture des contenus             | Aucune (public) | Cache 10 min |
| **PBDB** (paleobiodb.org)     | Localisation fossiles par espèce | Aucune          | Publique     |
| **GPlates** (gws.gplates.org) | Reconstruction paléogéographique | Aucune          | 410 Ma max   |

---

## 4. Format de données : content-data.json

```json
{
  "metadata": {
    "generated": "2025-01-31T...",
    "totalItems": 160,
    "model": "MERDITH2021"
  },
  "items": [
    {
      "id": "abc123",
      "name": "T-Rex Hunt",
      "slug": "t-rex-hunt",
      "category": "videos",
      "geologicalPeriod": "cretaceous",
      "createdOn": "2026-01-15T10:30:00.000Z",
      "lastUpdated": "2026-01-20T14:22:00.000Z",
      "modernLat": 51.9,
      "modernLon": -113.0,
      "paleoValidation": "on_land",
      "periods": {
        "100": { "lat": 48.2, "lon": -110.5, "validationStatus": "on_land" }
      },
      "youtubeUrl": "...",
      "preview": "...",
      "pageUrl": "...",
      "displayOnApp": true
    }
  ]
}
```

**Convention clés de période** : nombre en string (`"100"`), jamais `"100Ma"`.

**Dates de publication** :

- `createdOn` : date de création immuable de l'item dans le CMS (utilisée pour le filtre "Recent")
- `lastUpdated` : dernière modification de l'item (peut changer lors d'éditions mineures)
- Le filtre "Recent" affiche les 50 derniers items de la période géologique sélectionnée, triés par `createdOn` décroissant

---

### Grades, couche des apprentis et « Your globe » (2026-10-21)

Chaque item porte, depuis la source (`/api/globe` du site) :

- `grade` : `expert`, `confirmed`, `apprentice` ou rien (productions) ;
- `artistName` : le nom de l'artiste, affiché en haut à gauche de la fenêtre d'un contenu (plus bas sur une vidéo YouTube, sous son titre) (« Apprentice » pour une pièce d'élève, jamais son nom ; à défaut, il est lu dans la ligne de crédits « Created by … ») ;
- `owner` : la page d'artiste, ou l'empreinte du compte pour une pièce d'élève (jamais son identifiant ni son nom) ;
- `source` : `academy` pour une pièce de fin de cours de l'Academy (sa page est la page du cours), sinon `site`.

Ces champs sont recopiés par `academyFields` dans `sync-contents.js`. Dans le globe :

- sélecteur **Artists · Apprentices**, visible par tous : le globe commun (les œuvres des artistes, sans aucune pièce d'élève) ou le globe des apprentis (seulement les pièces d'élèves de l'Academy). Les deux ne se mêlent jamais ; le choix est `FiltersManager.globe` ;
- interrupteur **My creations** (colonne de gauche, membre connecté seulement) : seulement les contenus dont `owner` est une clé du membre, sur le globe choisi. Recent, Favorites et Experts only ont été retirés le 2026-10-21 (le cœur des favoris reste dans la fenêtre d'un contenu, les favoris restent en ocre).

Paramètres d'adresse, transmis par la page Time Travel du site :

- `?owners=<clé>,<clé>` : les clés du membre connecté (toujours envoyées par le site), qui font apparaître My creations ;
- `?mine=<clé>,<clé>` : ouvre directement sur My creations (« Your globe » de My space, fin d'un cours), et tourne le globe vers la plus récente ;
- `?layer=apprentices` : ouvre le globe des apprentis ; toute autre valeur, ou aucune, ouvre Artists ;
- `?period=<clé>` : ouvre sur cette période (même clé que `geologicalPeriod`, par exemple `cretaceous`).

Affichage des épingles (2026-10-21) : une seule épingle pour tous les types (les types se filtrent à gauche), sans nom au-dessus (retiré le 2026-10-21, trop chargé). Les groupes de Supercluster qui se touchent à l'écran (beaucoup de pièces d'un même cours, au même endroit) sont fusionnés en un seul (`updateClusters`). Arrivé par `?mine=`, « My creations » est allumé et une bulle animée l'annonce à côté de l'interrupteur (`showCreationsHint`) ; changer de globe repasse sur tout le monde.

La fenêtre d'un contenu prend la forme de son image (aucune image rognée) ; elle n'ouvre plus de page du site (lien « View more » et clic sur l'image retirés le 2026-10-21, ils menaient à l'ancienne page Webflow).

Un bouton « ? » à côté du sélecteur ouvre une courte explication des deux globes (Échap ou un clic ailleurs la ferme).

Pagination des points : quel que soit le globe, `paginatePins` (`src/app.js`) n'affiche qu'une page de points à la fois, 50 par défaut ou 100 au choix (`PIN_PAGE_SIZES`), triés du plus récent au plus ancien (`createdOn`), après tous les filtres. Une petite barre juste sous le sélecteur (choix 50 ou 100, flèches vers les plus récents et les plus anciens, « Latest 50 of 194 », puis « 51–100 of 194 ») passe d'un cran à l'autre ; elle reste affichée dans toutes les périodes (« No pieces here » s'il n'y a rien, flèches désactivées quand il n'y a pas plus ancien), et se cache seulement en Real Land, qui n'a pas de points. Le sélecteur et la pagination ont la même largeur (`--globe-controls-width` : 290px sur ordinateur, centrés sur le globe ; 224px sur téléphone, environ la moitié de l'écran, à 12px du bord gauche) et la même hauteur (42px), à 8px l'un de l'autre. Le « ? » flotte à 8px à droite du sélecteur, hors de cette largeur. Sur téléphone, la pagination affiche « 50 of 194 » au lieu de « Latest 50 of 194 ». La page revient à la première à chaque changement de période, de globe, de filtre ou de taille.

Sur téléphone (moins de 768px) : sélecteur et « ? » en bas à gauche du globe, la pagination juste en dessous (l'explication s'ouvre vers le haut) ; la barre latérale ne garde que ce qui se comprend par son icône (Our Continents, les trois types de contenu, l'aide). Real Land, la recherche et les interrupteurs Recent, Favorites et Experts only restent sur ordinateur.

Les interrupteurs des filtres (`.filter-item`) sont utilisables au clavier : `role="switch"`, `aria-checked`, Entrée ou Espace.

## 5. Pages frontend

### index.html — Globe 3D principal

- Application Three.js interactive avec sélecteur de périodes, filtres et popup de contenu
- Charge `content-data.json` pour afficher uniquement les items éligibles (avec coords paléo)
- Intégré en iframe dans prehistoricdomain.com

#### Design (2026-10-21)

Le globe suit le design system du site (`DESIGN.md` et `tooling/tailwind/pd-theme.css` du dépôt `pd-web-dinodeck`). Les jetons sont en tête de `assets/css/styles.css` (`--pd-fossil`, `--pd-teal`, `--pd-ash`, `--pd-sand`, `--pd-ochre`, `--pd-line`) :

- noir fossile pour les fonds, sable pour les titres, ocre pour les étiquettes (Quicksand SemiBold en capitales), Montserrat pour le reste ; Quicksand est hébergé avec le globe (`assets/fonts/`) ;
- boutons en pilule de la charte : contour blanc cendre à 40 %, texte en minuscules, voile de 10 % au survol ;
- le bleu-vert vif marque ce qui est actif ou choisi : période en cours, couche, globe Artists ou Apprentices, filtre, interrupteur allumé, focus clavier ;
- aide (« How does this work? ») réécrite le 2026-10-21 pour le globe actuel (deux globes, 50 par 50, filtres, vues), sans tiret cadratin ; le bouton son coupe et remet le son et affiche alors le haut-parleur barré ;
- tout ce qui flotte sur le globe (sélecteur, « ? », pagination, son et rotation, boutons de la fenêtre d'œuvre, liste d'un groupe de points) est en verre dépoli : `--glass-bg` et `--glass-blur` ;
- sur le globe : points blanc cendre, favoris en ocre ; groupes de points cerclés de bleu-vert (moins de 10), sable (moins de 50) ou ocre.

La page `browse.html` n'est pas reprise : le site a remplacé l'iframe vers elle par sa propre recherche (`/global-search`, 2026-10-20) ; elle est à retirer plus tard, avec accord.

### browse.html — Catalogue de recherche

- Page de recherche affichant TOUS les contenus CMS (éligibles + non-éligibles)
- Architecture :
  - **BrowseManager** : gestion du chargement, recherche et affichage
  - Chargement de `content-data.json` (tous les items fusionnés par sync-contents.js)
  - Recherche client-side multi-champs sur Enter/clic bouton
  - Grille responsive (4/3/2 colonnes)
- Fonctionnalités :
  - Interface centrée initialement avec animation vers le haut au premier search (500ms)
  - Recherche sur name, description, free-tags, credits-line, category, geological-period
  - Loader affiché pendant l'animation première recherche, puis 150ms pour recherches suivantes
  - Auto-détection de catégorie pour items "unknown" (basée sur youtubeId, galleryImage, backgroundImage)
  - Affichage de tous les résultats à la fois (pas de pagination)
  - Cards cliquables → ouverture de la page du contenu sur le site (noopener,noreferrer)
- Champs d'images Webflow utilisés :
  - `background` (slug Webflow, pas "background-image")
  - `gallery-low-quality-image` (slug Webflow, pas "gallery-image")
  - Thumbnails YouTube pour les vidéos (hqdefault.jpg avec fallback sddefault.jpg)

### placement.html — Outil de placement manuel

- Interface de correction manuelle des coordonnées
- Affiche le globe à la période de l'item avec position actuelle
- Permet de cliquer pour définir de nouvelles coordonnées
- Sauvegarde dans `manual-coordinate-fixes.json`

### Module cms-helpers.js

Module CommonJS partagé pour éviter la duplication de code entre scripts :

- `CATEGORY_IDS` : mapping des IDs Webflow vers noms de catégories (videos, images, 3D, texts)
- `getCategoryName(categoryId, item)` : conversion ID → nom de catégorie, avec fallback vidéo pour des sous-catégories comme "paleo docs"
- `getPreviewUrl(item, category)` : extraction de l'URL preview (YouTube thumbnail, background image, gallery image)

**Note** : L'ID de la catégorie "texts" (Behind The Scenes) est actuellement un placeholder (`PLACEHOLDER_TEXTS_ID`) et doit être remplacé par le vrai ID Webflow via MCP. Les contenus "paleo docs" sont traités comme des contenus vidéo dans l'UI, mais ils sont volontairement exclus du globe comme les contenus BTS.

---

## 6. Stratégie de géocodage

Cascade pour obtenir les coordonnées modernes d'un item :

1. **Manual fix** : `manual-coordinate-fixes.json` (priorité absolue)
2. **PBDB multi-espèces** : recherche toutes les espèces des `free-tags` (pas seulement la première), agrège les occurrences, filtre par bounding box du continent attendu, prend la **médiane** des coordonnées filtrées
3. **Ocean fallback** : si item marin et PBDB échoue → placement océan global
4. **Continent fallback** : si item terrestre et PBDB échoue → centre géographique du continent
5. **Anti-collision** : offset en spirale golden angle, rayon max 2°, sans limite de tentatives — préfère collision à mauvais placement géographique

### Format du fichier de corrections manuelles

`scripts/manual-coordinate-fixes.json` :

```json
{
  "mon-slug": {
    "lat": 45.0,
    "lon": -110.0,
    "reason": "PBDB place en Mongolie, devrait être Montana"
  }
}
```

---

## 6. Stratégie de synchronisation

### Incrémental (défaut)

```bash
node scripts/sync-contents.js
```

1. Récupère tous les contenus du site (`PD_CONTENT_SOURCE`, par défaut la préproduction ; la production après la bascule)
2. Garde l'identifiant déjà connu de chaque contenu (par slug) : favoris et corrections manuelles restent valables
3. Identifie : nouveaux, modifiés (**ligne de tags changée**), supprimés/désactivés
4. Rien n'est réécrit dans la source : un contenu en échec de géocodage est seulement signalé
5. Ne géocode + reconstruit que les items changés
6. Merge dans `content-data.json` existant
7. Coordonnées manuelles toujours réappliquées

### Ciblé

```bash
node scripts/sync-contents.js --slugs=item1,item2
```

### Simulation (dry-run)

```bash
node scripts/sync-contents.js --dry-run
```

### Rebuild complet

```bash
# 1. Backup d'abord
cp assets/data/content-data.json assets/data/content-data.backup.json

# 2. Rebuild
node scripts/sync-contents.js --all
```

Pour : changement de modèle, correction de bug dans les scripts, reset après modifications massives.

---

## 7. Data workflow opérationnel

### Ajouter un contenu

1. Le contenu s'ajoute dans le site (dépôt `pd-web-dinodeck`, skill `pd-ajout-contenu`)
2. Attendre jusqu'à 10 minutes (cache de `/api/globe`)
3. `node scripts/sync-contents.js`
4. `node scripts/validate-content-data.js`
5. Test visuel local : `npm run dev`

### Modifier un contenu

- Métadonnées : modifier dans le site → sync (les champs d'affichage sont rafraîchis à chaque sync)
- Position (tags) : modifier dans le site → sync (l'item est regéocodé) → corriger via `manual-coordinate-fixes.json` si besoin

### Supprimer un contenu

- Désactiver `displayOnApp` ou supprimer le contenu dans le site, puis sync

### Dépannage

| Symptôme            | Vérifier                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Pinpoint invisible  | `display-on-app`, `free-tags` non vide, item dans JSON, clé période correcte, coordonnées non null |
| Pinpoint mal placé  | free-tags (continent), modernLat/modernLon, ajouter fix manuel                                     |
| Script plante       | Connectivité APIs, source (`curl $PD_CONTENT_SOURCE`), test ciblé `--slugs=x --dry-run`            |
| Free-tags invalides | `node scripts/validate-free-tags.js --only-errors`                                                 |

---

## 8. Décisions techniques

| Décision            | Choix                         | Raison                                                                                |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| Modèle géologique   | MERDITH2021                   | Plus récent, couvre 0-1000 Ma                                                         |
| Format clé période  | `"100"` (string)              | Compatible parseInt du frontend                                                       |
| Mode "Real Land"    | Sans pinpoints                | Observation seule (décidé)                                                            |
| Sync par défaut     | Incrémental                   | Volume cible 1000-2000 items                                                          |
| Dépendances npm     | Aucune pour scripts           | Simplicité, Node 18+ natif suffisant                                                  |
| Bundler             | Vite (production only)        | File hashing pour cache-busting, minification, pas de bundler en dev                  |
| Clustering frontend | Supercluster (Mapbox) via CDN | Zones denses (ex: Crétacé Amérique du Nord) → trop de pins superposés sans clustering |

---

## 9. Tests

### Pipeline

```bash
node scripts/sync-contents.js --dry-run     # Simulation
node scripts/sync-contents.js --slugs=x     # Test ciblé
node scripts/validate-content-data.js       # Structure JSON
node scripts/validate-free-tags.js --only-errors  # Qualité free-tags
```

### Frontend

```bash
npm run dev  # → http://localhost:8000 (Vite dev server)
```

Checklist manuelle :

- **Globe (index.html)** :
  - Globe s'affiche (étoiles, atmosphère)
  - Pinpoints visibles pour la période sélectionnée
  - Zones denses → badges cluster avec counts colorés (bleu/orange/rose)
  - Zoom in → clusters se décomposent progressivement en pins individuels
  - Clic cluster petit ou zoom max → popup liste → clic item → popup contenu
  - Clic cluster grand → zoom in animé × 0.55
  - Changement de période → clusters recalculés correctement
  - Clic pinpoint → popup avec bon contenu
  - Video : player YouTube fonctionne
  - Image/3D : preview + lien "VIEW MORE"
  - Filtres masquent/affichent les types
  - "Real Land" sans pinpoints, retour "Our Continents" → pinpoints réapparaissent
- **Browse (browse.html)** :
  - Page centrée avec titre "Find Your Way" et input de recherche
  - Premier clic/Enter → animation vers le haut + affichage résultats
  - Recherche fonctionne (name, description, free-tags, etc.)
  - Cards affichent image, catégorie, titre
  - Hover card → scale + border
  - Clic card → ouvre page Webflow
  - Responsive : 4/3/2 colonnes selon viewport

### Idempotence du sync

```bash
# 1. Sync complet de référence
node scripts/sync-contents.js --all

# 2. Relancer sans changement → 0 items traités
node scripts/sync-contents.js

# 3. Modifier un item dans Webflow CMS, relancer → seul cet item traité
node scripts/sync-contents.js

# 4. Comparer avant/après : seul l'item modifié a changé
diff assets/data/content-data.backup.json assets/data/content-data.json
```

### Outil de placement manuel

```bash
npm run placement  # → http://localhost:8080/placement.html
```

- Le globe affiche la carte de la bonne période pour l'item courant
- Le pinpoint actuel est visible (vert = on_land, orange = à corriger, bleu = fixé)
- Clic sur le globe → les coordonnées lat/lon s'affichent
- "Save Fix" → les coordonnées sont écrites dans `manual-coordinate-fixes.json`
- Filtres : All, Needs Fix, Corrected, Already Fixed
- Navigation : boutons prev/next + flèches clavier
- Rebuild → le pinpoint est à la position manuelle

---

## 10. Référence rapide des commandes

| Commande                                    | Usage                         | Durée    |
| ------------------------------------------- | ----------------------------- | -------- |
| `node scripts/sync-contents.js`             | Sync incrémental (défaut)     | ~5-15s   |
| `node scripts/sync-contents.js --all`       | Rebuild complet               | variable |
| `node scripts/sync-contents.js --slugs=a,b` | Import ciblé                  | ~5s      |
| `node scripts/sync-contents.js --dry-run`   | Simulation                    | ~10s     |
| `node scripts/validate-content-data.js`     | Valider le JSON               | ~1s      |
| `node scripts/validate-free-tags.js`        | Qualité free-tags             | ~5s      |
| `node scripts/placement-server.js`          | Outil de placement interactif | -        |
| `python3 -m http.server 8000`               | Serveur local                 | -        |

---

## 11. Build et Déploiement

### Build de production

Le projet utilise **Vite** uniquement pour les builds de production (pas en développement).

```bash
# Synchroniser les données CMS
npm run sync:all

# Builder pour la production (minification + file hashing)
npm run build

# Preview du build local
npm run preview

# Tout en une commande
npm run deploy:prep
```

### Structure du build

Le dossier `dist/` contient :

- `index.html` avec références hashées automatiques
- `assets/js/[name].[hash].js` — JS minifié avec Terser
- `assets/css/[name].[hash].css` — CSS minifié
- `assets/data/content-data.json` — Données CMS
- `assets/geojson/` — Fichiers GeoJSON (13 périodes)
- `assets/sound/` — Audio ambiant

### Cache-busting

Les fichiers sont hashés automatiquement (`app.a1b2c3d4.js`), ce qui force le navigateur à télécharger les nouvelles versions sans intervention manuelle.

### Déploiement sur Cloudflare Pages

Voir [DEPLOY.md](./DEPLOY.md) :

1. `npm run sync` puis `npm run build`
2. `npm run deploy:pages -- prehistoric-domain-timetravel`, **uniquement après l'accord explicite de Benjamin**
3. Vérifier `https://prehistoric-domain-timetravel.pages.dev` et la page `/time-travel` du site

**Checklist de déploiement** :

- [ ] `npm run sync:all` exécuté avec succès
- [ ] `npm run build` sans erreur
- [ ] Dossier `dist/` généré
- [ ] Déploiement Cloudflare Pages fait (avec accord)
- [ ] Test fonctionnel (filtres, recherche, popup, favoris)
