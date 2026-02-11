# Tâches — Time Travel Globe

Légende : `[ ]` à faire · `[~]` en cours · `[x]` fait

---

## Phase 1 — Fixer le pipeline de données [DONE]

**Objectif** : `content-data.json` fiable, à jour, format stable.

### 1.1 Unifier le format des clés de période

- [x] Standardiser sur `"100"` (nombre en string, sans suffixe "Ma")
- [x] Nettoyer les items existants avec l'ancien format `"2Ma"` (déjà propre, seul backup affecté)
- [x] Vérifier que `paleo-reconstruction.js` produit toujours ce format

### 1.2 Corriger package.json

- [x] Mettre à jour les scripts npm (`sync` → `sync-contents.js`)
- [x] Supprimer les références à des scripts inexistants (`init`, `add`, `build`, `deploy`)
- [x] Mettre à jour `help.sh` en cohérence

### 1.3 Simplifier et fiabiliser le script de sync

- [x] Point d'entrée unique : `node scripts/sync-contents.js`
- [x] Modes : `--all` (rebuild), `--slugs=x,y` (ciblé), sans argument (incrémental)
- [x] Supprimer les lignes de debug et le délai de 5 secondes
- [x] Corriger le header du fichier (était "Import New Contents")

### 1.4 Nettoyer config.js

- [x] `config.js` supprimé (plus aucune référence dans le code)
- [x] `<script src="config.js">` retiré de `index.html`
- [x] Constructeur WebflowAPI nettoyé (supprimé références à API_CONFIG.webflow)

### 1.5 Nettoyage fichiers obsolètes

- [x] Supprimé : `config.js`, `15Ma.json`, `50Ma.json`, `100Ma.json`, `download_geojson.sh`, `reconstruct-output.log`, `geocoding-results.json`
- [x] Supprimé dossiers vides : `assets/landmass/`, `paleo-continents/`, `paleogeography/`, `real-coastlines/`, `textures/`, `images/`
- [x] Supprimé docs obsolètes : README, CHANGELOG, INDEX, QUICKSTART, TECHNICAL_STRATEGY, WORKFLOW, PROJECT-SPEC, DATA-WORKFLOW, scripts/README

---

## Phase 2 — Corriger le placement des pinpoints

**Objectif** : chaque pinpoint est positionné de manière crédible.

### 2.1 Améliorer le géocodage PBDB

- [x] Essayer PBDB pour chaque espèce des `free-tags` (pas seulement la première)
- [x] Filtrer les résultats par continent attendu
- [x] Prendre la médiane des coordonnées filtrées
- [x] Fallback : coordonnées par défaut du continent (centre géographique)

### 2.2 Implémenter le placement manuel interactif

- [x] Page `placement.html` réutilisant le globe existant
- [x] Afficher le globe à la période de l'item avec carte Merdith
- [x] Clic → coordonnées lat/lon (raycasting → `vector3ToLatLon`)
- [x] Bouton "Valider" → écriture dans `manual-coordinate-fixes.json`
- [x] Navigation item précédent/suivant + filtre "à corriger"
- [x] Serveur `placement-server.js` (HTTP natif, 0 dépendances)

### 2.3 Réduire l'anti-collision et valider terre/mer

