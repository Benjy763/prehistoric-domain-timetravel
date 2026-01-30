# 🌍 PREHISTORIC DOMAIN - Stratégie Technique Finale

**Version :** 1.0
**Date :** 30 janvier 2026
**Auteur :** Prehistoric Domain Team

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Modèles géologiques](#modèles-géologiques)
3. [Affichage des continents](#affichage-des-continents)
4. [Repositionnement des points](#repositionnement-des-points)
5. [Sources de données](#sources-de-données)
6. [Architecture technique](#architecture-technique)
7. [Workflow de mise à jour](#workflow-de-mise-à-jour)

---

## 🌐 VUE D'ENSEMBLE

### Objectif

Afficher un globe 3D interactif montrant l'évolution de la Terre sur 500 millions d'années avec deux vues complémentaires :

- **Our Continents** : Plaques tectoniques et masses continentales
- **Real Land** : Terres émergées (paléogéographie)

### Périodes supportées

```
Today (0 Ma) → Cambrian (500 Ma)
13 périodes au total : 0, 2, 15, 50, 100, 160, 220, 280, 320, 380, 410, 450, 500 Ma
```

---

## 🧭 MODÈLES GÉOLOGIQUES

### Modèle Principal : Merdith et al. 2021

**Utilisé pour :**

- Affichage des continents (layer "Our Continents")
- Repositionnement des **nouveaux** points fossiles (à partir de janvier 2026)

**Caractéristiques :**

- Reconstruction globale des plaques tectoniques
- Couverture : 0-1 000 Ma (API limitée à 410 Ma)
- Précision : Haute résolution avec 34 snapshots temporels
- Source : GPlates Web Service + fichiers locaux

**Fichiers locaux disponibles :**

```
assets/merdith2021-coastlines/
  2Ma.json, 6Ma.json, 14Ma.json, 22Ma.json, 33Ma.json, 45Ma.json,
  53Ma.json, 76Ma.json, 90Ma.json, 100Ma.json, 105Ma.json, 126Ma.json,
  140Ma.json, 152Ma.json, 160Ma.json, 169Ma.json, 195Ma.json, 218Ma.json,
  220Ma.json, 232Ma.json, 255Ma.json, 277Ma.json, 280Ma.json, 287Ma.json,
  302Ma.json, 320Ma.json, 328Ma.json, 348Ma.json, 368Ma.json, 380Ma.json,
  396Ma.json, 410Ma.json, 450Ma.json, 500Ma.json
```

### Modèle Secondaire : Cao et al. 2017

**Utilisé pour :**

- Affichage des terres émergées (layer "Real Land")

**Caractéristiques :**

- Paléogéographie détaillée (terres vs océans)
- Couverture : 0-400 Ma
- Précision : Reconstruction paléo-environnementale
- Source : GeoTIFF convertis en GeoJSON

### Modèle Legacy : Zahirovic et al. 2022

**Utilisé pour :**

- Points fossiles générés **avant** janvier 2026

**Statut :**

- Compatible avec Merdith 2021 (différence < 3° pour la plupart des points)
- Ne pas régénérer les points existants (temps de calcul prohibitif)
- Nouveaux points utilisent exclusivement Merdith 2021

---

## 🗺️ AFFICHAGE DES CONTINENTS

### Layer 1 : Our Continents (Merdith 2021)

**Source de données :**

```javascript
// Fichiers locaux (préférés)
assets/merdith2021-coastlines/{time}Ma.json

// Fallback API (si fichier manquant)
https://gws.gplates.org/reconstruct/coastlines/?time={time}&model=MERDITH2021
```

**Algorithme de matching temporel :**

```javascript
// Si temps exact non disponible, utiliser le plus proche
availableTimes = [2, 6, 14, 22, 33, 45, 53, 76, 90, 100, ...]
requestedTime = 15  // Ma
closestTime = findClosest(requestedTime, availableTimes)  // → 14 Ma

console.log("Requested 15 Ma, using closest available: 14 Ma")
```

**Rendu :**

- Couleur : Bleu clair (`#4A90E2`)
- Opacité : 0.3
- Style : Lignes continues (coastlines)

### Layer 2 : Real Land (Cao 2017)

**Source de données :**

```javascript
assets/cao-paleogeography/{time}Ma-land.json
```

**Extraction :**

- Pixels jaunes (255,255,0) = Terres émergées
- Pixels oranges (255,165,0) = Montagnes
- Conversion GeoTIFF → GeoJSON via OpenCV

**Rendu :**

- Couleur : Vert forêt (`#2E7D32`)
- Opacité : 0.5
- Style : Polygones remplis

**Auto-disable :**

```javascript
// Désactivé automatiquement pour :
-time === 0(Today) - time >= 450(Ordovician, Cambrian);

// Raison : données Cao limitées à 2-400 Ma
```

---

## 📍 REPOSITIONNEMENT DES POINTS

### Workflow Complet

```
┌─────────────────────────────────────────────────────────┐
│ 1. COORDONNÉES MODERNES (GPS actuel)                    │
│    Définies dans COORDINATES_RULES.md                   │
│    Exemple : Montana, USA → 47.5°N, 105.5°W            │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. HARMONISATION ANTI-COLLISION                         │
│    Distance minimale : 2.5° (~275 km)                   │
│    Algorithme en spirale si collision détectée          │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. RECONSTRUCTION PALÉOGÉOGRAPHIQUE                     │
│    API GPlates : Merdith 2021 (nouveaux points)        │
│    Format : lon,lat,time → ancient_lon,ancient_lat     │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. STOCKAGE STATIQUE                                    │
│    Fichier : assets/data/content-data.json              │
│    13 périodes × N points pré-calculés                  │
└─────────────────────────────────────────────────────────┘
```

### Script de génération

**Fichier :** `scripts/reconstruct-paleogeography.js`

```javascript
// Configuration actuelle (janvier 2026)
const GPLATES_API = "https://gws.gplates.org/reconstruct/reconstruct_points/";
const MODEL = "MERDITH2021"; // ← Nouveau modèle

// Appel API
const url = `${GPLATES_API}?points=${lon},${lat}&time=${time}&model=${MODEL}`;

// Note : Limite API = 410 Ma maximum
// Cambrian (500 Ma) et Ordovician (450 Ma) utilisent 410 Ma
```

**Exécution :**

```bash
cd scripts
node reconstruct-paleogeography.js

# Output : assets/data/content-data.json
# Temps : ~5-10 minutes pour ~200 points
```

---

## 📦 SOURCES DE DONNÉES

### Fichiers locaux (Production)

```
assets/
├── merdith2021-coastlines/        # 34 fichiers GeoJSON
│   ├── 2Ma.json                   # 2-500 Ma (snapshots Merdith)
│   ├── 14Ma.json
│   └── ...
│
├── cao-paleogeography/            # 23 fichiers GeoJSON
│   ├── 6Ma-land.json              # 6-400 Ma (terres émergées)
│   └── ...
│
└── data/
    └── content-data.json  # Points + métadonnées CMS pré-calculés
```

### APIs externes (Fallback)

```
GPlates Web Service
├── Coastlines : https://gws.gplates.org/reconstruct/coastlines/
│   └── Params : ?time={Ma}&model={MERDITH2021|ZAHIROVIC2022}
│
└── Point reconstruction : https://gws.gplates.org/reconstruct/reconstruct_points/
    └── Params : ?points={lon},{lat}&time={Ma}&model={model}
```

### Données brutes (Archives)

```
data/
├── Cao_etal_2017_Biogeosciences/  # GeoTIFF source
└── PresentDay_Palegeog_Matthews2016/  # Shapefiles (non utilisé)
```

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Chargement des données

```javascript
// src/globe.js - Méthode optimisée

async loadContinentsOnly(time) {
  // 1. Chercher fichier local
  const availableTimes = [2, 6, 14, 22, 33, ...]
  const closestTime = findClosest(time, availableTimes)

  // 2. Tenter chargement local
  const localPath = `assets/merdith2021-coastlines/${closestTime}Ma.json`
  const geojson = await this.loadGeoJSON(localPath)

  if (geojson) {
    this.drawContinents(geojson)
    return
  }

  // 3. Fallback API
  const apiUrl = `https://gws.gplates.org/reconstruct/coastlines/?time=${time}&model=MERDITH2021`
  const apiData = await fetch(apiUrl).then(r => r.json())
  this.drawContinents(apiData)
}
```

### Cache Strategy

```javascript
// Cache hiérarchique
1. Fichiers locaux (toujours)
2. Cache mémoire (session)
3. API externe (fallback)

// Invalidation : jamais (données statiques)
```

### Performance

```
Continents Merdith 2021 :
- Taille moyenne : 120 KB/fichier
- Temps chargement : < 100ms (local)
- Polygones : ~200-500 features/période

Terres Cao 2017 :
- Taille moyenne : 80 KB/fichier
- Temps chargement : < 50ms (local)
- Polygones : ~50-150 features/période

Points fossiles :
- Fichier unique : ~180 KB
- Chargement initial : < 200ms
- Accès période : instantané (objet indexé)
```

---

## 🔄 WORKFLOW DE MISE À JOUR

### Ajouter un nouveau point fossile

```bash
# 1. Ajouter les coordonnées modernes dans CMS Webflow
#    Ou éditer COORDINATES_RULES.md

# 2. Régénérer le fichier de géocodage
cd scripts
node auto-geocode-contents.js

# 3. Reconstruire les coordonnées historiques
node reconstruct-paleogeography.js

# 4. Vérifier le résultat
cat ../assets/data/content-data.json | jq '.items[-1]'

# 5. Commit + deploy
git add assets/data/content-data.json
git commit -m "feat: add new fossil point"
git push
```

### Ajouter une nouvelle période temporelle

```bash
# 1. Télécharger coastlines Merdith 2021
cd scripts
python3 fetch-merdith2021.py

# 2. Ajouter la période dans config.js
# PERIODS.push({ time: 350, name: 'new-period' })

# 3. Régénérer tous les points
export WEBFLOW_TOKEN="your_token_here"
node scripts/reconstruct-paleogeography.js

# 4. Deploy
```

### Régénérer tout depuis zéro (rare)

```bash
# ⚠️  Temps : ~1 heure pour 200 points

# 1. Nettoyer
rm assets/data/content-data.json

# 2. Reconstruction depuis Webflow (inclut géocodage + reconstruction)
export WEBFLOW_TOKEN="your_token_here"
node scripts/reconstruct-paleogeography.js

# 3. Validation
# Vérifier manuellement quelques points sur le globe
```

---

## 📊 STATISTIQUES ACTUELLES

### Données générées

```
Points fossiles : ~200 items
Périodes : 13
Reconstructions : ~2600 coordonnées pré-calculées
Fichiers coastlines : 34 (Merdith) + 23 (Cao)
Taille totale : ~5.2 MB
```

### Modèles utilisés

```
Merdith 2021 :
- Continents (layer Our Continents) : 100%
- Nouveaux points (2026+) : 100%

Cao 2017 :
- Terres émergées (layer Real Land) : 100%

Zahirovic 2022 :
- Points legacy (pré-2026) : ~95%
- Compatible avec Merdith : Oui (diff < 3°)
```

---

## 🔮 ÉVOLUTIONS FUTURES

### Court terme

- [ ] Ajouter snapshots Merdith à 180 Ma, 250 Ma (gaps actuels)
- [ ] Optimiser taille GeoJSON (simplification polygones)
- [ ] Ajouter indicateurs de confiance par période

### Moyen terme

- [ ] Migration complète vers Merdith 2021 (régénération tous points)
- [ ] Ajout du modèle SETON2012 pour comparaison
- [ ] Support périodes > 410 Ma (Cambrian early)

### Long terme

- [ ] API backend custom (cache + optimisations)
- [ ] Support incertitudes de reconstruction
- [ ] Visualisation 4D (animation temporelle fluide)

---

## 🛠️ SCRIPTS UTILITAIRES

### Scripts en production

```bash
scripts/
├── reconstruct-paleogeography.js    # ✅ PRINCIPAL - Génère coordonnées historiques depuis Webflow
├── fetch-merdith2021.py             # ✅ GARDER - Télécharge coastlines Merdith
├── test-webflow-token.js            # ✅ GARDER - Validation token API
└── auto-geocode-contents.js         # ⚙️  OPTIONNEL - Debug géocodage uniquement
```

**Usage principal :**

```bash
# 1. Reconstruire TOUTES les coordonnées historiques (récupère depuis Webflow)
export WEBFLOW_TOKEN="your_token_here"
node scripts/reconstruct-paleogeography.js
# → Génère assets/data/content-data.json

# 2. Télécharger nouvelles coastlines Merdith (si nouvelles périodes)
python3 scripts/fetch-merdith2021.py

# 3. Tester token Webflow avant utilisation
node scripts/test-webflow-token.js
```

**Usage optionnel (debugging) :**

```bash
# Tester le géocodage des coordonnées modernes uniquement
# (utile pour vérifier la logique anti-collision)
node scripts/auto-geocode-contents.js
# → Affiche les coordonnées modernes sans appeler l'API GPlates
```

**⚠️ Important :**

- Le script `reconstruct-paleogeography.js` appelle **directement l'API Webflow**
- Plus besoin de générer `geocoding-results.json` manuellement
- Le fichier `geocoding-results.json` à la racine peut être **supprimé** (obsolète)

### Scripts obsolètes (à supprimer)

```bash
# ❌ SUPPRIMER - Modèle non utilisé (MATTHEWS2016)
scripts/fetch-continents-muller2022.py
scripts/convert-matthews2016-to-geojson.py

# ❌ SUPPRIMER - Conversion Cao déjà effectuée
scripts/convert-cao-to-geojson.py

# Raison :
# - Fichiers GeoJSON déjà générés et stockés dans assets/
# - Ne sert plus à rien de les régénérer
# - Scripts de conversion Python inutiles en production
```

---

## 📚 RÉFÉRENCES

### Publications scientifiques

**Merdith et al. 2021**
_Extending full-plate tectonic models into deep time: Linking the Neoproterozoic and the Phanerozoic_
Earth-Science Reviews, Vol. 214, 103477
https://doi.org/10.1016/j.earscirev.2020.103477

**Cao et al. 2017**
_Improving global paleogeography since the late Paleozoic using paleobiology_
Biogeosciences, Vol. 14, 5425-5439
https://doi.org/10.5194/bg-14-5425-2017

**Zahirovic et al. 2022**
_The Cretaceous and Cenozoic tectonic evolution of Southeast Asia_
Solid Earth, Vol. 13, 517-544
https://doi.org/10.5194/se-13-517-2022

### APIs et outils

**GPlates Web Service**
https://gws.gplates.org
Documentation : https://gwsdoc.gplates.org

**Three.js**
https://threejs.org (r128)

---

## ✅ VALIDATION

### Tests de cohérence

```javascript
// 1. Vérifier que points et continents matchent (Merdith 2021)
// → Nouveaux points doivent être SUR les continents affichés

// 2. Vérifier distance minimale (2.5°)
// → Anti-collision respecté

// 3. Vérifier périodes limites
// → 0 Ma : Real Land désactivé
// → 450 Ma+ : Real Land désactivé, fallback 410 Ma API
```

### Checklist déploiement

- [x] Fichiers GeoJSON présents dans `assets/`
- [x] `content-data.json` à jour
- [x] Modèle Merdith 2021 configuré dans globe.js
- [x] Script de reconstruction utilise MERDITH2021
- [x] Documentation COORDINATES_RULES.md synchronisée
- [x] Ce document de stratégie créé

---

**Fin du document**
_Version 1.0 - Janvier 2026_
