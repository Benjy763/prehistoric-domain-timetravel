#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Auto Geocoding Script
 *
 * Ce script analyse tous les items CMS et génère automatiquement
 * des coordonnées lat/lon basées sur les free-tags, en suivant
 * les règles documentées dans COORDINATES_RULES.md
 */

// ============================================
// CONFIGURATION
// ============================================

const SITE_ID = "609e6b701730a329c6f67850";
const COLLECTION_ID = "679d148479ad083f33c518a1";
const WEBFLOW_TOKEN = process.env.WEBFLOW_TOKEN;

const MIN_DISTANCE_DEGREES = 2.5; // Distance minimale entre 2 points
const MAX_OFFSET = 15.0; // Offset maximum en cas de collision (priorité visuelle)
const NORMAL_OFFSET = 1.5; // Offset normal
const MAX_ATTEMPTS = 100; // Tentatives maximales anti-collision

// ============================================
// BASE DE DONNÉES DES FORMATIONS CÉLÈBRES
// ============================================

const FAMOUS_FORMATIONS = {
  // NORTH AMERICA
  "t-rex": { lat: 47.5, lon: -105.5, name: "Hell Creek Formation, Montana" },
  tyrannosaurus: {
    lat: 47.5,
    lon: -105.5,
    name: "Hell Creek Formation, Montana",
  },
  triceratops: {
    lat: 47.5,
    lon: -105.5,
    name: "Hell Creek Formation, Montana",
  },
  edmontosaurus: {
    lat: 50.5,
    lon: -111.5,
    name: "Dinosaur Park Formation, Alberta",
  },
  albertosaurus: {
    lat: 50.5,
    lon: -111.5,
    name: "Dinosaur Park Formation, Alberta",
  },
  diplodocus: { lat: 43.0, lon: -107.5, name: "Morrison Formation, Wyoming" },
  stegosaurus: { lat: 43.0, lon: -107.5, name: "Morrison Formation, Wyoming" },
  allosaurus: { lat: 43.0, lon: -107.5, name: "Morrison Formation, Wyoming" },
  utahraptor: {
    lat: 39.0,
    lon: -109.0,
    name: "Cedar Mountain Formation, Utah",
  },
  coelophysis: { lat: 35.0, lon: -106.0, name: "Chinle Formation, New Mexico" },

  // ASIA
  velociraptor: { lat: 43.5, lon: 104.0, name: "Nemegt Formation, Mongolia" },
  protoceratops: { lat: 43.5, lon: 104.0, name: "Nemegt Formation, Mongolia" },
  tarbosaurus: { lat: 43.5, lon: 104.0, name: "Nemegt Formation, Mongolia" },
  yutyrannus: { lat: 41.5, lon: 121.0, name: "Yixian Formation, China" },
  microraptor: { lat: 41.5, lon: 121.0, name: "Yixian Formation, China" },
  sinornithosaurus: { lat: 41.5, lon: 121.0, name: "Yixian Formation, China" },
  mamenchisaurus: {
    lat: 30.0,
    lon: 104.5,
    name: "Shaximiao Formation, Sichuan",
  },

  // SOUTH AMERICA
  giganotosaurus: {
    lat: -43.0,
    lon: -67.0,
    name: "Cerro Barcino Formation, Patagonia",
  },
  argentinosaurus: {
    lat: -43.0,
    lon: -67.0,
    name: "Cerro Barcino Formation, Patagonia",
  },
  carnotaurus: {
    lat: -43.0,
    lon: -67.0,
    name: "La Colonia Formation, Patagonia",
  },
  herrerasaurus: {
    lat: -33.0,
    lon: -69.0,
    name: "Ischigualasto Formation, Argentina",
  },

  // EUROPE
  iguanodon: { lat: 50.5, lon: -2.5, name: "Purbeck Formation, England" },
  megalosaurus: { lat: 50.5, lon: -2.5, name: "Purbeck Formation, England" },
  archaeopteryx: { lat: 48.8, lon: 11.0, name: "Solnhofen Formation, Germany" },
  compsognathus: { lat: 48.8, lon: 11.0, name: "Solnhofen Formation, Germany" },
  torvosaurus: { lat: 39.2, lon: -9.3, name: "Lourinhã Formation, Portugal" },

  // AFRICA
  spinosaurus: { lat: 31.0, lon: -4.0, name: "Kem Kem Beds, Morocco" },
  carcharodontosaurus: { lat: 31.0, lon: -4.0, name: "Kem Kem Beds, Morocco" },
  majungasaurus: {
    lat: -18.0,
    lon: 46.5,
    name: "Maevarano Formation, Madagascar",
  },

  // AUSTRALIA
  australovenator: {
    lat: -23.0,
    lon: 145.0,
    name: "Winton Formation, Queensland",
  },
  leaellynasaura: { lat: -37.5, lon: 144.0, name: "Dinosaur Cove, Victoria" },
};

