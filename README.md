# 🌍 Prehistoric Domain - Time Travel Globe

**Globe 3D interactif** montrant l'évolution de la Terre sur 500 millions d'années avec reconstruction paléogéographique automatique des contenus.

---

## 📖 Documentation

| Document                                             | Description                          |
| ---------------------------------------------------- | ------------------------------------ |
| **[INDEX.md](./INDEX.md)**                           | 🗂️ Navigation complète documentation |
| **[QUICKSTART.md](./QUICKSTART.md)**                 | ⚡ Démarrage rapide (5 min)          |
| **[scripts/README.md](./scripts/README.md)**         | 📦 Architecture scripts + commandes  |
| **[TECHNICAL_STRATEGY.md](./TECHNICAL_STRATEGY.md)** | 🔬 Modèles géologiques + performance |

---

## ⚡ Commandes Essentielles

### Gestion des données

```bash
# Ajouter 1 item (rapide ~5 sec)
node scripts/add-content-by-slug.js <slug>

# Synchroniser tous changements (auto-détection)
node scripts/import-new-contents.js

# Init complète (première fois)
node scripts/import-new-contents.js --all
```

### Développement

```bash
# Serveur local
python3 -m http.server 8000
# → http://localhost:8000
```

---

## 🎯 Fonctionnalités

- 🌐 Globe 3D interactif (Three.js)
- ⏱️ 13 périodes géologiques (500 Ma → aujourd'hui)
- 🗺️ Reconstruction paléogéographique (API GPlates MERDITH2021)
- 🔍 Filtres par type (Images, Vidéos, 3D)
- 📍 Géocodage automatique depuis free-tags Webflow
- 🌊 Gestion items océaniques (positions prédéfinies)
- ⚡ Anti-collision spatiale automatique

## 🛠 Commandes NPM disponibles

### Pipeline automatique

```bash
npm run sync          # Synchroniser display-on-app
npm run geocode       # Générer coordonnées modernes
npm run reconstruct   # Calculer positions paléo
npm run update-contents  # Pipeline complet (sync + geocode + reconstruct)
```

### Gestion des contenus

```bash
npm run add <slug>    # Ajouter un item par slug
npm run import        # Importer nouveaux items
npm run import:all    # Réimporter tous les items
npm run import:dry    # Simulation sans modifications
```

### Validation et recherche

```bash
npm run validate           # Valider tous les free-tags
npm run validate:errors    # Afficher uniquement les erreurs
npm run validate:export    # Exporter rapport en JSON
npm run find-formation <espèce>  # Rechercher une formation
```

### Développement

```bash
npm run dev          # Serveur local (port 8000)
```

## 📋 Règles de Géocodage

### Format free-tags (Webflow)

```
Continent, Période, Espèce1, Espèce2
```

**Continents** : `North America`, `South America`, `Asia`, `Europe`, `Africa`, `Australia`, `India`
**Sans continent** → `location = "global oceans"` (item océanique)

### Hiérarchie de placement

1. **Formations célèbres** → Coordonnées précises (haute confiance)
   - T-Rex → Hell Creek Formation, Montana (47.5°, -105.5°)
   - Velociraptor → Nemegt Formation, Mongolia (43.5°, 104.0°)

2. **Placement continental** → Zone aléatoire sur continent (confiance moyenne)
   - Anti-collision: distance min 5°
   - 50 tentatives max

3. **Fallback** → Zones prédéfinies par continent (rotation)

### Items océaniques

**Détection** : Aucun continent dans free-tags → `global oceans`

**Placement** : Positions prédéfinies par période (Panthalassa, Tethys, etc.)

- Rotation automatique pour éviter collisions
- Exemple 500 Ma: Panthalassa (-30°, 120°), Iapetus (0°, 0°)

---

## ⚡ Performance & Optimisations

### Reconstruction paléogéographique

**1 période par item** (vs 13 périodes dans ancien système)

- Item Crétacé (66 Ma) → reconstruit à 100 Ma uniquement
- **Économie** : 92% d'appels API (1 vs 13 par item)
- **Durée** : ~5 sec/item (vs ~65 sec avant)

### Mode incrémental automatique

Détection changements par comparaison `lastUpdated` (Webflow) vs `metadata.generated` (local)

**Exemple** : 5 items modifiés sur 200

- Reconstruction : 5 API calls (au lieu de 200)
- Durée : ~30 sec (au lieu de ~15 min)
- **Économie** : 97.5%

### Anti-collision spatiale

- Distance min : 5° entre points continentaux
- Items océaniques : rotation positions prédéfinies
- Fallback : offset aléatoire ±5° si saturation

---

## 🏗️ Architecture

### Flux de données

```
Webflow CMS (collection "contents")
    ↓ (free-tags: "Continent, Période, Espèce")
auto-geocode-contents.js (coordonnées modernes)
    ↓
paleo-reconstruction.js (module centralisé)
    ↓ (API GPlates MERDITH2021)
content-data.json (positions paléogéographiques)
    ↓
app.js → Globe 3D (Three.js)
```

### Fichiers clés

```
scripts/
├── paleo-reconstruction.js    # Module central (logique reconstruction)
├── add-content-by-slug.js     # Ajouter 1 item
├── import-new-contents.js     # Sync auto (nouveaux/modifiés)
└── auto-geocode-contents.js   # Géocodage moderne

assets/data/
├── content-data.json          # Données finales (utilisées par globe)
└── famous-formations.json     # Formations célèbres (éditable)

src/
├── app.js        # Logique principale + gestion périodes
├── globe.js      # Rendu Three.js
├── filters.js    # Filtres par type
└── popup.js      # Affichage détails item
```

---

## 🔧 Développement

### Tests

```bash
# Vérifier syntaxe
node --check scripts/*.js

# Valider données
node scripts/validate-content-data.js

# Tester module central
node -e "const {buildDerivedFields} = require('./scripts/paleo-reconstruction'); console.log(buildDerivedFields({youtubeId:'TEST', category:'videos', slug:'test'}));"
```

### Ajouter une formation célèbre

```bash
# 1. Rechercher
node scripts/find-formation.js "Spinosaurus"

# 2. Éditer assets/data/famous-formations.json
# 3. Re-géocoder items concernés
node scripts/add-content-by-slug.js <slug>
```

---

## 📄 Licence

Prehistoric Domain © 2026

---

**Dernière mise à jour** : 31 janvier 2026
