# 🦕 PREHISTORIC DOMAIN - Workflow Complet

**Guide de référence unique pour gérer les contenus du globe temporel.**

Pour une IA sans contexte : ce fichier contient TOUS les workflows nécessaires pour synchroniser Webflow CMS et le globe 3D.

---

## 🎯 Commandes et Cas d'Usage (avec détails API)

### 1️⃣ Init complète (première synchro)

```bash
# Importer TOUS les contenus depuis Webflow
node scripts/import-new-contents.js --all
```

**Situation :** Nouveau projet, pas encore de `content-data.json`

**Ce qui se passe :**

1. 📥 **Fetch Webflow CMS** → ~2-3 API calls Webflow (pagination par 100 items)
2. 🗺️ **Géocodage** → 0 API call (utilise formations locales + random placement)
3. 🌍 **Reconstruction GPlates** → **N API calls** (1 par item actif)
4. 💾 **Écriture fichier** → `content-data.json` créé

**Appels API totaux :**

- Webflow : 2-3 calls
- GPlates : **200 calls** (si 200 items avec `display-on-app = true`)

**Durée estimée :** ~10-15 min pour 200 items

**Résultat :**

```json
{
  "metadata": {
    "generated": "2026-01-31T...",
    "totalItems": 200,
    "model": "MERDITH2021"
  },
  "items": [
    { "id": "...", "name": "T-Rex", "periods": { "100": { "lat": 45, "lon": -105 } } },
    ...
  ]
}
```

---

### 2️⃣ Ajouter UN item spécifique (par slug)

```bash
# Ajouter un seul item
node scripts/add-content-by-slug.js experience-giants-of-the-ice-age
```

**Situation :** Nouvel item créé dans Webflow, tu connais son slug

**Ce qui se passe :**

1. 📥 **Fetch Webflow** → 1 API call (GET item by slug)
2. 🗺️ **Géocodage inline** → 0 API call
3. 🌍 **Reconstruction GPlates** → **1 API call** (période la plus proche)
4. 💾 **Merge fichier** → Ajoute/remplace dans `content-data.json` existant

**Appels API totaux :**

- Webflow : 1 call
- GPlates : **1 call**

**Durée estimée :** ~5 secondes

**Résultat :**

- Item ajouté à `content-data.json`
- Autres items intacts (pas recalculés)

---

### 3️⃣ Sync complète (detect nouveaux/modifiés/supprimés)

```bash
# Détecter et appliquer tous les changements
node scripts/import-new-contents.js

# Simulation (voir ce qui changerait)
node scripts/import-new-contents.js --dry-run
```

**Situation :** Utilisation quotidienne/hebdomadaire

**Ce que ça détecte :**

- 🆕 **Nouveaux items** : dans CMS mais pas dans content-data.json
- 🔄 **Items modifiés** : `lastUpdated` (CMS) > `metadata.generated` (local)
- 🗑️ **Items supprimés** : dans content-data.json mais plus dans CMS
- ⏸️ **Items désactivés** : `display-on-app = false` ou `isArchived = true`

**Ce qui se passe (mode INCRÉMENTAL automatique) :**

#### Cas A : Peu de changements (< 50% des items)

**Exemple :** 3 nouveaux items, 2 modifiés, 1 supprimé (sur 200 items total)

1. 📥 **Fetch Webflow** → 2-3 API calls (tous les items)
2. 🔍 **Détection changements** → Compare IDs et dates
3. 🗑️ **Nettoyage** → Retire 1 item supprimé (opération locale)
4. ⚡ **Mode INCRÉMENTAL** → Reconstruit seulement 3 nouveaux + 2 modifiés
5. 💾 **Merge** → Fusionne avec items existants intacts

**Appels API totaux :**

- Webflow : 3 calls
- GPlates : **5 calls** (3 nouveaux + 2 modifiés)

**Durée estimée :** ~30 secondes

**Résultat :**

- 3 items ajoutés
- 2 items mis à jour avec nouvelles données
- 1 item retiré
- 194 items existants intacts (pas recalculés)

---

