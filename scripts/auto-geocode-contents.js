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

const fs = require("fs");
const path = require("path");

const SITE_ID = "609e6b701730a329c6f67850";
const COLLECTION_ID = "679d148479ad083f33c518a1";

function readToken() {
  if (process.env.WEBFLOW_TOKEN) return process.env.WEBFLOW_TOKEN;

  const mcpPath = path.resolve(__dirname, "../.vscode/mcp.json");
  if (!fs.existsSync(mcpPath)) return null;

  const raw = fs.readFileSync(mcpPath, "utf8");
  const match = raw.match(/"WEBFLOW_TOKEN"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

const WEBFLOW_TOKEN = readToken();

const CATEGORY_MAP = {
  "417c5eb49ea7a0509255526b460af1e6": "videos",
  "3a0cdd4419856a1d01b35ff4681be638": "3d",
  "224a8ccce14158309d6df3052fa7f1e1": "images",
  "5b90531d7e27d60e0d1f4e226449b55e": "texts",
};

const GEOLOGICAL_PERIOD_MAP = {
  "9f54dda51296c0490e039fe1533eca66": "today",
  "5394446518cb0974d384bfe2ab73fb16": "quaternary",
  "62e83820d1690b06d3be9667ade04a78": "neogene",
  "507bbf4ed541009921b33a95bb2cfb69": "paleogene",
  "4e39033d83b30b505bb4c90e342dd596": "cretaceous",
  "690d38c55e87859a90059f87e5803c9e": "jurassic",
  "3e8d8939bfd52f7fa3ce13bb6fcbffb3": "triassic",
  f3e16047f64a12d4824314badfc168a2: "permian",
  "533e85b7f1b3b58d6ebfff5540af3f2c": "carboniferous",
  "1f640518ea2f2905ae9e818010b9c3f6": "devonian",
  "927ffc97d1dec789edc8062baa88b5a1": "silurian",
  "7935a60cb719155a2d225b59569b5699": "ordovician",
  f44a29ca025a2b23e3c47810ec7621a1: "cambrian",
};

const MIN_DISTANCE_DEGREES = 2.5; // Distance minimale entre 2 points
const MAX_OFFSET = 15.0; // Offset maximum en cas de collision (priorité visuelle)
const NORMAL_OFFSET = 1.5; // Offset normal
const MAX_ATTEMPTS = 100; // Tentatives maximales anti-collision

// ============================================
// CHARGEMENT DES FORMATIONS CÉLÈBRES
// ============================================

function loadFamousFormations() {
  const formationsPath = path.join(
    __dirname,
    "../assets/data/famous-formations.json",
  );

  if (!fs.existsSync(formationsPath)) {
    console.warn("⚠️  Fichier famous-formations.json introuvable");
    return {};
  }

  const data = JSON.parse(fs.readFileSync(formationsPath, "utf8"));
  const formations = {};

  // Convertir structure JSON en format utilisable
  for (const [continent, formationsList] of Object.entries(data.formations)) {
    for (const formation of formationsList) {
      for (const species of formation.species) {
        formations[species] = {
          lat: formation.lat,
          lon: formation.lon,
          name: formation.name,
        };
      }
    }
  }

  return formations;
}

const FAMOUS_FORMATIONS = loadFamousFormations();

// ============================================
// RECHERCHE PALEOBIOLOGY DATABASE
// ============================================

/**
 * Ajoute une nouvelle formation au fichier famous-formations.json
 */
async function addFormationToJSON(speciesName, pbdbData, continent, period) {
  const formationsPath = path.resolve(
    __dirname,
    "../assets/data/famous-formations.json",
  );

  // Mapper continent vers clé JSON
  const continentMap = {
    "north america": "northAmerica",
    "south america": "southAmerica",
    europe: "europe",
    africa: "africa",
    asia: "asia",
    australia: "australia",
  };

  const continentKey = continentMap[continent.toLowerCase()];
  if (!continentKey) {
    console.warn(
      `⚠️  Continent "${continent}" non mappé, formation non ajoutée`,
    );
    return false;
  }

  try {
    // Lire le fichier JSON
    const data = JSON.parse(fs.readFileSync(formationsPath, "utf8"));

    // Vérifier si la formation existe déjà
    const existingFormation = data.formations[continentKey]?.find(
      (f) => f.name === pbdbData.formation,
    );

    if (existingFormation) {
      // Ajouter l'espèce si elle n'existe pas déjà
      const speciesNormalized = speciesName.toLowerCase();
      if (!existingFormation.species.includes(speciesNormalized)) {
        existingFormation.species.push(speciesNormalized);
        console.log(
          `   ✏️  Espèce "${speciesName}" ajoutée à formation existante "${pbdbData.formation}"`,
        );
      } else {
        return false; // Déjà présent
      }
    } else {
      // Créer une nouvelle formation
      const newFormation = {
        species: [speciesName.toLowerCase()],
        lat: pbdbData.lat,
        lon: pbdbData.lng,
        name: pbdbData.formation,
        age: null, // PBDB ne fournit pas toujours l'âge numérique
        period: pbdbData.period || period,
        description: `Auto-découvert via Paleobiology Database (${pbdbData.country || "N/A"})`,
        source: "https://paleobiodb.org (auto-enrichment)",
      };

      if (!data.formations[continentKey]) {
        data.formations[continentKey] = [];
      }

      data.formations[continentKey].push(newFormation);
      console.log(
        `   ✨ Nouvelle formation ajoutée: "${pbdbData.formation}" avec "${speciesName}"`,
      );
    }

    // Mettre à jour metadata.lastUpdated
    const now = new Date();
    data.metadata.lastUpdated = now.toISOString().split("T")[0];

    // Sauvegarder le fichier
    fs.writeFileSync(formationsPath, JSON.stringify(data, null, 2), "utf8");

    // Recharger FAMOUS_FORMATIONS en mémoire
    Object.assign(FAMOUS_FORMATIONS, loadFamousFormations());

    return true;
  } catch (error) {
    console.error(
      `❌ Erreur lors de l'ajout de la formation: ${error.message}`,
    );
    return false;
  }
}

/**
 * Recherche dans la Paleobiology Database pour trouver
 * formation et coordonnées d'une espèce
 */
async function searchPaleobioDB(genus) {
  const url = `https://paleobiodb.org/data1.2/occs/list.json?base_name=${encodeURIComponent(genus)}&show=coords,loc,stratext&limit=10`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return null;
    }

    // Trouver la meilleure occurrence avec coordonnées et formation
    const best =
      data.records.find((r) => r.lng && r.lat && r.formation) ||
      data.records.find((r) => r.lng && r.lat);

    if (!best) {
      return null;
    }

    console.log(
      `   🔬 PBDB: ${best.formation || "Formation inconnue"} (${best.cc || "N/A"})`,
    );

    return {
      formation: best.formation,
      lat: parseFloat(best.lat),
      lng: parseFloat(best.lng),
      country: best.cc,
      state: best.state,
      period: best.early_interval || best.late_interval,
      source: "paleobiodb",
    };
  } catch (error) {
    // Erreur silencieuse, fallback sur méthodes existantes
    return null;
  }
}

