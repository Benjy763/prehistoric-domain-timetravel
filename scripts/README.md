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
- `reconstructItemForAllPeriods(item, options)` - (legacy)
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

**Usage**: Reconstruction incrémentale (1 période par item)

```bash
node scripts/reconstruct-paleogeography-incremental.js             # Full
node scripts/reconstruct-paleogeography-incremental.js --sample    # Test
node scripts/reconstruct-paleogeography-incremental.js --incremental # Delta only
```

**Caractéristiques**:

- 1 appel API par item (période la plus proche)
- Mode incrémental: seulement items nouveaux/modifiés
- Fichier avec timestamp `_reconstructedAt`

**Quand utiliser**:

- Mises à jour rapides
- Tests ciblés (slugs)

---

### ➕ Ajout par slug

Utiliser `sync-contents.js --slugs=...` (pipeline complet).

---

## 🔄 Flow de données

```
Webflow CMS (source)
    ↓
[sync-contents.js] Orchestrateur
    ↓
[import-cms-items.js] Import + Géocodage MODERNE (PBDB-only)
    → Récupère items CMS
    → Parse free-tags (espèces)
    → PBDB uniquement (1 espèce, 1 requête)
    → Échec PBDB = item ignoré
    → Output: geocoded-items.json (temporaire)
    ↓
[reconstruct-paleogeography.js] Reconstruction PALÉO
    → Lit geocoded-items.json
    → Appelle GPlates API
    → 1 période par item
    → Utilise paleo-reconstruction.js (module)
    ↓
assets/data/content-data.json (final)
    → Coordonnées modernes + paléo
    → Métadatas complètes
    → Prêt pour le globe 3D
```

---

## Scripts Principaux

### 🎯 `sync-contents.js`

**Rôle**: Orchestrateur principal - synchronise CMS Webflow → Globe

**Options**:

```bash
node scripts/sync-contents.js                    # Mode intelligent (nouveaux/modifiés)
node scripts/sync-contents.js --all              # Réimport complet
node scripts/sync-contents.js --slugs=item1,item2  # Import ciblé (rapide)
node scripts/sync-contents.js --limit=20         # Test (20 items)
node scripts/sync-contents.js --dry-run          # Simulation
```

**Pipeline automatique**:

1. Appelle `import-cms-items.js` (géocodage moderne)
2. Appelle `reconstruct-paleogeography.js` (reconstruction paléo)
3. Merge résultats dans `content-data.json`
4. Nettoie fichier temporaire

---

### 📥 `import-cms-items.js`

**Rôle**: Récupère items CMS + calcule coordonnées géographiques MODERNES

**Options**:

```bash
node scripts/import-cms-items.js --slugs=pteranodon
node scripts/import-cms-items.js --limit=20
```

**Pipeline**:

1. Fetch items depuis Webflow CMS (API)
2. Extrait métadatas (name, slug, category, youtubeId, etc.)
3. Parse free-tags → continent, espèces, période
4. Géocode → coordonnées modernes (lat/lon actuelles)
5. Enrichit via PBDB si espèce inconnue (cache)
6. Output: `geocoded-items.json` (temporaire)

**Sources géocodage**:

- PBDB API uniquement (aucune donnée locale)
- Items marins → placement direct en océan

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
            ↓
            └── import-cms-items.js
```

---

## Tests

```bash
# Test syntaxe
node --check scripts/*.js

# Test module central
node -e "const m = require('./scripts/paleo-reconstruction'); console.log(Object.keys(m));"

# Test reconstruction 1 item
node scripts/sync-contents.js --slugs=<slug>

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