#### Cas B : Beaucoup de changements (> 50% des items)

**Exemple :** 120 nouveaux items (sur 200 items total)

1. 📥 **Fetch Webflow** → 2-3 API calls
2. 🔍 **Détection** → 120 nouveaux (60% du total)
3. 🔄 **Mode COMPLET** → Reconstruit TOUS les items actifs
4. 💾 **Écriture complète** → Réécrit tout le fichier

**Appels API totaux :**

- Webflow : 3 calls
- GPlates : **320 calls** (tous les items actifs)

**Durée estimée :** ~15-20 min

**Résultat :**

- Fichier complètement régénéré
- Garantie de cohérence totale

---

### 4️⃣ Modifier UN item existant (description, image, etc.)

```bash
# Sync détecte automatiquement les modifications
node scripts/import-new-contents.js
```

**Situation :** Item existe, tu modifies description/image dans Webflow

**Ce qui se passe :**

1. 📥 **Fetch Webflow** → 2-3 API calls (tous les items)
2. 🔍 **Détection** → Compare `lastUpdated` avec `metadata.generated`
   - Item "T-Rex" : `lastUpdated = 2026-01-31 10:00` > `generated = 2026-01-30 09:00` ✅
3. ⚡ **Mode INCRÉMENTAL** → Reconstruit seulement cet item
4. 💾 **Merge** → Remplace l'ancien item, garde les autres

**Appels API totaux :**

- Webflow : 3 calls
- GPlates : **1 call**

**Durée estimée :** ~5-10 secondes

**Résultat :**

- 1 item mis à jour avec nouvelles données (description, image, etc.)
- 199 items intacts

---

### 5️⃣ Supprimer UN item du CMS

```bash
# Sync détecte automatiquement les suppressions
node scripts/import-new-contents.js
```

**Situation :** Item supprimé dans Webflow CMS

**Ce qui se passe :**

1. 📥 **Fetch Webflow** → 2-3 API calls
2. 🔍 **Détection** → Item présent dans content-data.json mais absent du CMS
3. 🗑️ **Nettoyage uniquement** → Retire du fichier local (pas de reconstruction)
4. 💾 **Écriture** → Met à jour métadonnées

**Appels API totaux :**

- Webflow : 3 calls
- GPlates : **0 call** (rien à reconstruire)

**Durée estimée :** ~5 secondes

**Résultat :**

- 1 item retiré
- 199 items intacts

---

### 6️⃣ Désactiver UN item (display-on-app = false)

```bash
# Sync détecte automatiquement les désactivations
node scripts/import-new-contents.js
```

**Situation :** Item existe mais tu désactives `display-on-app` dans Webflow

**Ce qui se passe :**

1. 📥 **Fetch Webflow** → 2-3 API calls
2. 🔍 **Détection** → Item avec `display-on-app = false`
3. 🗑️ **Nettoyage** → Retire du fichier (ne doit plus être visible)
4. 💾 **Écriture** → Met à jour métadonnées

**Appels API totaux :**

- Webflow : 3 calls
- GPlates : **0 call**

**Durée estimée :** ~5 secondes

**Résultat :**

- 1 item retiré (ne sera plus sur le globe)
- 199 items intacts

**Résultat :**

- 1 item retiré (ne sera plus sur le globe)
- 199 items intacts

---

### 7️⃣ Sync switch display-on-app uniquement

```bash
# Synchroniser le switch dans Webflow (sans reconstruction)
node scripts/sync-display-on-app.js
```

**Situation :** Tu veux activer/désactiver automatiquement le switch selon free-tags

**Ce qui se passe :**

1. 📥 **Fetch Webflow** → 2-3 API calls
2. 🔍 **Détection** → Vérifie si `free-tags` rempli
3. ✏️ **Update Webflow** → Active/désactive le switch
4. ❌ **Pas de reconstruction** → Ne touche PAS à content-data.json

**Appels API totaux :**

- Webflow : 5-6 calls (3 GET + 2-3 PATCH)
- GPlates : **0 call**

**Durée estimée :** ~5-10 secondes

