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

## Phase 3 — Fiabiliser le sync incrémental

**Objectif** : processus clair et idempotent pour garder le JSON synchronisé.

- [ ] Mode incrémental fiable : détection new/modifié/supprimé via `lastUpdated`
- [ ] Merge correct dans `content-data.json` (par ID)
- [ ] Coordonnées manuelles toujours réappliquées
- [ ] Idempotence : relancer sans changement CMS = aucune modification

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

## Phase 5 — Nettoyage code

**Objectif** : nettoyer le code restant.

- [ ] Supprimer le mock data de `webflow-api.js`
- [ ] Gestion d'erreur si `content-data.json` absent
- [x] Touch events pour mobile (pinch to zoom, swipe to rotate)
