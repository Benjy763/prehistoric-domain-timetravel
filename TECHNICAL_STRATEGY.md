# 🔬 Stratégie Technique

**Modèles géologiques et optimisations de performance.**

---

## 🌍 Modèles Paléog\u00e9ographiques

### Merdith et al. 2021 (PRINCIPAL)

**Usage** :

- Affichage continents (layer "Our Continents")
- Reconstruction points fossiles (API GPlates)

**Caractéristiques** :

- Couverture : 0-1000 Ma (API limitée à 410 Ma)
- 34 snapshots temporels
- Modèle : `MERDITH2021`
- Endpoint : `https://gws.gplates.org/reconstruct/reconstruct_points/`

**Fichiers locaux** :

```
assets/merdith2021-coastlines/
  0Ma.json, 2Ma.json, 100Ma.json, 160Ma.json, ..., 500Ma.json
  (34 fichiers GeoJSON)
```

### Cao et al. 2017 (SECONDAIRE)

**Usage** : Affichage terres émergées (layer "Real Land")

**Caractéristiques** :

- Paléogéographie détaillée (terres vs océans)
- Couverture : 0-400 Ma
- 23 snapshots

**Fichiers** :

```
assets/cao-paleogeography/
  6Ma-land.json, 14Ma-land.json, ..., 500Ma-land.json
```

---

## ⚡ Optimisations de Performance

### 1. Reconstruction paléogéographique

**Ancien système** : 13 périodes × N items = 2600 API calls

**Système actuel** : 1 période par item (période géologique)

**Exemple** :

- Item T-Rex (`geological-period: "cretaceous"`, âge 66 Ma)
- Reconstruit uniquement à **100 Ma** (période Crétacé du globe)
- 1 API call au lieu de 13

**Économie** : **92% d'appels API**

### 2. Mode incrémental automatique

**Détection changements** :

```javascript
if (item.lastUpdated > metadata.generated) {
  // Item modifié → reconstruire
} else {
  // Item intact → garder données existantes
}
```

**Seuil mode complet** : > 50% des items changés

**Exemple** : 5 items modifiés sur 200

- Mode incrémental : 5 API calls (~30 sec)
- Mode complet évité : 200 API calls (~15 min)
- **Économie** : 97.5%

### 3. Format clés périodes

**Optimisation** : String numérique au lieu d'objet

```javascript
// ✅ Actuel (performant)
periods["100"] = { lat, lon };

// ❌ Ancien (plus lourd)
periods: [{ time: 100, lat, lon }];
```

**Avantage** : Accès O(1) direct par clé

---

## 🗺️ Système de Géocodage (PBDB-only)

### Règles de placement

1. **PBDB API** (unique source)
  - 1 espèce valide → 1 requête
  - Coordonnées modernes uniquement
2. **Échec PBDB** → item ignoré (pas de fallback local)

### Items océaniques

**Détection** : tags `Ocean`/`Sea`/`Marine` → `global oceans`

**Positions prédéfinies par période** :

```javascript
500 Ma: Panthalassa (-30°, 120°), Iapetus (0°, 0°)
100 Ma: Pacific (0°, -120°), Atlantic (15°, -40°), Tethys (-10°, 90°)
```

**Rotation** : Plusieurs items même période → positions différentes

**Fallback** : Offset aléatoire ±5° si toutes positions utilisées

---

## 🏗️ Architecture du Code

### Module centralisé : `paleo-reconstruction.js`

**Responsabilité unique** : Logique de reconstruction

**Exports** :

- `PERIOD_MAPPING` : période géologique → âge (Ma)
- `PERIODS` : Array de toutes les périodes
- `buildDerivedFields(item)` : Construit youtubeUrl, preview, pageUrl
- `reconstructItemForPeriod(item, options)` : Reconstruction 1 période
- `reconstructPoint(lat, lon, time)` : API GPlates bas niveau

**Règles algorithmiques** :