**Résultat :**

- Switches dans Webflow synchronisés
- content-data.json inchangé

---

## 📊 Tableau récapitulatif

| Cas d'usage                    | Commande                              | Webflow API | GPlates API | Durée   | Mode           |
| ------------------------------ | ------------------------------------- | ----------- | ----------- | ------- | -------------- |
| **Init complète** (200 items)  | `npm run init`                        | 3           | **200**     | ~15 min | Complet 🔄     |
| **Ajouter 1 item** (slug)      | `npm run add <slug>`                  | 1           | **1**       | ~5 sec  | -              |
| **Sync : 1 nouveau**           | `npm run sync`                        | 3           | **1**       | ~10 sec | Incrémental ⚡ |
| **Sync : 5 nouveaux**          | `npm run sync`                        | 3           | **5**       | ~30 sec | Incrémental ⚡ |
| **Sync : 1 modifié**           | `npm run sync`                        | 3           | **1**       | ~10 sec | Incrémental ⚡ |
| **Sync : 10 modifiés**         | `npm run sync`                        | 3           | **10**      | ~1 min  | Incrémental ⚡ |
| **Sync : 120 nouveaux** (>50%) | `npm run sync`                        | 3           | **320**     | ~20 min | Complet 🔄     |
| **Sync : 1 supprimé**          | `npm run sync`                        | 3           | **0**       | ~5 sec  | Nettoyage      |
| **Sync : 1 désactivé**         | `npm run sync`                        | 3           | **0**       | ~5 sec  | Nettoyage      |
| **Sync switch only**           | `node scripts/sync-display-on-app.js` | 6           | **0**       | ~10 sec | -              |

---

## ⚡ Optimisations automatiques

### Choix du mode (automatique)

```
SI --all présent
  → Mode COMPLET 🔄 (régénère tout)

SINON SI changements < 50% du total
  → Mode INCRÉMENTAL ⚡ (seulement nouveaux/modifiés)

SINON
  → Mode COMPLET 🔄 (plus sûr)
```

### Économies d'API

**Exemple concret : 5 items modifiés sur 200**

- **Avant** (sans optimisation) : 200 API calls GPlates (~15 min)
- **Maintenant** (incrémental) : 5 API calls GPlates (~30 sec)
- **Économie** : 97.5% d'API calls ✅

---

### 4. Sync display-on-app uniquement (sans reconstruction)

```bash
# Synchroniser le switch display-on-app dans Webflow
node scripts/sync-display-on-app.js
```

**Ce que ça fait :**

- Active `display-on-app = true` si `free-tags` rempli
- Désactive `display-on-app = false` si `free-tags` vide
- Aucun appel à GPlates API

**Durée estimée :** ~5 secondes (update Webflow)

---

## 📋 Workflow détaillé

### Scénario 1 : Démarrage du projet (init complète)

**Situation :** Nouveau projet, pas encore de `content-data.json`

```bash
# 1. Importer tous les contenus
node scripts/import-new-contents.js --all

# 2. Vérifier le résultat
node scripts/validate-content-data.js

# 3. Ouvrir le globe dans navigateur
open index.html
```

---

### Scénario 2 : Ajouter UN nouveau contenu

**Situation :** Nouvel item créé dans Webflow CMS

```bash
# Option A : Ajout rapide par slug (5 sec)
node scripts/add-content-by-slug.js <slug>

# Option B : Sync complète (détecte aussi autres changements)
node scripts/import-new-contents.js
```

**Étapes dans Webflow AVANT d'exécuter :**

1. Créer l'item dans la collection `contents`
2. Remplir `free-tags` : `Continent, Période, Espèce`
   - Exemple : `North America, Late Cretaceous, Tyrannosaurus rex`
3. (Optionnel) Activer `display-on-app` manuellement

---

### Scénario 3 : Mise à jour quotidienne/hebdomadaire

**Situation :** Plusieurs items ajoutés/modifiés/supprimés dans Webflow