// ============================================
// ZONES DE DISTRIBUTION PAR CONTINENT
// ============================================

const CONTINENT_ZONES = {
  "north america": [
    { lat: 47.5, lon: -105.5, name: "Montana" },
    { lat: 43.0, lon: -107.5, name: "Wyoming" },
    { lat: 39.0, lon: -109.0, name: "Utah" },
    { lat: 35.0, lon: -106.0, name: "New Mexico" },
    { lat: 50.5, lon: -111.5, name: "Alberta" },
  ],
  asia: [
    { lat: 43.5, lon: 104.0, name: "Mongolia" },
    { lat: 41.5, lon: 121.0, name: "China (Liaoning)" },
    { lat: 30.0, lon: 104.5, name: "China (Sichuan)" },
    { lat: 48.0, lon: 67.0, name: "Kazakhstan" },
    { lat: 16.0, lon: 102.0, name: "Thailand" },
  ],
  "south america": [
    { lat: -43.0, lon: -67.0, name: "Patagonia" },
    { lat: -15.0, lon: -47.5, name: "Brazil" },
    { lat: -33.0, lon: -69.0, name: "Argentina (Mendoza)" },
    { lat: -38.0, lon: -71.0, name: "Chile" },
    { lat: -32.5, lon: -55.5, name: "Uruguay" },
  ],
  europe: [
    { lat: 50.5, lon: -2.5, name: "England" },
    { lat: 48.8, lon: 11.0, name: "Germany" },
    { lat: 44.0, lon: 4.0, name: "France" },
    { lat: 43.5, lon: -5.0, name: "Spain" },
    { lat: 39.2, lon: -9.3, name: "Portugal" },
  ],
  africa: [
    { lat: 31.0, lon: -4.0, name: "Morocco" },
    { lat: 27.0, lon: 31.0, name: "Egypt" },
    { lat: -32.0, lon: 22.0, name: "South Africa" },
    { lat: 16.0, lon: 8.0, name: "Niger" },
    { lat: -18.0, lon: 46.5, name: "Madagascar" },
  ],
  australia: [
    { lat: -23.0, lon: 145.0, name: "Queensland" },
    { lat: -37.5, lon: 144.0, name: "Victoria" },
    { lat: -26.0, lon: 118.0, name: "Western Australia" },
    { lat: -32.0, lon: 148.0, name: "New South Wales" },
  ],
  india: [
    { lat: 21.0, lon: 78.0, name: "Central India" },
    { lat: 18.0, lon: 74.0, name: "Western Ghats" },
    { lat: 23.0, lon: 82.0, name: "Eastern India" },
    { lat: 13.0, lon: 80.0, name: "Southern India" },
  ],
  "global oceans": [
    { lat: 0.0, lon: -30.0, name: "Atlantic Ocean" },
    { lat: -10.0, lon: 160.0, name: "Pacific Ocean" },
    { lat: -20.0, lon: 60.0, name: "Indian Ocean" },
    { lat: 60.0, lon: -10.0, name: "Arctic Ocean" },
  ],
};

// Index de rotation pour chaque continent
const rotationIndexes = {
  "north america": 0,
  asia: 0,
  "south america": 0,
  europe: 0,
  africa: 0,
  australia: 0,
  india: 0,
  "global oceans": 0,
};

// Stocker tous les points placés
const placedPoints = [];

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Calcule la distance entre 2 points en degrés
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * Vérifie s'il y a collision avec les points existants
 */
function hasCollision(lat, lon, minDistance = MIN_DISTANCE_DEGREES) {
  for (const point of placedPoints) {
    const distance = calculateDistance(lat, lon, point.lat, point.lon);
    if (distance < minDistance) {
      return true;
    }
  }
  return false;
}

/**
 * Génère un offset aléatoire
 */
function randomOffset(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Recherche en spirale pour trouver une position sans collision
 */
function findNonCollidingPosition(baseLat, baseLon) {
  // Essayer d'abord la position de base avec petit offset
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const radius = NORMAL_OFFSET + attempt * 0.5; // Augmenter plus rapidement le rayon
    const angle = attempt * 137.5 * (Math.PI / 180); // Golden angle pour distribution uniforme

    const lat = baseLat + radius * Math.sin(angle);
    const lon = baseLon + radius * Math.cos(angle);

    if (!hasCollision(lat, lon)) {
      return { lat, lon, attempts: attempt + 1 };
    }
  }

  // Dernier recours : position très éloignée aléatoire
  return {
    lat: baseLat + randomOffset(-20, 20),
    lon: baseLon + randomOffset(-20, 20),
    attempts: MAX_ATTEMPTS,
  };
}