1. Items océaniques → positions prédéfinies + rotation
2. Items >410 Ma → position moderne préservée (limite API)
3. Items continentaux → reconstruction API GPlates

### Scripts de production

```
Webflow CMS
    ↓
sync-contents.js (orchestrateur principal)
  │
  ├──> import-cms-items.js (récup CMS + géocodage MODERNE via PBDB)
  │      ↓ Output: geocoded-items.json (temporaire)
  │
  └──> reconstruct-paleogeography.js (reconstruction PALÉO)
           │ Utilise: paleo-reconstruction.js (module partagé)
           ↓ Output: content-data.json (final)
```

**Fichiers clés** :

- `import-cms-items.js` : Récupère CMS + parse free-tags + coords modernes via PBDB
- `geocoded-items.json` : Fichier temporaire (auto-supprimé après pipeline)
- `reconstruct-paleogeography.js` : Reconstruction paléo via GPlates API
- `paleo-reconstruction.js` : Module partagé (logique métier)
- `content-data.json` : Fichier final (moderne + paléo + métadatas)

**Principe DRY** : Aucune duplication logique reconstruction

---

## 📊 Métriques de Performance

### Temps de traitement

| Opération           | Items | API Calls | Durée   | Mode        |
| ------------------- | ----- | --------- | ------- | ----------- |
| Ajouter 1 item      | 1     | 1         | ~5 sec  | -           |
| Sync (5 nouveaux)   | 5     | 5         | ~30 sec | Incrémental |
| Sync (120 nouveaux) | 200   | 200       | ~15 min | Complet     |
| Init complète       | 200   | 200       | ~15 min | Complet     |

### Limites API GPlates

- **Rate limit** : Non documenté (API publique)
- **Timeout** : 30 sec par requête
- **Limite temporelle** : 410 Ma max (au-delà = 999.99)
- **Délai entre calls** : 100ms (recommandé)

---

## 🔧 Configuration Technique

### API GPlates

```javascript
const GPLATES_API_URL =
  "https://gws.gplates.org/reconstruct/reconstruct_points/";
const GPLATES_MODEL = "MERDITH2021";
const GPLATES_MAX_AGE = 410; // Ma
```

### Mapping périodes

```javascript
const PERIOD_MAPPING = {
  today: 0,
  quaternary: 2,
  neogene: 15,
  paleogene: 50,
  cretaceous: 100,
  jurassic: 160,
  triassic: 220,
  permian: 280,
  carboniferous: 320,
  devonian: 380,
  silurian: 410,
  ordovician: 450, // Utilise 410 Ma (limite API)
  cambrian: 500, // Utilise 410 Ma (limite API)
};
```

### Anti-collision

```javascript
const MIN_DISTANCE_DEGREES = 5.0; // Distance min entre points
const MAX_COLLISION_ATTEMPTS = 50; // Tentatives max placement
```

---

## 🎯 Choix de Design

### Pourquoi 1 période par item ?

**Raison** : Mapping avec `geological-period` (champ Webflow)

Item Crétacé (66-145 Ma) → affiché sur période 100 Ma du globe
Item Jurassique (145-201 Ma) → affiché sur période 160 Ma du globe

**Avantage** : Cohérence visuelle (même période géologique = même tranche temporelle)

### Pourquoi positions océaniques prédéfinies ?

**Raison** : API GPlates retourne 999.99 pour points océaniques

L'API ne peut reconstruire que les plaques **continentales**, pas océaniques.

**Solution** : Positions historiques des grands bassins océaniques :

- Panthalassa (Paléozoïque/Mésozoïque)
- Tethys (Mésozoïque)
- Iapetus (Paléozoïque)

---

## 📖 Références

- **Merdith et al. 2021** : "Extending full-plate tectonic models into deep time"
- **Cao et al. 2017** : "Improving global paleogeography since the late Paleozoic using paleobiology"
- **GPlates Web Service** : https://gws.gplates.org/

---

**Dernière mise à jour** : 31 janvier 2026