```bash
# 1. Simulation pour voir les changements
node scripts/import-new-contents.js --dry-run

# 2. Appliquer les changements
node scripts/import-new-contents.js

# 3. Vérifier
node scripts/validate-content-data.js
```

---

### Scénario 4 : Désactiver un contenu (ne plus l'afficher)

**Situation :** Item existe mais ne doit plus être visible sur le globe

**Dans Webflow CMS :**

1. Désactiver `display-on-app = false`
   OU
2. Archiver l'item (`isArchived = true`)
   OU
3. Le mettre en draft (`isDraft = true`)

**Puis lancer :**

```bash
node scripts/import-new-contents.js
# → Détecte et retire automatiquement l'item de content-data.json
```

---

### Scénario 5 : Supprimer définitivement un contenu

**Situation :** Item supprimé du CMS Webflow

```bash
# La synchro détecte automatiquement les suppressions
node scripts/import-new-contents.js
# → Retire l'item de content-data.json
```

---

### Scénario 6 : Mettre à jour un contenu existant (description, image, etc.)

**Situation :** Item existe dans content-data.json mais a été modifié dans Webflow (nouvelle description, image, free-tags, etc.)

**Dans Webflow CMS :**

1. Modifier les champs souhaités (description, image, free-tags, etc.)
2. Webflow met automatiquement à jour `lastUpdated`

**Puis lancer :**

```bash
# Détecte automatiquement les items modifiés
node scripts/import-new-contents.js

# OU en dry-run pour voir ce qui sera mis à jour
node scripts/import-new-contents.js --dry-run
```

**Ce qui se passe :**

1. Script compare `lastUpdated` (CMS) avec `metadata.generated` (local)
2. Si `lastUpdated` > `metadata.generated` → item détecté comme modifié
3. **Mode incrémental** : Seul cet item est reconstruit (1 API call)
4. Merge avec le fichier existant (les autres items intacts)

**Optimisation automatique :**

- Si < 50% des items changés → mode **incrémental** ⚡ (rapide)
- Si > 50% des items changés → mode **complet** 🔄 (régénère tout)
- Avec `--all` → toujours mode **complet**

**Performance :**

- 1 item modifié : ~5 secondes (mode incrémental)
- 10 items modifiés : ~50 secondes (mode incrémental)
- 100+ items modifiés : ~10 minutes (mode complet)

---

## 🗺️ Système de géocodage automatique

### Hiérarchie de placement (3 étapes)

---

## 🗺️ Système de géocodage automatique

### Format des free-tags (OBLIGATOIRE)

```
Format: Continent, Période, Espèce1, Espèce2
Exemple: North America, Late Cretaceous, Tyrannosaurus rex, Triceratops
```

**Continents reconnus :**

- `North America`, `South America`, `Asia`, `Europe`, `Africa`, `Australia`, `India`

**Périodes reconnues :**

- `Late Cretaceous`, `Early Cretaceous`, `Cretaceous`
- `Late Jurassic`, `Middle Jurassic`, `Jurassic`
- `Late Triassic`, `Triassic`
- `Permian`, `Carboniferous`, `Devonian`, `Silurian`, `Cambrian`
- `Pleistocene`, `Pliocene`, `Miocene`

### Hiérarchie de placement (3 étapes)

#### Étape 1 : Formations célèbres (haute confiance)

**Source :** `assets/data/famous-formations.json`

Exemples :

- T-Rex → Hell Creek Formation, Montana (47.5°, -105.5°)
- Velociraptor → Nemegt Formation, Mongolia (43.5°, 104.0°)
- Pteranodon → Niobrara Formation, Kansas (38.5°, -100.5°)

**Ajouter une formation :**

```bash
# Recherche automatique
npm run find-formation "Spinosaurus"

# Puis éditer assets/data/famous-formations.json
```

#### Étape 2 : Placement aléatoire sur continent (confiance moyenne)

- 50 tentatives dans les limites du continent
- Évite collisions (distance min 2.5°)

#### Étape 3 : Zones continentales prédéfinies (fallback)

- 5 zones par continent en rotation
- Garantit distribution uniforme

---

## ⚙️ Architecture technique