/**
 * Extrait la période géologique et son âge en Ma
 */
function extractPeriod(tags) {
  const periods = {
    "late cretaceous": 66,
    "early cretaceous": 125,
    cretaceous: 100,
    "late jurassic": 150,
    "middle jurassic": 170,
    "early jurassic": 190,
    jurassic: 160,
    "late triassic": 210,
    "middle triassic": 235,
    "early triassic": 245,
    triassic: 220,
    permian: 280,
    carboniferous: 320,
    devonian: 380,
    silurian: 410,
    cambrian: 500,
    pleistocene: 1,
    pliocene: 4,
    miocene: 15,
    oligocene: 30,
    eocene: 50,
    paleocene: 60,
  };

  for (const [period, age] of Object.entries(periods)) {
    if (tags.includes(period)) {
      return { period, age };
    }
  }

  return { period: "unknown", age: 0 };
}

/**
 * Parse les free-tags pour extraire continent et espèces
 */
function parseFreeTags(freeTags) {
  if (!freeTags) return { continent: null, species: [], period: null, age: 0 };

  const tags = freeTags.toLowerCase();

  // Détecter le continent
  let continent = null;
  if (tags.includes("north america")) continent = "north america";
  else if (tags.includes("south america")) continent = "south america";
  else if (tags.includes("asia")) continent = "asia";
  else if (tags.includes("europe")) continent = "europe";
  else if (tags.includes("africa") || tags.includes("arica"))
    continent = "africa"; // Gérer typo "arica"
  else if (tags.includes("australia")) continent = "australia";
  else if (tags.includes("india")) continent = "india";
  else if (tags.includes("global ocean")) continent = "global oceans";

  // Extraire les espèces (mots en minuscules de 4+ lettres)
  const species = tags
    .split(",")
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length >= 4 &&
        ![
          "late",
          "early",
          "middle",
          "cretaceous",
          "jurassic",
          "triassic",
        ].includes(s),
    );

  // Extraire la période
  const { period, age } = extractPeriod(tags);

  return { continent, species, period, age };
}

/**
 * Trouve les coordonnées pour un item
 */
function findCoordinates(freeTags, itemId) {
  const { continent, species, period, age } = parseFreeTags(freeTags);

  if (!continent) {
    console.warn(`⚠️  [${itemId}] Continent non détecté dans: "${freeTags}"`);
    return null;
  }

  // Étape 1 : Chercher une formation célèbre
  for (const speciesName of species) {
    if (FAMOUS_FORMATIONS[speciesName]) {
      const formation = FAMOUS_FORMATIONS[speciesName];
      const position = findNonCollidingPosition(formation.lat, formation.lon);

      return {
        lat: Math.round(position.lat * 100) / 100,
        lon: Math.round(position.lon * 100) / 100,
        location: formation.name,
        confidence: "high",
        source: "famous_formation",
        period: period,
        age: age,
        collisionAttempts: position.attempts,
      };
    }
  }

  // Étape 2 : Utiliser zone continentale avec rotation
  const zones = CONTINENT_ZONES[continent];
  if (!zones) {
    console.warn(`⚠️  [${itemId}] Zones non définies pour: ${continent}`);
    return null;
  }

  const index = rotationIndexes[continent];
  const zone = zones[index];

  // Incrémenter l'index pour le prochain item
  rotationIndexes[continent] = (index + 1) % zones.length;

  const position = findNonCollidingPosition(zone.lat, zone.lon);

  return {
    lat: Math.round(position.lat * 100) / 100,
    lon: Math.round(position.lon * 100) / 100,
    location: `${zone.name}, ${continent}`,
    confidence: "medium",
    source: "continent_zone",
    period: period,
    age: age,
    collisionAttempts: position.attempts,
  };
}

function resetGeocodeState() {
  placedPoints.length = 0;
  Object.keys(rotationIndexes).forEach((key) => {
    rotationIndexes[key] = 0;
  });
}

