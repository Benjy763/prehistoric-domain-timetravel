# Architecture — Time Travel Globe

## 1. Stack technique

| Composant | Technologie |
|-----------|------------|
| Globe 3D | Three.js r128 (vanilla en dev) |
| Frontend | HTML/CSS/JS vanilla, pas de framework |
| Build | Vite (production uniquement, file hashing pour cache-busting) |
| CMS | Webflow API v2 |
| Scripts | Node.js natif (0 dépendances npm, fetch natif Node 18+) |
| Géocodage | PBDB API (paleobiodb.org) |
| Reconstruction | GPlates API MERDITH2021 (gws.gplates.org, limite 410 Ma) |
| Hébergement | Statique (Hostinger) |
| Intégration | iframe dans Webflow (prehistoricdomain.com) |

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
│   ├── test-webflow-token.js    → Test connexion Webflow
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
WEBFLOW CMS
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

| API | Usage | Auth | Limite |
|-----|-------|------|--------|
| **Webflow API v2** | Lecture du CMS | Token (env var) | Rate limited |
| **PBDB** (paleobiodb.org) | Localisation fossiles par espèce | Aucune | Publique |
| **GPlates** (gws.gplates.org) | Reconstruction paléogéographique | Aucune | 410 Ma max |

---

## 4. Format de données : content-data.json

```json
{
  "metadata": {
    "generated": "2025-01-31T...",
    "totalItems": 160,
    "model": "MERDITH2021"
  },
  "items": [{
    "id": "abc123",
    "name": "T-Rex Hunt",
    "slug": "t-rex-hunt",
    "category": "videos",
    "geologicalPeriod": "cretaceous",
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
  }]
}
```

**Convention clés de période** : nombre en string (`"100"`), jamais `"100Ma"`.

---

## 5. Pages frontend

### index.html — Globe 3D principal
- Application Three.js interactive avec sélecteur de périodes, filtres et popup de contenu
- Charge `content-data.json` pour afficher uniquement les items éligibles (avec coords paléo)
- Intégré en iframe dans prehistoricdomain.com

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
  - Cards cliquables → ouverture de la page Webflow du content (noopener,noreferrer)
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
- `getCategoryName(categoryId)` : conversion ID → nom de catégorie
- `getPreviewUrl(item, category)` : extraction de l'URL preview (YouTube thumbnail, background image, gallery image)

**Note** : L'ID de la catégorie "texts" (Behind The Scenes) est actuellement un placeholder (`PLACEHOLDER_TEXTS_ID`) et doit être remplacé par le vrai ID Webflow via MCP.

---

## 6. Stratégie de géocodage

Cascade pour obtenir les coordonnées modernes d'un item :

1. **Manual fix** : `manual-coordinate-fixes.json` (priorité absolue)
2. **PBDB multi-espèces** : recherche toutes les espèces des `free-tags` (pas seulement la première), agrège les occurrences, filtre par bounding box du continent attendu, prend la **médiane** des coordonnées filtrées
3. **Ocean fallback** : si item marin et PBDB échoue → placement océan global
4. **Continent fallback** : si item terrestre et PBDB échoue → centre géographique du continent
5. **Anti-collision** : offset en spirale (golden angle) si deux points sont trop proches

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
1. Récupère tous les items CMS (Webflow API, paginé)
2. Compare `lastUpdated` CMS vs `metadata.generated` local
3. Identifie : nouveaux (éligibles), modifiés, supprimés/désactivés
4. Auto-active `display-on-app` pour les nouveaux items éligibles (pas BTS)
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
1. Via `/add-content` (Claude Code) : crée le draft bilingue EN+FR dans Webflow
2. Publier le draft dans Webflow (EN et FR séparément)
3. `node scripts/sync-contents.js` (le sync auto-active `display-on-app` pour les items éligibles)
4. `node scripts/validate-content-data.js`
5. Test visuel local : `npm run dev`

### Modifier un contenu
- Métadonnées : modifier dans Webflow → sync ciblé
- Position (free-tags) : modifier → rebuild complet recommandé → corriger via `manual-coordinate-fixes.json` si besoin

### Supprimer un contenu
- Désactiver `display-on-app` dans Webflow + sync
- Ou supprimer dans Webflow + rebuild

### Dépannage

| Symptôme | Vérifier |
|----------|----------|
| Pinpoint invisible | `display-on-app`, `free-tags` non vide, item dans JSON, clé période correcte, coordonnées non null |
| Pinpoint mal placé | free-tags (continent), modernLat/modernLon, ajouter fix manuel |
| Script plante | Connectivité APIs, token Webflow (`test-webflow-token.js`), test ciblé `--slugs=x --dry-run` |
| Free-tags invalides | `node scripts/validate-free-tags.js --only-errors` |

---

## 8. Décisions techniques

| Décision | Choix | Raison |
|----------|-------|--------|
| Modèle géologique | MERDITH2021 | Plus récent, couvre 0-1000 Ma |
| Format clé période | `"100"` (string) | Compatible parseInt du frontend |
| Mode "Real Land" | Sans pinpoints | Observation seule (décidé) |
| Sync par défaut | Incrémental | Volume cible 1000-2000 items |
| Dépendances npm | Aucune pour scripts | Simplicité, Node 18+ natif suffisant |
| Bundler | Vite (production only) | File hashing pour cache-busting, minification, pas de bundler en dev |

---

## 9. Tests

### Pipeline
```bash
node scripts/test-webflow-token.js          # Token Webflow
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
  - Changement de période → pinpoints se repositionnent
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

| Commande | Usage | Durée |
|----------|-------|-------|
| `node scripts/sync-contents.js` | Sync incrémental (défaut) | ~5-15s |
| `node scripts/sync-contents.js --all` | Rebuild complet | variable |
| `node scripts/sync-contents.js --slugs=a,b` | Import ciblé | ~5s |
| `node scripts/sync-contents.js --dry-run` | Simulation | ~10s |
| `node scripts/validate-content-data.js` | Valider le JSON | ~1s |
| `node scripts/validate-free-tags.js` | Qualité free-tags | ~5s |
| `node scripts/test-webflow-token.js` | Test token Webflow | ~2s |
| `node scripts/placement-server.js` | Outil de placement interactif | - |
| `python3 -m http.server 8000` | Serveur local | - |

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

### Déploiement sur Hostinger

Voir [DEPLOY.md](./DEPLOY.md) pour le guide complet :
1. Préparer le build : `npm run deploy:prep`
2. Uploader le contenu de `dist/` vers `public_html/` via FTP/SFTP
3. Vérifier l'URL en production

**Checklist de déploiement** :
- [ ] `npm run sync:all` exécuté avec succès
- [ ] `npm run build` sans erreur
- [ ] Dossier `dist/` généré
- [ ] Upload complet sur Hostinger
- [ ] Test fonctionnel (filtres, recherche, popup, favoris)