### Pipeline de données

```
┌─────────────────────────────────────────────────────────┐
│ 1. SOURCE : Webflow CMS (collection "contents")         │
│    - free-tags parsé                                     │
│    - display-on-app = true                              │
│    - isArchived = false, isDraft = false                │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. GÉOCODAGE : assets/data/famous-formations.json       │
│    - Formations célèbres (espèces connues)              │
│    - Placement aléatoire sur continent                  │
│    - Anti-collision (distance min 2.5°)                 │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. RECONSTRUCTION : GPlates API (MERDITH2021)           │
│    - 1 période par item (la plus proche de son âge)     │
│    - Format : lon,lat,time → ancient_lon,ancient_lat    │
│    - 1 API call par item (optimisé, pas 13×)            │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. STOCKAGE : assets/data/content-data.json             │
│    - Structure : { metadata, items[] }                  │
│    - Chaque item : { id, periods: { "100": {lat,lon} } }│
│    - Utilisé directement par le globe 3D                │
└─────────────────────────────────────────────────────────┘
```

### Optimisation des appels API

**Avant (ancien système) :** 13 périodes × N items = 2509 API calls (~15 min)

**Maintenant (optimisé) :** 1 période × N items = N API calls (~5 sec/item)

**Comment ça marche :**

- Chaque item a un âge estimé (ex: Tyrannosaurus = 66 Ma)
- On trouve la période du globe la plus proche (ex: 100 Ma)
- On ne reconstruit que cette période
- En cas d'égalité de distance, on préfère la période >= âge (où l'item existait)

---

## 📦 Fichiers et scripts

### Fichiers de données

```
assets/
├── data/
│   ├── content-data.json           ← SOURCE utilisée par le globe
│   └── famous-formations.json      ← Formations célèbres (éditable)
│
├── merdith2021-coastlines/         ← Continents (34 périodes)
└── cao-paleogeography/             ← Terres émergées (23 périodes)
```

### Scripts (dans ordre d'utilisation)

| Script                     | Usage                  | Durée    | Appels API  |
| -------------------------- | ---------------------- | -------- | ----------- |
| `import-new-contents.js`   | Init + Sync complète   | 5-10 min | N items     |
| `add-content-by-slug.js`   | Ajouter 1 item         | 5 sec    | 1           |
| `sync-display-on-app.js`   | Sync switch uniquement | 5 sec    | 0 (GPlates) |
| `validate-content-data.js` | Vérifier structure     | 1 sec    | 0           |
| `validate-free-tags.js`    | Vérifier free-tags     | 5 sec    | 0           |
| `find-formation.js`        | Rechercher formation   | 2 sec    | 0           |

### Scripts internes (ne pas appeler directement)

- `auto-geocode-contents.js` : Appelé automatiquement par import/add
- `reconstruct-paleogeography.js` : Appelé automatiquement par import/add

---

## 🔍 Validation et debugging

### Vérifier content-data.json

```bash
node scripts/validate-content-data.js
```

**Ce qu'il affiche :**

- Métadonnées (date génération, total items)
- Premier item (structure complète)
- Couverture (types, périodes)
- Stats (preview, YouTube, etc.)

### Vérifier les free-tags

```bash
# Rapport complet
node scripts/validate-free-tags.js

# Uniquement les erreurs
node scripts/validate-free-tags.js --errors-only
```

**Ce qu'il détecte :**

- ❌ Continent manquant
- ⚠️ Période non détectée
- ⚠️ Format incorrect
- ✅ Items valides

---

## ⚠️ Règles importantes

### À NE JAMAIS FAIRE

1. ❌ Éditer manuellement `content-data.json`
   - Toujours passer par les scripts
   - Exception : correction ponctuelle urgente (documenter dans commit)

2. ❌ Oublier le continent dans free-tags
   - L'item sera ignoré
   - Aucune coordonnée générée

3. ❌ Mélanger continents dans un seul item
   - Un item = un lieu = un continent

4. ❌ Lancer `reconstruct-paleogeography.js` directement
   - Utiliser `import-new-contents.js` à la place