async function fetchAllItems({ log = true } = {}) {
  if (!WEBFLOW_TOKEN) {
    throw new Error(
      "WEBFLOW_TOKEN manquant. Définis la variable d'environnement.",
    );
  }

  if (log) {
    console.log("📋 Récupération des items CMS...\n");
  }

  let allItems = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items?offset=${offset}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${WEBFLOW_TOKEN}`,
          accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = data.items || [];
    allItems = allItems.concat(items);

    if (log) {
      console.log(`   Chargé ${allItems.length} items...`);
    }

    hasMore = items.length === 100;
    offset += 100;
  }

  if (log) {
    console.log(`\n✅ ${allItems.length} items trouvés au total\n`);
  }

  return allItems;
}

function geocodeItems(allItems, { log = true } = {}) {
  resetGeocodeState();

  if (log) {
    console.log("🔍 Analyse et génération des coordonnées...\n");
    console.log("─".repeat(80));
  }

  const results = [];

  for (const item of allItems) {
    const freeTags = item.fieldData["free-tags"];
    const name = item.fieldData.name;

    if (!freeTags) {
      if (log) {
        console.log(`⏭️  [${name}] Pas de free-tags - ignoré`);
      }
      continue;
    }

    const coords = findCoordinates(freeTags, item.id);

    if (coords) {
      placedPoints.push({ lat: coords.lat, lon: coords.lon, id: item.id });

      const nearestDistance =
        placedPoints.length > 1
          ? Math.min(
              ...placedPoints
                .slice(0, -1)
                .map((p) =>
                  calculateDistance(coords.lat, coords.lon, p.lat, p.lon),
                ),
            )
          : null;

      if (log) {
        console.log(`✅ [${name}]`);
        console.log(`   Tags: ${freeTags}`);
        console.log(`   → ${coords.location}`);
        console.log(
          `   → Coordonnées: ${coords.lat}°, ${coords.lon}° (moderne)`,
        );
        console.log(`   → Période: ${coords.period} (~${coords.age} Ma)`);
        console.log(`   → Confiance: ${coords.confidence}`);
        if (nearestDistance) {
          console.log(
            `   → Distance au plus proche: ${nearestDistance.toFixed(1)}° ${nearestDistance >= MIN_DISTANCE_DEGREES ? "✓" : "⚠️"}`,
          );
        }
        if (coords.collisionAttempts > 1) {
          console.log(
            `   → Tentatives anti-collision: ${coords.collisionAttempts}`,
          );
        }
        console.log("");
      }

      results.push({
        id: item.id,
        name,
        freeTags,
        latitude: coords.lat,
        longitude: coords.lon,
        location: coords.location,
        confidence: coords.confidence,
        period: coords.period,
        age: coords.age,
        collisionAttempts: coords.collisionAttempts,
      });
    } else if (log) {
      console.log(`❌ [${name}] Impossible de déterminer les coordonnées`);
      console.log(`   Tags: ${freeTags}\n`);
    }
  }

  if (log) {
    console.log("─".repeat(80));
    console.log(`\n📊 Résumé:`);
    console.log(`   Total items: ${allItems.length}`);
    console.log(`   Géocodés: ${results.length}`);
    console.log(`   Ignorés: ${allItems.length - results.length}`);
    console.log(
      `   Haute confiance: ${results.filter((r) => r.confidence === "high").length}`,
    );
    console.log(
      `   Confiance moyenne: ${results.filter((r) => r.confidence === "medium").length}`,
    );

    const collisions = results.filter((r) => {
      const nearest = placedPoints
        .filter((p) => p.id !== r.id)
        .map((p) => calculateDistance(r.latitude, r.longitude, p.lat, p.lon));
      return nearest.length > 0 && Math.min(...nearest) < MIN_DISTANCE_DEGREES;
    }).length;
    console.log(
      `   ⚠️  Collisions (< ${MIN_DISTANCE_DEGREES}°): ${collisions}`,
    );
  }

  return results;
}

async function fetchGeocodedItems({ writeFile = false, log = true } = {}) {
  const allItems = await fetchAllItems({ log });
  const results = geocodeItems(allItems, { log });

  if (writeFile) {
    const fs = await import("fs");
    fs.writeFileSync(
      "geocoding-results.json",
      JSON.stringify(results, null, 2),
    );
    if (log) {
      console.log(`\n💾 Résultats sauvegardés dans: geocoding-results.json`);
    }
  }

  if (log) {
    console.log(`\n✨ Terminé!\n`);
  }

  return results;
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

async function main() {
  console.log("\n🌍 PREHISTORIC DOMAIN - Auto Geocoding\n");

  try {
    await fetchGeocodedItems({ writeFile: true, log: true });
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  fetchGeocodedItems,
  fetchAllItems,
  geocodeItems,
};