// ============================================
// LEGACY: Formations en dur (fallback)
// ============================================

const LEGACY_FORMATIONS = {
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
  pteranodon: { lat: 38.5, lon: -100.5, name: "Niobrara Formation, Kansas" },
  quetzalcoatlus: {
    lat: 29.5,
    lon: -103.5,
    name: "Javelina Formation, Texas",
  },

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
    lat: -39.5,
    lon: -69.5,
    name: "Candeleros Formation, Patagonia",
  },
  argentinosaurus: {
    lat: -40.0,
    lon: -69.0,
    name: "Huincul Formation, Patagonia",
  },
  carnotaurus: {
    lat: -45.0,
    lon: -67.5,
    name: "La Colonia Formation, Patagonia",
  },
  herrerasaurus: {
    lat: -30.0,
    lon: -68.0,
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
 * Génère une position aléatoire dans les limites d'un continent
 */
function getRandomPositionInContinent(continent) {
  // Points de référence centraux sur terre pour chaque continent
  // Ces points sont garantis d'être sur terre
  const centralPoints = {
    "north america": [
      { lat: 40, lon: -100 }, // USA central
      { lat: 35, lon: -110 }, // Southwest USA
      { lat: 50, lon: -105 }, // Canada
      { lat: 30, lon: -95 }, // Texas
      { lat: 45, lon: -90 }, // Great Lakes
    ],
    asia: [
      { lat: 35, lon: 105 }, // China central
      { lat: 50, lon: 100 }, // Mongolia
      { lat: 25, lon: 80 }, // India
      { lat: 60, lon: 90 }, // Siberia
      { lat: 40, lon: 45 }, // Middle East
    ],
    "south america": [
      { lat: -10, lon: -55 }, // Brazil central
      { lat: -40, lon: -68 }, // Patagonia (inland)
      { lat: -5, lon: -62 }, // Amazon
      { lat: -23, lon: -50 }, // Southeast Brazil (more inland)
      { lat: 0, lon: -75 }, // Colombia/Ecuador
      { lat: -15, lon: -70 }, // Peru/Bolivia
    ],
    europe: [
      { lat: 50, lon: 10 }, // Germany/Poland
      { lat: 45, lon: 25 }, // Romania
      { lat: 55, lon: 35 }, // Russia west
      { lat: 40, lon: -5 }, // Spain
      { lat: 60, lon: 15 }, // Scandinavia
    ],
    africa: [
      { lat: 0, lon: 25 }, // Congo
      { lat: -20, lon: 25 }, // Southern Africa
      { lat: 10, lon: 10 }, // West Africa
      { lat: 30, lon: 30 }, // Egypt
      { lat: -10, lon: 35 }, // East Africa
    ],
    australia: [
      { lat: -25, lon: 135 }, // Central Australia
      { lat: -35, lon: 145 }, // Southeast
      { lat: -20, lon: 125 }, // Western Australia
    ],
    india: [
      { lat: 22, lon: 80 }, // Central India
      { lat: 28, lon: 77 }, // North India
      { lat: 15, lon: 75 }, // South India
    ],
    "global oceans": [
      { lat: 0, lon: -160 }, // Pacific
      { lat: 0, lon: -30 }, // Atlantic
      { lat: -45, lon: 140 }, // Southern Ocean
    ],
  };

  const points = centralPoints[continent];
  if (!points) return null;

  // Choisir un point aléatoire parmi les références
  const basePoint = points[Math.floor(Math.random() * points.length)];

  // Ajouter une petite variation autour du point (±5° max)
  const lat = basePoint.lat + (Math.random() - 0.5) * 10;
  const lon = basePoint.lon + (Math.random() - 0.5) * 10;

  return { lat, lon };
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
async function findCoordinates(freeTags, itemId) {
  let { continent, species, period, age } = parseFreeTags(freeTags);

  // Si aucun continent détecté, c'est un item océanique global
  if (!continent) {
    console.warn(
      `⚠️  [${itemId}] Continent non détecté, placement océanique global`,
    );
    continent = "global oceans";
  }

  // Étape 1 : Chercher une formation célèbre
  let matchedFormation = null;
  let unmatchedSpecies = [];

  for (const speciesName of species) {
    // Normaliser le nom : enlever espaces, tirets, points
    const normalized = speciesName.replace(/[\s\-\.]/g, "").toLowerCase();

    // Chercher dans FAMOUS_FORMATIONS avec correspondance flexible
    let foundKey = null;
    for (const key of Object.keys(FAMOUS_FORMATIONS)) {
      const keyNormalized = key.replace(/[\s\-\.]/g, "").toLowerCase();
      if (
        normalized.includes(keyNormalized) ||
        keyNormalized.includes(normalized)
      ) {
        foundKey = key;
        break;
      }
    }

    if (foundKey) {
      matchedFormation = {
        key: foundKey,
        data: FAMOUS_FORMATIONS[foundKey],
      };
      break;
    } else {
      unmatchedSpecies.push(speciesName);
    }
  }

  // Si une formation a été trouvée, l'utiliser
  if (matchedFormation) {
    const formation = matchedFormation.data;
    const position = findNonCollidingPosition(formation.lat, formation.lon);

    // Suggérer d'ajouter les espèces non trouvées à la même formation
    if (unmatchedSpecies.length > 0 && species.length > 1) {
      console.log(
        `💡 Suggestion: Ajouter "${unmatchedSpecies.join(", ")}" à "${formation.name}" dans famous-formations.json`,
      );
    }

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

  // Si aucune formation trouvée mais qu'on a des espèces, chercher dans PBDB
  if (unmatchedSpecies.length > 0) {
    for (const speciesName of unmatchedSpecies) {
      console.log(
        `🔍 Recherche Paleobiology Database pour "${speciesName}"...`,
      );
      const pbdbData = await searchPaleobioDB(speciesName);

      if (pbdbData && pbdbData.lat && pbdbData.lng) {
        const position = findNonCollidingPosition(pbdbData.lat, pbdbData.lng);

        // Si formation complète trouvée, enrichir le JSON automatiquement
        if (pbdbData.formation && continent) {
          const added = await addFormationToJSON(
            speciesName,
            pbdbData,
            continent,
            period,
          );
          if (added) {
            console.log(
              `   📝 Formation "${pbdbData.formation}" enrichie dans famous-formations.json`,
            );
          }
        } else if (!pbdbData.formation) {
          console.log(
            `   ⚠️  Pas de formation, utilisation des coordonnées seulement (${pbdbData.lat}, ${pbdbData.lng})`,
          );
        }

        return {
          lat: Math.round(position.lat * 100) / 100,
          lon: Math.round(position.lon * 100) / 100,
          location:
            pbdbData.formation || `${pbdbData.country || "Unknown"} (PBDB)`,
          confidence: pbdbData.formation ? "high" : "medium",
          source: "paleobiodb_auto",
          period: period,
          age: age,
          collisionAttempts: position.attempts,
        };
      }
    }

    // Si PBDB n'a rien trouvé non plus
    if (continent && period) {
      console.log(
        `⚠️  Espèce(s) "${unmatchedSpecies.join(", ")}" introuvable dans PBDB - Placement aléatoire sur ${continent}`,
      );
    }
  }

  // Étape 2 : Essayer placement aléatoire sur le continent (50 tentatives)
  for (let attempt = 0; attempt < 50; attempt++) {
    const randomPos = getRandomPositionInContinent(continent);
    if (randomPos && !hasCollision(randomPos.lat, randomPos.lon)) {
      const position = findNonCollidingPosition(randomPos.lat, randomPos.lon);
      return {
        lat: Math.round(position.lat * 100) / 100,
        lon: Math.round(position.lon * 100) / 100,
        location: `${continent}`,
        confidence: "medium",
        source: "random_continent",
        period: period,
        age: age,
        collisionAttempts: position.attempts,
      };
    }
  }

  // Étape 3 : Fallback - Utiliser zone continentale prédéfinie avec rotation
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
    source: "continent_zone_fallback",
    period: period,
    age: age,
    collisionAttempts: position.attempts,
  };
}

/**
 * Réinitialise l'état du géocodage
 */
function resetGeocodeState() {
  placedPoints.length = 0;
  Object.keys(rotationIndexes).forEach((key) => {
    rotationIndexes[key] = 0;
  });
}

/**
 * Récupère tous les items de la collection
 */
async function fetchAllItems({ log = true } = {}) {
  let allItems = [];
  let offset = 0;
  let hasMore = true;

  if (log) {
    console.log("📥 Récupération des items depuis le CMS...");
  }

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

async function geocodeItems(allItems, { log = true } = {}) {
  resetGeocodeState();

  if (log) {
    console.log("🔍 Analyse et génération des coordonnées...\n");
    console.log("─".repeat(80));
  }

  const results = [];

  for (const item of allItems) {
    const freeTags = item.fieldData["free-tags"];
    const name = item.fieldData.name;
    const slug = item.fieldData.slug;
    const description = item.fieldData.description;
    const creditsLine = item.fieldData["credits-line"];
    const creatorLink = item.fieldData["creator-link"];
    const topCategory = item.fieldData["top-category"];
    const category = CATEGORY_MAP[topCategory] || null;
    const isNew = !!item.fieldData.new;
    const displayOnAppField = item.fieldData["display-on-app"];
    const displayOnApp =
      typeof displayOnAppField === "boolean"
        ? displayOnAppField
        : Boolean((freeTags || "").trim());
    const geologicalPeriodRaw = item.fieldData["geological-period"];
    let geologicalPeriod =
      GEOLOGICAL_PERIOD_MAP[geologicalPeriodRaw] || geologicalPeriodRaw || null;

    // If no geological period set, infer from free-tags (period keywords)
    if (!geologicalPeriod && freeTags) {
      const periodMap = {
        "quaternary|holocene|pleistocene": "quaternary",
        "neogene|miocene|pliocene": "neogene",
        "paleogene|eocene|oligocene|paleocene": "paleogene",
        cretaceous: "cretaceous",
        jurassic: "jurassic",
        triassic: "triassic",
        permian: "permian",
        carboniferous: "carboniferous",
        devonian: "devonian",
        silurian: "silurian",
        ordovician: "ordovician",
        cambrian: "cambrian",
      };

      const tagLower = freeTags.toLowerCase();
      for (const [keywords, period] of Object.entries(periodMap)) {
        const keywordList = keywords.split("|");
        if (keywordList.some((kw) => tagLower.includes(kw))) {
          geologicalPeriod = period;
          break;
        }
      }
    }

    const contentLink = item.fieldData["content-link"];
    const youtubeId = item.fieldData["youtube-video-id"];
    const backgroundImage = item.fieldData.background?.url || null;
    const galleryImage =
      item.fieldData["gallery-low-quality-image"]?.url || null;

    if (!freeTags) {
      if (log) {
        console.log(`⏭️  [${name}] Pas de free-tags - ignoré`);
      }
      continue;
    }

    const coords = await findCoordinates(freeTags, item.id);

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
        slug,
        description,
        creditsLine,
        creatorLink,
        category,
        isNew,
        displayOnApp,
        geologicalPeriod,
        contentLink,
        youtubeId,
        backgroundImage,
        galleryImage,
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

async function fetchGeocodedItems({
  writeFile = false,
  log = true,
  limit = null,
} = {}) {
  const allItems = await fetchAllItems({ log });
  let itemsToProcess = allItems;

  // Appliquer la limite si spécifiée
  if (limit && allItems.length > limit) {
    if (log) {
      console.log(
        `⚠️  Limitation à ${limit} items sur ${allItems.length} trouvés\n`,
      );
    }
    itemsToProcess = allItems.slice(0, limit);
  }

  const results = await geocodeItems(itemsToProcess, { log });

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

  // Parse --limit=N
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

  if (limit) {
    console.log(`⚙️  Mode test: limite à ${limit} items\n`);
  }

  try {
    await fetchGeocodedItems({ writeFile: true, log: true, limit });
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