### Bonnes pratiques

1. ✅ Utiliser `--dry-run` avant synchronisation

   ```bash
   node scripts/import-new-contents.js --dry-run
   ```

2. ✅ Vérifier les free-tags avant import

   ```bash
   node scripts/validate-free-tags.js
   ```

3. ✅ Commit séparé pour chaque type de changement

   ```bash
   git commit -m "feat: add 3 new Cretaceous items"
   git commit -m "fix: update formation for Spinosaurus"
   ```

4. ✅ Tester sur le globe après changements
   ```bash
   open index.html
   # Vérifier visuellement les nouveaux points
   ```

---

## 🚀 NPM Scripts (raccourcis)

**À configurer dans `package.json` :**

```json
{
  "scripts": {
    "init": "node scripts/import-new-contents.js --all",
    "sync": "node scripts/import-new-contents.js",
    "sync:dry": "node scripts/import-new-contents.js --dry-run",
    "add": "node scripts/add-content-by-slug.js",
    "validate": "node scripts/validate-content-data.js",
    "validate:tags": "node scripts/validate-free-tags.js",
    "find-formation": "node scripts/find-formation.js"
  }
}
```

**Usage :**

```bash
npm run init              # Init complète
npm run sync              # Sync tous changements
npm run sync:dry          # Simulation
npm run add <slug>        # Ajouter 1 item
npm run validate          # Vérifier structure
npm run validate:tags     # Vérifier free-tags
npm run find-formation "T-Rex"  # Chercher formation
```

---

## 🔮 Cas d'usage avancés

### Régénérer TOUS les items (rare)

**⚠️ Temps : ~1 heure pour 200 items**

```bash
# Nettoyer
rm assets/data/content-data.json

# Réimporter tout
node scripts/import-new-contents.js --all

# Vérifier
node scripts/validate-content-data.js
```

### Ajouter une nouvelle période temporelle

```bash
# 1. Télécharger coastlines Merdith (si nécessaire)
python3 scripts/fetch-merdith2021.py

# 2. Éditer config dans reconstruct-paleogeography.js
# Ajouter : { time: 350, name: 'new-period' }

# 3. Régénérer
node scripts/import-new-contents.js --all
```

### Migrer vers un nouveau modèle

**Actuellement :** MERDITH2021
**Si migration vers SETON2012 par exemple :**

```bash
# 1. Éditer reconstruct-paleogeography.js
# Changer : model=MERDITH2021 → model=SETON2012

# 2. Régénérer tout
rm assets/data/content-data.json
node scripts/import-new-contents.js --all
```

---

## � Détails techniques

### Mapping geologicalPeriod → Période du globe

**Principe :** Les items sont placés sur le globe selon leur champ `geologicalPeriod` (Webflow), pas leur âge numérique.

**Mapping utilisé :**

```javascript
const periodMapping = {
  today: 0,
  quaternary: 2,
  neogene: 15,
  paleogene: 50,
  cretaceous: 100, // Item de 66 Ma OU 110 Ma → tous à 100 Ma
  jurassic: 160,
  triassic: 220,
  permian: 280,
  carboniferous: 320,
  devonian: 380,
  silurian: 410,
  ordovician: 450,
  cambrian: 500,
};
```

**Exemple :**

- Item avec `geologicalPeriod = "cretaceous"` et `age = 66 Ma` → période **100 Ma**
- Item avec `geologicalPeriod = "cretaceous"` et `age = 110 Ma` → période **100 Ma** aussi
- ✅ Cohérence : même période géologique = même tranche de temps sur le globe

**Format des clés de périodes :**

- ✅ **Correct :** `periods: { "100": { lat, lon } }` (numérique string)
- ❌ **Ancien format :** `periods: { "100Ma": { lat, lon } }` (avec suffix "Ma")

**Fichiers concernés :**