- [x] Distance minimale réduite à 1.5° (au lieu de 2.5°)
- [x] Offset déterministe spirale golden-angle (même item = même position)
- [x] Validation `isPointOnLand` pour items terrestres (rejette positions océan)
- [x] Rayon max ~6°, 20 tentatives — préfère collision à mauvais placement
- [x] Géocodage species-first (itérer espèces dans l'ordre des free-tags)
- [x] Cleanup scripts : fusion reconstruct full+incremental, suppression test-performance.sh

### 2.4 Auto-validation des coordonnées paléo

- [x] `getNearestAvailableAge()` : mapper tout âge vers le GeoJSON dispo le plus proche
- [x] Fix `loadLandGeoJSON()` (utilisait `Math.round(age)` → fichier inexistant)
- [x] Validation `isPointOnLand` après reconstruction GPlates
- [x] Correction auto `findNearbyLand()` si point terrestre dans l'océan
- [x] Champ `validationStatus` propagé dans `content-data.json`
- [x] Résultat rebuild : 124 on_land, 35 corrected_to_land, 0 ocean, 1 unvalidated

### 2.5 Tester et valider les fixes

- [x] Lancer `npm run sync:all` pour re-générer content-data.json
- [x] Vérifier les items problématiques (0 terrestres dans l'océan)
- [x] Test visuel sur le globe
- [x] Test visuel de l'outil de placement (`npm run placement`)

---

## Phase 3 — Fiabiliser le sync incrémental [DONE]

**Objectif** : processus clair et idempotent pour garder le JSON synchronisé.

- [x] Mode incrémental fiable : détection new/modifié/supprimé via `lastUpdated`
  - Logique dans [sync-contents.js:122-145](scripts/sync-contents.js#L122-L145) ✅
  - Test : 0 items modifiés détectés sur 184 items existants
- [x] Merge correct dans `content-data.json` (par ID)
  - Logique dans [reconstruct-paleogeography.js:252-261](scripts/reconstruct-paleogeography.js#L252-L261) ✅
  - Algorithme : `oldItems.filter(i => !newIds.has(i.id))` + nouveaux items
- [x] Coordonnées manuelles toujours réappliquées
  - Priorité absolue dans [import-cms-items.js:506-522](scripts/import-cms-items.js#L506-L522) ✅
  - Test : item "claw-of-the-desert" garde ses coords manuelles (43.5, 100.5)
- [x] Idempotence : relancer sans changement CMS = aucune modification
  - Détection via comparaison dates `lastUpdated` ✅
  - Test dry-run : 0 changements détectés sur items existants

---

## Phase 4 — Moderniser le rendu du globe [DONE]

**Objectif** : passer d'un style vintage/parchemin à un rendu moderne photoréaliste, inspiré de l'image de référence, tout en gardant de bonnes performances.

### 4.1 Quick wins — Couleurs et textures modernes

- [x] Retirer l'effet parchemin (`applyParchmentTexture`)
- [x] Couleurs océan/terre réalistes (bleu profond #1a4d7a, terre verte #7a9b6f)
- [x] Améliorer la luminosité des continents (moins sombres)
- [x] Test visuel sur toutes les périodes

### 4.2 Améliorer l'éclairage et les matériaux

- [x] Remplacer `MeshPhongMaterial` par `MeshStandardMaterial` (PBR)
- [x] Ajouter `DirectionalLight` pour simuler le soleil (déjà existant, optimisé)
- [x] Paramètres roughness/metalness pour océan réaliste
- [x] Spécularité de l'eau (reflets via PBR)

### 4.3 Atmosphère moderne

- [x] Gradient bleu atmosphérique (3 layers progressifs)
- [x] Glow externe plus subtil et profond
- [x] Transparence progressive vers l'extérieur

### 4.4 Effets avancés [DONE]

- [x] Bump mapping léger pour relief des continents
- [x] Nuages subtils (texture overlay animée)
- [x] Shader personnalisé Fresnel pour atmosphère

---

## Phase 5 — Recherche libre de contenus [DONE]

**Objectif** : permettre la recherche multi-champs pour filtrer les contenus affichés sur le globe.

### 5.1 Ajouter freeTags et location au normalize

- [x] Ajouter `freeTags` et `location` dans `normalizeItem()` de `webflow-api.js`

### 5.2 Étendre FiltersManager pour la recherche

- [x] Ajouter propriétés `searchQuery` et `searchDebounceTimer`
- [x] Initialiser les événements du champ de recherche
- [x] Implémenter `handleSearchInput()` avec debouncing 400ms
- [x] Implémenter `setSearchQuery()`, `getSearchQuery()`, `clearSearch()`
- [x] Mettre à jour `reset()` pour clear la recherche

### 5.3 Logique de recherche dans AppController

- [x] Ajouter méthode `matchesSearch()` avec logique AND multi-termes
- [x] Intégrer le filtre recherche dans `updatePoints()`
- [x] Recherche case-insensitive sur title, freeTags, artist, location, description

### 5.4 UI du champ de recherche

- [x] Ajouter HTML (input + icône loupe + bouton clear) entre Layer Selector et Content Filters
- [x] Styles CSS cohérents avec le thème dark
- [x] Bouton clear visible uniquement si texte présent

### 5.5 Cross-platform scrollbar

- [x] Masquer la scrollbar de la sidebar sur tous les OS (Firefox, Chrome, IE/Edge)

---

## Phase 6 — Optimisation sidebar [DONE]

**Objectif** : gagner de l'espace pour le globe en réduisant les éléments de la sidebar.

- [x] Réduire largeur sidebar : 200px → 180px (−10%)
- [x] Réduire padding sidebar : 24px 16px → 20px 14px
- [x] Réduire font-sizes : titres (11px→10px), filtres (14px→12px), layers (0.9rem→0.8rem)
- [x] Réduire icônes : filtres (20px→18px), recherche (16px→14px), info (20px→18px)
- [x] Réduire espacements : margins et paddings réduits de 15-20%
- [x] Ajuster globe-container : left 200px → 180px
- [x] Ajuster media query responsive : 180px → 160px

---

## Phase 7 — Nettoyage code [DONE]

**Objectif** : nettoyer le code restant.

- [x] Supprimer le mock data de `webflow-api.js` (méthode getMockData() supprimée)
- [x] Gestion d'erreur si `content-data.json` absent (message clair + instructions)
- [x] Touch events pour mobile (pinch to zoom, swipe to rotate)
