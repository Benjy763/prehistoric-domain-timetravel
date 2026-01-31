# Scripts Prehistoric Domain

Organisation centralisée et optimisée des scripts de reconstruction paléogéographique.

## Architecture

### 📦 Module Central: `paleo-reconstruction.js`

**Responsabilité unique**: Toute la logique de reconstruction paléogéographique

**Exports**:

- `PERIOD_MAPPING` - Mapping période géologique → âge (Ma)
- `PERIODS` - Array de toutes les périodes disponibles
- `buildDerivedFields(item)` - Construit youtubeUrl, preview, pageUrl
- `reconstructItemForPeriod(item, options)` - Reconstruit 1 période (la plus proche)
- `reconstructItemForAllPeriods(item, options)` - Reconstruit toutes les périodes
- `reconstructPoint(lat, lon, time)` - API GPlates bas niveau
- `isOceanicItem(item)` - Détecte si item océanique
- `getPeriodAge(geologicalPeriod)` - Conversion période → âge

**Règles algorithmiques centralisées**:

1. Items océaniques (sans continent) → positions prédéfinies par période
2. Items >410Ma → position moderne conservée (limite API GPlates)
3. Items continentaux → reconstruction via API GPlates MERDITH2021
4. Anti-collision océanique via rotation de positions + offset fallback
5. Clés périodes: format string numérique ("100" pas "100Ma")

---

## Scripts de Production

### 🌍 `reconstruct-paleogeography.js`

**Usage**: Reconstruction optimisée (1 période par item = période géologique)

```bash
node scripts/reconstruct-paleogeography.js          # Full (tous items)
node scripts/reconstruct-paleogeography.js --sample # Test (20 items)
```

**Optimisation**:

- 1 seul appel API par item (période la plus proche)
- ~90% plus rapide que mode all-periods
- Fichier final: `assets/data/content-data.json`

**Quand utiliser**: Production quotidienne, rebuild rapide

---

### 🔄 `reconstruct-paleogeography-incremental.js`

**Usage**: Reconstruction exhaustive (toutes périodes)

```bash
node scripts/reconstruct-paleogeography-incremental.js             # Full
node scripts/reconstruct-paleogeography-incremental.js --sample    # Test
node scripts/reconstruct-paleogeography-incremental.js --incremental # Delta only
```

**Caractéristiques**:

- 13 appels API par item (une par période géologique)
- Mode incrémental: seulement items nouveaux/modifiés
- Fichier avec timestamp `_reconstructedAt`

**Quand utiliser**:

- Changement de modèle GPlates
- Validation complète
- Génération de dataset complet pour recherche

---

### ➕ `add-content-by-slug.js`

**Usage**: Ajouter un item spécifique au globe

```bash
node scripts/add-content-by-slug.js experience-the-meg
node scripts/add-content-by-slug.js tyrannosaurus-rex
```

**Pipeline automatique**:

1. Fetch item depuis Webflow (par slug)
2. Validation des free-tags (continent requis)
3. Activation display-on-app si nécessaire
4. Géocodage moderne (auto-geocode-contents.js)
5. Reconstruction paléogéographique (paleo-reconstruction.js)
6. Ajout/update dans content-data.json
7. Anti-collision océanique avec items existants

**Quand utiliser**:

- Ajout manuel d'un item
- Test d'un nouveau contenu
- Re-géocodage après modification Webflow

---

## Scripts Utilitaires

### 📍 `auto-geocode-contents.js`

**Usage**: Génère coordonnées modernes à partir des free-tags

```bash
node scripts/auto-geocode-contents.js
```

**Logique**:

- Parse free-tags pour extraire continent + période
- Zones géographiques par continent (avec variance)
- Anti-collision spatiale (distance minimum 5°)
- Détection items océaniques: `location = "global oceans"`

**Quand utiliser**: Rarement en standalone (utilisé par autres scripts)

---

### ✅ `validate-content-data.js`

**Usage**: Vérification d'intégrité du fichier final

```bash
node scripts/validate-content-data.js
```

**Vérifie**:

- Structure JSON valide
- Champs obligatoires présents
- Clés périodes au format correct
- Statistiques: preview, youtubeUrl, pageUrl

---

### 🔄 `sync-display-on-app.js`

**Usage**: Synchronise display-on-app entre Webflow et content-data.json

```bash
node scripts/sync-display-on-app.js
```

---

### 🏷️ `validate-free-tags.js`

**Usage**: Analyse qualité des free-tags (continent, période, espèces)

```bash
node scripts/validate-free-tags.js
```

---

## Règles de Cohérence

### 1. Construction des champs dérivés

**TOUJOURS** utiliser `buildDerivedFields()` du module central:

```javascript
const { buildDerivedFields } = require("./paleo-reconstruction");
const derivedFields = buildDerivedFields(item);
// → { youtubeUrl, preview, pageUrl }
```

❌ **JAMAIS** dupliquer cette logique dans les scripts

### 2. Reconstruction paléogéographique

**TOUJOURS** utiliser les fonctions du module:

```javascript
const { reconstructItemForPeriod } = require('./paleo-reconstruction');
const result = await reconstructItemForPeriod(item, {
  verbose: true,
  existingItems: [...] // Anti-collision océanique
});
```

❌ **JAMAIS** appeler directement l'API GPlates depuis les scripts

### 3. Mapping des périodes

**TOUJOURS** utiliser `PERIOD_MAPPING` et `PERIODS`:

```javascript
const { PERIOD_MAPPING, PERIODS } = require("./paleo-reconstruction");
const age = PERIOD_MAPPING[geologicalPeriod]; // cretaceous → 100
```

❌ **JAMAIS** dupliquer ces constants

### 4. Clés de périodes

**FORMAT UNIQUE**: String numérique

```javascript
periods["100"] = { lat, lon }; // ✅ Correct
periods["100Ma"] = { lat, lon }; // ❌ Incorrect
periods[100] = { lat, lon }; // ❌ Incorrect (number)
```

---

## Dépendances

```
paleo-reconstruction.js (module central)
    ↓
    ├── reconstruct-paleogeography.js
    ├── reconstruct-paleogeography-incremental.js
    └── add-content-by-slug.js
            ↓
            └── auto-geocode-contents.js
```

---

## Tests

```bash
# Test syntaxe
node --check scripts/*.js

# Test module central
node -e "const m = require('./scripts/paleo-reconstruction'); console.log(Object.keys(m));"

# Test reconstruction 1 item
node scripts/add-content-by-slug.js --help

# Test reconstruction sample
node scripts/reconstruct-paleogeography.js --sample
```

---

## Maintenance

**Avant d'ajouter du code**:

1. Vérifier si la logique existe déjà dans `paleo-reconstruction.js`
2. Si oui, importer et réutiliser
3. Si non, ajouter dans le module central puis exporter

**Code review checklist**:

- [ ] Aucune duplication de PERIOD_MAPPING, PERIODS
- [ ] Aucune duplication buildDerivedFields
- [ ] Aucune duplication reconstructPoint
- [ ] Import depuis paleo-reconstruction.js
- [ ] Clés périodes au format "100" (string)
- [ ] Anti-collision océanique avec existingItems

---

**Dernière mise à jour**: 31 janvier 2026
**Architecture**: Module centralisé, zéro duplication