- `scripts/add-content-by-slug.js` : Utilise mapping direct + module paleo-reconstruction
- `scripts/reconstruct-paleogeography.js` : Utilise module paleo-reconstruction
- `scripts/reconstruct-paleogeography-incremental.js` : Reconstruit toutes les périodes (clés numériques)
- `scripts/paleo-reconstruction.js` : **MODULE CENTRALISÉ** - logique de reconstruction réutilisable
- `src/app.js` : Lit avec `content.periods[this.currentTime]` (attend clés numériques)

### Items océaniques (Global Oceans)

**Principe :** Items sans continent dans `free-tags` sont considérés comme océaniques globaux.

**Détection automatique :**

```javascript
// Dans auto-geocode-contents.js
if (!continent) {
  continent = "global oceans"; // Fallback automatique
}
```

**Placement paléogéographique :**

L'API GPlates ne peut pas reconstruire les positions océaniques (retourne 999.99). Solution : **positions océaniques prédéfinies par période**.

```javascript
// Positions garanties dans les grands bassins océaniques historiques
const OCEANIC_POSITIONS_BY_PERIOD = {
  500: [
    { lat: -30.0, lon: 120.0, name: "Panthalassa Ocean" },
    { lat: 0.0, lon: 0.0, name: "Iapetus Ocean" },
  ],
  100: [
    { lat: 0.0, lon: -120.0, name: "Pacific Ocean" },
    { lat: 15.0, lon: -40.0, name: "Atlantic Ocean" },
    { lat: -10.0, lon: 90.0, name: "Tethys Ocean" },
  ],
  // ... autres périodes
};
```

**Système de rotation :** Plusieurs items océaniques à la même période utilisent des positions différentes (évite collisions).

```javascript
// 1er item Cambrian → Panthalassa (-30°, 120°)
// 2e item Cambrian → Iapetus (0°, 0°)
// 3e item Cambrian → retour Panthalassa
```

**Exemple d'item océanique :**

```json
{
  "slug": "cambrian-cradle-of-the-phanerozoic",
  "freeTags": "Cambrian, Trilobites, Radiodonts",
  "location": "global oceans",
  "modernLat": -11.19,
  "modernLon": -40.24,
  "periods": {
    "500": {
      "lat": -30,
      "lon": 120
    }
  }
}
```

✅ Position moderne : Atlantique actuel
✅ Position 500 Ma : **Panthalassa Ocean** (océan Cambrien, pas océan moderne)

---

## 📦 Architecture modulaire

### Module `paleo-reconstruction.js`

**Nouveau module centralisé** pour éviter duplication de code :

```javascript
const { reconstructItemForPeriod } = require("./paleo-reconstruction");

// Utilisation dans n'importe quel script
const result = await reconstructItemForPeriod(item, { verbose: true });
// → { age: 100, lat: 45.2, lon: -105.3 }
```

**Gère automatiquement :**

- ✅ Mapping `geologicalPeriod` → âge numérique
- ✅ Items océaniques → positions prédéfinies avec rotation
- ✅ Périodes > 410 Ma → conservation position moderne
- ✅ Reconstruction continentale → appel API GPlates
- ✅ Gestion erreurs API → fallback position moderne

**Scripts utilisant ce module :**

- `add-content-by-slug.js`
- `reconstruct-paleogeography.js`
- Tous futurs scripts de reconstruction

---

## 📋 Fichiers concernés :\*\*

## �📚 Documentation complémentaire

- **[TECHNICAL_STRATEGY.md](./TECHNICAL_STRATEGY.md)** : Choix techniques (modèles géologiques, projections)
- **[COORDINATES_RULES.md](./COORDINATES_RULES.md)** : Règles détaillées de géocodage
- **[QUICKSTART.md](./QUICKSTART.md)** : Démarrage rapide

---

## ✅ Checklist déploiement

Avant de mettre en production :

- [ ] `npm run validate` passe sans erreur
- [ ] `npm run validate:tags` ne montre pas d'items invalides
- [ ] Tous les items ont `display-on-app = true` dans Webflow
- [ ] `content-data.json` existe et contient les items attendus
- [ ] Globe testé visuellement (ouvrir `index.html`)
- [ ] Git commit + push effectué

---

**Dernière mise à jour :** 31 janvier 2026
