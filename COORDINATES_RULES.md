# 🌍 RÈGLES DE PLACEMENT DES COORDONNÉES

## Système de Géolocalisation Harmonieuse pour Prehistoric Domain

---

## 🎯 PRINCIPES FONDAMENTAUX

### 0. MODÈLES DE RECONSTRUCTION PALÉOGÉOGRAPHIQUE

#### Repositionnement des Points

Les coordonnées définies dans ce document sont des **coordonnées GPS modernes** (où les fossiles ont été découverts aujourd'hui). Elles sont ensuite **automatiquement repositionnées** vers leurs positions anciennes via l'API GPlates.

**Modèle utilisé : Merdith et al. 2021**

- Reconstruction globale des plaques tectoniques
- Période couverte : 0-410 Ma (limite API)
- Source : GPlates Web Service API (`https://gws.gplates.org`)
- **Cohérence parfaite** : Même modèle que celui utilisé pour afficher les continents sur le globe ("Our Continents" view)
- **Note** : Points antérieurs utilisés Zahirovic 2022 (compatible, différence minime)

#### Flux de Données

```
Coordonnées GPS modernes (ce document)
    ↓
Algorithme de distribution harmonieuse
    ↓
API GPlates (modèle MERDITH2021)
    ↓
Coordonnées paléogéographiques finales (affichage sur le globe)
```

**Important** : Les coordonnées listées ci-dessous sont toutes en **géographie moderne**. Le système se charge de les transformer en coordonnées anciennes selon la période sélectionnée.

---

### 1. HARMONIE VISUELLE > EXACTITUDE ABSOLUE

- Priorité à la distribution équilibrée sur le globe
- Éviter tout regroupement/stacking de points
- Créer une visualisation agréable et explorable

### 2. DISTANCE MINIMUM GARANTIE

- **Distance minimale entre 2 points : 3° (≈330 km)**
- Système de vérification anti-collision avant placement
- Si collision détectée → décalage automatique vers zone adjacente libre

### 3. PLAUSIBILITÉ SCIENTIFIQUE

- Les points doivent rester dans des zones géologiquement cohérentes
- Respecter les continents indiqués dans `free-tags`
- Privilégier les régions riches en fossiles connues

---

## 📍 SYSTÈME DE GRILLE PAR CONTINENT

### **NORTH AMERICA** (Crétacé/Jurassique/Trias)

#### Zones de Distribution (5 points d'ancrage)

1. **Montana/Alberta** (Formation Hell Creek)
   - Lat: 47.5°N, Lon: -105.5°W
   - Espèces : T-Rex, Triceratops, Edmontosaurus

2. **Wyoming** (Formation Morrison)
   - Lat: 43.0°N, Lon: -107.5°W
   - Espèces : Diplodocus, Stegosaurus, Allosaurus

3. **Utah/Colorado** (Formation Cedar Mountain)
   - Lat: 39.0°N, Lon: -109.0°W
   - Espèces : Utahraptor, Iguanodon

4. **New Mexico/Texas** (Formation Chinle)
   - Lat: 35.0°N, Lon: -106.0°W
   - Espèces : Coelophysis

5. **Alberta** (Formation Dinosaur Park)
   - Lat: 50.5°N, Lon: -111.5°W
   - Espèces : Albertosaurus, Parasaurolophus

**Règle de rotation** : Alterner entre ces 5 zones pour chaque nouvel item "North America"

---

### **ASIA** (Crétacé/Jurassique)

#### Zones de Distribution (5 points d'ancrage)

1. **Mongolie (Gobi)** (Formation Nemegt)
   - Lat: 43.5°N, Lon: 104.0°E
   - Espèces : Velociraptor, Protoceratops, Tarbosaurus

2. **Chine (Liaoning)** (Formation Yixian)
   - Lat: 41.5°N, Lon: 121.0°E
   - Espèces : Yutyrannus, Microraptor, Sinornithosaurus

3. **Chine (Sichuan)** (Formation Shaximiao)
   - Lat: 30.0°N, Lon: 104.5°E
   - Espèces : Yangchuanosaurus, Mamenchisaurus

4. **Kazakhstan**
   - Lat: 48.0°N, Lon: 67.0°E
   - Espèces génériques asiatiques

5. **Thaïlande**
   - Lat: 16.0°N, Lon: 102.0°E
   - Espèces du sud-est asiatique

**Règle de rotation** : Alterner entre ces 5 zones

---

### **SOUTH AMERICA** (Crétacé/Jurassique/Trias)

#### Zones de Distribution (5 points d'ancrage)

1. **Argentine (Patagonie)** (Formation Cerro Barcino)
   - Lat: -43.0°S, Lon: -67.0°W
   - Espèces : Giganotosaurus, Argentinosaurus

2. **Brésil (Paraná)**
   - Lat: -15.0°S, Lon: -47.5°W
   - Espèces : Tupuxuara

3. **Argentine (Mendoza)**
   - Lat: -33.0°S, Lon: -69.0°W
   - Espèces : Herrerasaurus

4. **Chili**
   - Lat: -38.0°S, Lon: -71.0°W
   - Espèces génériques

5. **Uruguay**
   - Lat: -32.5°S, Lon: -55.5°W
   - Espèces génériques

**Règle de rotation** : Alterner entre ces 5 zones

---

### **EUROPE** (Jurassique/Trias)

#### Zones de Distribution (5 points d'ancrage)

1. **Angleterre (Dorset)** (Formation Purbeck)
   - Lat: 50.5°N, Lon: -2.5°W
   - Espèces : Iguanodon, Megalosaurus

2. **Allemagne (Bavière)** (Formation Solnhofen)
   - Lat: 48.8°N, Lon: 11.0°E
   - Espèces : Archaeopteryx, Compsognathus

3. **France (Provence)**
   - Lat: 44.0°N, Lon: 4.0°E
   - Espèces génériques

4. **Espagne (Asturies)**
   - Lat: 43.5°N, Lon: -5.0°W
   - Espèces : Ichthyosaures

5. **Portugal (Lourinhã)**
   - Lat: 39.2°N, Lon: -9.3°W
   - Espèces : Torvosaurus, Allosaurus

**Règle de rotation** : Alterner entre ces 5 zones

---

### **AFRICA** (Crétacé/Jurassique)

#### Zones de Distribution (5 points d'ancrage)

1. **Maroc (Kem Kem)** (Formation Kem Kem)
   - Lat: 31.0°N, Lon: -4.0°W
   - Espèces : Spinosaurus, Carcharodontosaurus

2. **Égypte**
   - Lat: 27.0°N, Lon: 31.0°E
   - Espèces : Aegyptosaurus

3. **Afrique du Sud (Karoo)**
   - Lat: -32.0°S, Lon: 22.0°E
   - Espèces : Euparkeria

4. **Niger**
   - Lat: 16.0°N, Lon: 8.0°E
   - Espèces : Suchomimus

5. **Madagascar**
   - Lat: -18.0°S, Lon: 46.5°E
   - Espèces : Majungasaurus

**Règle de rotation** : Alterner entre ces 5 zones

---

### **AUSTRALIA** (Crétacé)

#### Zones de Distribution (4 points d'ancrage)

1. **Queensland**
   - Lat: -23.0°S, Lon: 145.0°E
   - Espèces : Australovenator, Diamantinasaurus

2. **Victoria**
   - Lat: -37.5°S, Lon: 144.0°E
   - Espèces : Leaellynasaura

3. **Western Australia**
   - Lat: -26.0°S, Lon: 118.0°E
   - Espèces génériques

4. **New South Wales**
   - Lat: -32.0°S, Lon: 148.0°E
   - Espèces génériques

**Règle de rotation** : Alterner entre ces 4 zones

---

## 🔄 ALGORITHME DE PLACEMENT

### ÉTAPE 1 : Extraction des Informations

```
Input: "North America, Late Cretaceous, Albertosaurus, Edmontosaurus"
↓
Parsed:
- Continent: "North America"
- Period: "Late Cretaceous"
- Species: ["Albertosaurus", "Edmontosaurus"]
```

### ÉTAPE 2 : Recherche Formation Célèbre

```
IF (Species + Period + Continent) MATCH formations_database:
    point_ancrage = formations_database[match]
ELSE:
    point_ancrage = continent_zones[rotation_index]
    rotation_index = (rotation_index + 1) % nombre_zones
```

### ÉTAPE 3 : Vérification Anti-Collision

```
FOR each existing_point IN all_points:
    distance = calculate_distance(new_point, existing_point)

    IF distance < 3.0:  // degrees
        // Collision détectée !
        new_point = find_nearest_free_zone(continent, existing_points)
        BREAK
```

### ÉTAPE 4 : Offset Aléatoire Léger

```
final_lat = point_ancrage.lat + random(-1.5, +1.5)
final_lon = point_ancrage.lon + random(-1.5, +1.5)

// Valider que l'offset ne crée pas de collision
IF collision_detected(final_lat, final_lon):
    final_lat = point_ancrage.lat + random(-2.5, +2.5)
    final_lon = point_ancrage.lon + random(-2.5, +2.5)
```

---

## 🛠️ CAS SPÉCIAUX

### Continent Non Reconnu

→ Utiliser "Unknown Location" (0°N, 0°E) + warning log

### Multiple Species dans free-tags

→ Utiliser la première espèce reconnue comme ancrage principal

### Espèce Marine (Ichthyosaure, Plésiosaure, etc.)

→ Privilégier zones côtières des continents
→ Décalage vers océan adjacent (+5° vers mer)

### Espèce Volante (Ptérosaure)

→ Même règle que terrestres (sites de fossiles)

### Période Non Reconnue

→ Utiliser le centre de la zone continentale par défaut

---

## 📊 TRACKING & ANALYTICS

### Variables à Maintenir

```javascript
{
  "north_america_rotation_index": 0,  // 0-4
  "asia_rotation_index": 0,           // 0-4
  "south_america_rotation_index": 0,  // 0-4
  "europe_rotation_index": 0,         // 0-4
  "africa_rotation_index": 0,         // 0-4
  "australia_rotation_index": 0,      // 0-3
  "all_placed_coordinates": [
    { lat: 47.5, lon: -105.5, id: "item123" },
    // ... tous les points placés
  ]
}
```

### Logs de Placement

Chaque placement génère un log :

```
✅ [Item: Jurassic Wild Ep1]
   → Yutyrannus + Early Cretaceous + Asia
   → Formation: Yixian, China
   → Coordinates: 41.2°N, 120.8°E
   → Distance to nearest: 5.3° (OK)
```

---

## 🔧 MAINTENANCE & UPDATES

### Ajout d'une Nouvelle Formation

1. Identifier les coordonnées GPS réelles
2. Ajouter à la section continent appropriée
3. Documenter les espèces typiques
4. Mettre à jour l'index de rotation si nécessaire

### Correction Manuelle

Si un point est mal placé :

1. Noter l'ID de l'item
2. Corriger manuellement dans Webflow
3. Ajouter une exception dans le script pour cet item

---

## 📝 EXEMPLE COMPLET

### Input CMS

```
free-tags: "North America, Late Cretaceous, Albertosaurus, Edmontosaurus"
```

### Processing

1. **Parse** : Continent=North America, Period=Late Cretaceous, Species=Albertosaurus
2. **Match** : Albertosaurus → Alberta Formation (50.5°N, -111.5°W)
3. **Check** : Vérifier distance avec points existants
4. **Offset** : +0.8° lat, -1.2° lon
5. **Final** : 51.3°N, -112.7°W

### Output

```json
{
  "latitude": 51.3,
  "longitude": -112.7,
  "location_name": "Alberta Formation, Canada",
  "confidence": "high"
}
```

---

## ⚠️ RÈGLES CRITIQUES

1. ❌ **JAMAIS** placer 2 points à moins de 3° de distance
2. ✅ **TOUJOURS** vérifier les collisions avant placement final
3. ✅ **TOUJOURS** respecter le continent indiqué
4. ✅ **TOUJOURS** logger chaque placement pour audit
5. ✅ **PRIVILÉGIER** la distribution visuelle harmonieuse

---

**Date de création** : 29 janvier 2026
**Dernière mise à jour** : 29 janvier 2026
**Version** : 1.0
**Auteur** : Prehistoric Domain Team
