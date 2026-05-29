#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Import et Géocodage Moderne
 *
 * RÔLE : Récupère les items depuis Webflow CMS et calcule leurs coordonnées géographiques ACTUELLES
 *
 * ÉTAPES :
 * 1. Récupère tous les items depuis Webflow CMS (API)
 * 2. Extrait métadatas : name, slug, category, youtubeId, freeTags, geologicalPeriod, etc.
 * 3. Parse les free-tags → espèces + période géologique
 * 4. Géocode → coordonnées géographiques MODERNES via PBDB (latitude/longitude actuelles)
 * 5. Si PBDB échoue → item ignoré (pas de fallback local)
 *
 * SOURCES DE GÉOCODAGE :
 *   - PBDB API uniquement (aucune donnée locale)
 *   - Items marins → placement direct en océan (pas de PBDB)
 *
 * OUTPUT : geocoded-items.json
 *   → Items CMS complets avec coordonnées modernes
 */

// ============================================
// CONFIGURATION
// ============================================

const fs = require("fs");
const path = require("path");

// Load manual coordinate fixes
const COORDINATE_FIXES = JSON.parse(
  fs.readFileSync(path.join(__dirname, "manual-coordinate-fixes.json"), "utf8"),
);

// Land validation (modern coastlines)
const { isPointOnLand } = require("./paleo-reconstruction.js");

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

const MIN_DISTANCE_DEGREES = 0.3; // Minimum distance between pins (~33 km, visually distinct on globe)
const MAX_COLLISION_ATTEMPTS = 200; // Avoid extremely long collision spirals
const PBDB_FETCH_TIMEOUT_MS = 3000; // Fail PBDB requests after 3 seconds (reduced to speed failures)

// Common/informal names → latin genus for PBDB lookup
const COMMON_NAME_MAP = {
  "woolly mammoth": "mammuthus primigenius",
  mammoth: "mammuthus",
  "dire wolf": "aenocyon dirus",
  "terror bird": "phorusrhacos",
  phorusrhacids: "phorusrhacos",
  "golden eagle": null, // not in PBDB, skip
  troodontid: "troodon",
  utahraptors: "utahraptor",
  crinoids: "crinoidea",
  "predator x": "pliosaurus", // Predator X = Pliosaurus funkei
  // Spinosaurus: all content is North African, aegyptiacus is the primary species.
  // The identity entry for aegyptiacus fires first (longer key) so already-correct tags are protected.
  // Identity entries fire first (longer keys) to protect already-correct species names.
  "spinosaurus aegyptiacus": "Spinosaurus aegyptiacus",
  "spinosaurus mirabilis": "Spinosaurus mirabilis",
  spinosaurus: "Spinosaurus aegyptiacus",

  // Tyrannosaurus: T. rex is the canonical North American species.
  "tyrannosaurus rex": "Tyrannosaurus rex",
  tyrannosaurus: "Tyrannosaurus rex",

  // Triceratops: both species North American, horridus is most common.
  "triceratops horridus": "Triceratops horridus",
  "triceratops prorsus": "Triceratops prorsus",
  triceratops: "Triceratops horridus",

  // Edmontosaurus: annectens is most documented (Hell Creek).
  "edmontosaurus annectens": "Edmontosaurus annectens",
  "edmontosaurus regalis": "Edmontosaurus regalis",
  edmontosaurus: "Edmontosaurus annectens",

  // Dilophosaurus: single known species.
  "dilophosaurus wetherilli": "Dilophosaurus wetherilli",
  dilophosaurus: "Dilophosaurus wetherilli",

  // Pachyrhinosaurus: lakustai most documented.
  "pachyrhinosaurus lakustai": "Pachyrhinosaurus lakustai",
  pachyrhinosaurus: "Pachyrhinosaurus lakustai",

  // Dimetrodon: grandis most documented North American.
  "dimetrodon grandis": "Dimetrodon grandis",
  dimetrodon: "Dimetrodon grandis",

  // Diplodocus: carnegii is the type species.
  "diplodocus carnegii": "Diplodocus carnegii",
  diplodocus: "Diplodocus carnegii",

  // Giganotosaurus: single known species.
  "giganotosaurus carolinii": "Giganotosaurus carolinii",
  giganotosaurus: "Giganotosaurus carolinii",

  // Ankylosaurus: single known species.
  "ankylosaurus magniventris": "Ankylosaurus magniventris",
  ankylosaurus: "Ankylosaurus magniventris",

  // Yutyrannus: single known species.
  "yutyrannus huali": "Yutyrannus huali",
  yutyrannus: "Yutyrannus huali",

  // Suchomimus: single known species.
  "suchomimus tenerensis": "Suchomimus tenerensis",
  suchomimus: "Suchomimus tenerensis",

  // Iguanodon: bernissartensis is the type species (Europe).
  "iguanodon bernissartensis": "Iguanodon bernissartensis",
  iguanodon: "Iguanodon bernissartensis",

  // Styracosaurus: single known species.
  "styracosaurus albertensis": "Styracosaurus albertensis",
  styracosaurus: "Styracosaurus albertensis",

  // Ceratosaurus: nasicornis is the type species.
  "ceratosaurus nasicornis": "Ceratosaurus nasicornis",
  ceratosaurus: "Ceratosaurus nasicornis",

  // Mapusaurus: single known species.
  "mapusaurus roseae": "Mapusaurus roseae",
  mapusaurus: "Mapusaurus roseae",

  // Majungasaurus: single known species (Madagascar).
  "majungasaurus crenatissimus": "Majungasaurus crenatissimus",
  majungasaurus: "Majungasaurus crenatissimus",

  // Kronosaurus: single known species (Australia/South America).
  "kronosaurus queenslandicus": "Kronosaurus queenslandicus",
  kronosaurus: "Kronosaurus queenslandicus",

  // Dunkleosteus: terrelli is the most documented species.
  "dunkleosteus terrelli": "Dunkleosteus terrelli",
  dunkleosteus: "Dunkleosteus terrelli",

  // Homotherium: species differ by continent — protect existing species, no default.
  "homotherium serum": "Homotherium serum",
  "homotherium latidens": "Homotherium latidens",

  // Smilodon: species differ by continent — protect existing species, no default.
  "smilodon fatalis": "Smilodon fatalis",
  "smilodon populator": "Smilodon populator",
};

// Bounding boxes for continent filtering of PBDB results
const CONTINENT_BOUNDS = {
  "north america": { latMin: 10, latMax: 85, lonMin: -170, lonMax: -50 },
  "south america": { latMin: -60, latMax: 15, lonMin: -85, lonMax: -30 },
  europe: { latMin: 35, latMax: 75, lonMin: -15, lonMax: 60 },
  asia: { latMin: 0, latMax: 75, lonMin: 60, lonMax: 180 },
  africa: { latMin: -40, latMax: 40, lonMin: -20, lonMax: 55 },
  australia: { latMin: -50, latMax: -10, lonMin: 110, lonMax: 180 },
  india: { latMin: 5, latMax: 40, lonMin: 65, lonMax: 100 },
  eurasia: { latMin: 0, latMax: 85, lonMin: -15, lonMax: 180 },
  "central asia": { latMin: 25, latMax: 55, lonMin: 50, lonMax: 110 },
  "north africa": { latMin: 15, latMax: 40, lonMin: -20, lonMax: 40 },
};

// Fallback center coordinates for each continent
const CONTINENT_CENTERS = {
  "north america": { lat: 45, lon: -100 },
  "south america": { lat: -15, lon: -60 },
  europe: { lat: 50, lon: 15 },
  asia: { lat: 40, lon: 100 },
  africa: { lat: 5, lon: 25 },
  australia: { lat: -25, lon: 135 },
  india: { lat: 20, lon: 78 },
  eurasia: { lat: 50, lon: 60 },
  "central asia": { lat: 42, lon: 75 },
  "north africa": { lat: 28, lon: 10 },
};

// Cache en mémoire pour éviter appels PBDB redondants
const PBDB_CACHE = new Map();
let PBDB_CACHE_HITS = 0;
let PBDB_CACHE_MISSES = 0;
const PBDB_STATS = {
  apiCalls: 0,
  apiOk: 0,
  noRecords: 0,
  noCoords: 0,
  errors: 0,
};

// Stocker tous les points placés
const placedPoints = [];

// ============================================
// RECHERCHE PALEOBIOLOGY DATABASE
// ============================================

/**
 * Search PBDB and return ALL occurrences with coordinates (not just the best).
 * Used for multi-species aggregation with continent filtering and median.
 */
async function searchPaleoBioDBAll(genus) {
  const cacheKey = `all_${genus.toLowerCase().trim()}`;
  if (PBDB_CACHE.has(cacheKey)) {
    PBDB_CACHE_HITS++;
    return PBDB_CACHE.get(cacheKey);
  }

  PBDB_CACHE_MISSES++;
  PBDB_STATS.apiCalls++;
  const url = `https://paleobiodb.org/data1.2/occs/list.json?base_name=${encodeURIComponent(genus)}&show=coords,loc,stratext&limit=50`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PBDB_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();

      if (!data.records || data.records.length === 0) {
        PBDB_STATS.noRecords++;
        PBDB_CACHE.set(cacheKey, []);
        return [];
      }

      const records = data.records
        .filter((r) => r.lat && r.lng)
        .map((r) => ({
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lng),
          formation: r.formation,
          country: r.cc,
          state: r.state,
          period: r.early_interval || r.late_interval,
        }));

      if (records.length === 0) {
        PBDB_STATS.noCoords++;
      } else {
        PBDB_STATS.apiOk++;
      }

      PBDB_CACHE.set(cacheKey, records);
      return records;
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn(
          `⚠️  PBDB request timeout (${PBDB_FETCH_TIMEOUT_MS}ms) for ${genus}`,
        );
      } else {
        PBDB_STATS.errors++;
      }
      PBDB_CACHE.set(cacheKey, []);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    PBDB_STATS.errors++;
    PBDB_CACHE.set(cacheKey, []);
    return [];
  }
}

/**
 * Check if a coordinate falls within a continent's bounding box
 */
function isInContinent(lat, lng, continent) {
  const bounds = CONTINENT_BOUNDS[continent];
  if (!bounds) return true; // Unknown continent → accept all
  return (
    lat >= bounds.latMin &&
    lat <= bounds.latMax &&
    lng >= bounds.lonMin &&
    lng <= bounds.lonMax
  );
}

/**
 * Compute the median of a numeric array
 */
function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function findBestSpatialCluster(records) {
  if (!records || records.length === 0) return null;

  const MAX_CLUSTER_DISTANCE = 0.6; // ~66 km maximum for a local cluster
  const used = new Array(records.length).fill(false);
  const adjacency = records.map((record, index) => {
    const neighbors = [];
    for (let j = 0; j < records.length; j++) {
      if (j === index) continue;
      if (
        calculateDistance(
          record.lat,
          record.lng,
          records[j].lat,
          records[j].lng,
        ) <= MAX_CLUSTER_DISTANCE
      ) {
        neighbors.push(j);
      }
    }
    return neighbors;
  });

  const clusters = [];
  for (let i = 0; i < records.length; i++) {
    if (used[i]) continue;
    const stack = [i];
    const component = [];
    used[i] = true;

    while (stack.length > 0) {
      const idx = stack.pop();
      component.push(records[idx]);
      for (const neighbor of adjacency[idx]) {
        if (!used[neighbor]) {
          used[neighbor] = true;
          stack.push(neighbor);
        }
      }
    }

    if (component.length >= 2) {
      clusters.push(component);
    }
  }

  if (clusters.length === 0) return null;

  const scored = clusters.map((cluster) => {
    let totalDistance = 0;
    let pairCount = 0;
    let maxDistance = 0;
    for (let a = 0; a < cluster.length; a++) {
      for (let b = a + 1; b < cluster.length; b++) {
        const d = calculateDistance(
          cluster[a].lat,
          cluster[a].lng,
          cluster[b].lat,
          cluster[b].lng,
        );
        totalDistance += d;
        pairCount += 1;
        if (d > maxDistance) maxDistance = d;
      }
    }

    return {
      cluster,
      avgDistance: pairCount > 0 ? totalDistance / pairCount : 0,
      maxDistance,
      size: cluster.length,
      formation: cluster[0].formation || null,
    };
  });

  scored.sort((a, b) => {
    if (a.avgDistance !== b.avgDistance) return a.avgDistance - b.avgDistance;
    if (a.size !== b.size) return a.size - b.size;
    return a.maxDistance - b.maxDistance;
  });

  return { cluster: scored[0].cluster, label: scored[0].formation };
}

function findClusterMedoid(records) {
  if (!records || records.length === 0) return null;
  if (records.length === 1) return { lat: records[0].lat, lon: records[0].lng };

  let bestRecord = records[0];
  let bestCost = Infinity;

  for (const candidate of records) {
    let totalCost = 0;
    for (const other of records) {
      if (candidate === other) continue;
      totalCost += calculateDistance(
        candidate.lat,
        candidate.lng,
        other.lat,
        other.lng,
      );
    }
    if (totalCost < bestCost) {
      bestCost = totalCost;
      bestRecord = candidate;
    }
  }

  return { lat: bestRecord.lat, lon: bestRecord.lng };
}

function selectBestPbdbCluster(records) {
  if (!records || records.length === 0)
    return { cluster: records, label: null };

  const spatialCluster = findBestSpatialCluster(records);
  if (spatialCluster && spatialCluster.cluster.length >= 2) {
    return { cluster: spatialCluster.cluster, label: spatialCluster.label };
  }

  // Prefer the largest formation cluster when available.
  const formationGroups = records.reduce((groups, record) => {
    const key = record.formation || "__NONE__";
    groups[key] = groups[key] || [];
    groups[key].push(record);
    return groups;
  }, {});

  const formationCandidates = Object.values(formationGroups)
    .filter((group) => group[0].formation)
    .sort((a, b) => b.length - a.length);

  if (formationCandidates.length > 0 && formationCandidates[0].length >= 2) {
    return {
      cluster: formationCandidates[0],
      label: formationCandidates[0][0].formation,
    };
  }

  // If no strong formation cluster, fall back to the most common country.
  const countryGroups = records.reduce((groups, record) => {
    const key = record.country || "__NONE__";
    groups[key] = groups[key] || [];
    groups[key].push(record);
    return groups;
  }, {});

  const countryCandidates = Object.values(countryGroups).sort(
    (a, b) => b.length - a.length,
  );

  if (
    countryCandidates.length > 0 &&
    countryCandidates[0].length >= 2 &&
    countryCandidates[0].length / records.length >= 0.5
  ) {
    return {
      cluster: countryCandidates[0],
      label: countryCandidates[0][0].country,
    };
  }

  return { cluster: records, label: null };
}

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
 * Génère une position aléatoire dans les limites d'un continent
 */
function getRandomPositionInContinent(continent) {
  if (continent !== "global oceans") return null;

  const points = [
    { lat: 0, lon: -160 }, // Pacific
    { lat: 0, lon: -30 }, // Atlantic
    { lat: -45, lon: 140 }, // Southern Ocean
  ];

  // Choisir un point aléatoire parmi les références
  const basePoint = points[Math.floor(Math.random() * points.length)];

  // Ajouter une petite variation autour du point (±5° max)
  const lat = basePoint.lat + (Math.random() - 0.5) * 10;
  const lon = basePoint.lon + (Math.random() - 0.5) * 10;

  return { lat, lon };
}

/**
 * Recherche en spirale pour trouver une position sans collision
 * @param {number} baseLat - Latitude de base
 * @param {number} baseLon - Longitude de base
 * @param {boolean} requireLand - Si true, rejeter les positions en mer (validation 0Ma)
 */
function findNonCollidingPosition(baseLat, baseLon, requireLand = false) {
  // Try base position first
  if (!hasCollision(baseLat, baseLon)) {
    if (!requireLand || isPointOnLand(baseLat, baseLon, 0) !== false) {
      return { lat: baseLat, lon: baseLon, attempts: 0 };
    }
  }

  const MAX_RADIUS_DEGREES = 2.0;
  const STEP_DEGREES = 0.04; // proportional to MIN_DISTANCE_DEGREES for efficient spiral coverage
  const maxAttempts = Math.min(
    MAX_COLLISION_ATTEMPTS,
    Math.floor((MAX_RADIUS_DEGREES - 0.002) / STEP_DEGREES),
  );
  let bestCandidate = null;
  let bestMinDistance = -Infinity;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const radius = 0.002 + attempt * STEP_DEGREES;
    if (radius > MAX_RADIUS_DEGREES) break;

    const angle = attempt * 137.5 * (Math.PI / 180); // Golden angle
    const lat = baseLat + radius * Math.sin(angle);
    const lon = baseLon + radius * Math.cos(angle);

    if (requireLand && isPointOnLand(lat, lon, 0) === false) continue;

    const distances = placedPoints.map((p) =>
      calculateDistance(lat, lon, p.lat, p.lon),
    );
    const minDistance =
      distances.length > 0 ? Math.min(...distances) : Infinity;

    if (minDistance >= MIN_DISTANCE_DEGREES) {
      return { lat, lon, attempts: attempt };
    }

    if (minDistance > bestMinDistance) {
      bestMinDistance = minDistance;
      bestCandidate = { lat, lon, attempts: attempt };
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  // Only reached in extreme density or when no valid land position was found.
  return { lat: baseLat, lon: baseLon, attempts: maxAttempts };
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
 * Replace known informal/common names with latin equivalents before parsing.
 * Uses tokens to prevent a replacement from being matched by a subsequent rule
 * (e.g. "spinosaurus" → "Spinosaurus aegyptiacus" must not re-match "spinosaurus").
 * Entries are processed longest-key-first to handle overlapping names correctly.
 */
function normalizeCommonNames(tags) {
  const entries = Object.entries(COMMON_NAME_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  );

  let result = tags;
  const tokens = [];

  for (const [common, latin] of entries) {
    const pattern = new RegExp(`\\b${common}\\b`, "gi");
    if (latin) {
      const token = `\x00TOKEN${tokens.length}\x00`;
      tokens.push(latin);
      result = result.replace(pattern, token);
    } else {
      result = result.replace(pattern, "");
    }
  }

  tokens.forEach((latin, i) => {
    result = result.replace(`\x00TOKEN${i}\x00`, latin);
  });

  return result;
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
  else if (tags.includes("central asia")) continent = "central asia";
  else if (tags.includes("eurasia")) continent = "eurasia";
  else if (tags.includes("north africa")) continent = "north africa";
  else if (tags.includes("global ocean")) continent = "global oceans";

  // NOUVEAU: Extraire SEULEMENT les noms biologiques (espèces, genres, noms communs d'animaux)
  const GEOLOGICAL_PERIODS = [
    "late",
    "early",
    "middle",
    "upper",
    "lower",
    "cretaceous",
    "jurassic",
    "triassic",
    "permian",
    "carboniferous",
    "devonian",
    "silurian",
    "ordovician",
    "cambrian",
    "pleistocene",
    "pliocene",
    "miocene",
    "oligocene",
    "eocene",
    "paleocene",
    "holocene",
    "quaternary",
    "neogene",
    "paleogene",
  ];

  const CONTINENTS_AND_REGIONS = [
    "north america",
    "south america",
    "asia",
    "europe",
    "africa",
    "australia",
    "india",
    "antarctica",
    "madagascar",
    "central asia",
    "north africa",
    "eurasia",
  ];

  const GEOGRAPHIC_TERMS = [
    "formation",
    "group",
    "member",
    "beds",
    "basin",
    "montana",
    "alberta",
    "wyoming",
    "colorado",
    "utah",
    "texas",
    "kansas",
    "china",
    "mongolia",
    "patagonia",
    "brazil",
    "beach",
    "ocean",
    "river",
    "lake",
    "coast",
    "island",
    "mountain",
    "valley",
    "forest",
    "desert",
    "swamp",
  ];

  const ANATOMICAL_TERMS = [
    "head",
    "tail",
    "tooth",
    "bone",
    "skull",
    "claw",
    "nest",
    "egg",
    "eggs",
    "track",
    "tracks",
    "footprint",
  ];

  const species = tags
    .split(/[,&]/) // also split on & (e.g. "Tyrannosaurus & Edmontosaurus")
    .map((s) => s.trim())
    .filter((s) => {
      // Longueur minimum
      if (s.length < 4) return false;

      // ACCEPTER les noms binomiaux latins avec espace (ex: "tyrannosaurus rex")
      if (s.includes(" ")) {
        // Vérifier d'abord si c'est un terme géographique connu
        if (CONTINENTS_AND_REGIONS.some((c) => s === c)) return false;
        if (
          s.includes("formation") ||
          s.includes("group") ||
          s.includes("member")
        )
          return false;
        if (GEOLOGICAL_PERIODS.includes(s)) return false;

        // Accepter si c'est un nom latin binomial (2 mots, le 2e se termine par -us, -is, -a, etc.)
        const words = s.split(" ");
        if (words.length === 2) {
          const latinEndings =
            /(?:us|is|ii|i|ai|a|or|ar|ax|er|ex|on|es|as|um|ae|ens|ans|oc|ps|x)$/i;
          if (
            GEOLOGICAL_PERIODS.includes(words[0]) ||
            GEOLOGICAL_PERIODS.includes(words[1])
          ) {
            return false;
          }
          if (latinEndings.test(words[1])) {
            return true; // C'est probablement un nom d'espèce latin
          }
        }
        return false; // Autre expression multi-mots → rejeter
      }

      // Exclure les périodes géologiques
      if (GEOLOGICAL_PERIODS.includes(s)) return false;

      // Exclure les continents/régions
      if (CONTINENTS_AND_REGIONS.some((c) => s.includes(c))) return false;

      // Exclure les termes géographiques
      if (GEOGRAPHIC_TERMS.includes(s)) return false;

      // Exclure les termes anatomiques
      if (ANATOMICAL_TERMS.includes(s)) return false;

      // ACCEPTER: compound Latin endings unambiguous for any length
      const latinEndings =
        /(?:saurus|raptor|ceratops|titan|suchus|therium|odon|pteryx|chelys|mimus|venator|lophus|nykus|dactyl|forma|chelonia|aurus|itan|an)$/i;
      if (latinEndings.test(s)) return true;

      // ACCEPTER: 7-9 char words with common Latin noun endings (us, a, i, or, ops, ia, ea…)
      // Filters above (geo periods, continents, geo terms) already exclude false positives
      const shortLatinEndings = /(?:us|ia|ea|ops|or|i|a)$/i;
      if (s.length >= 7 && s.length <= 9 && shortLatinEndings.test(s))
        return true;

      // Noms longs (10+ lettres) probablement des espèces
      if (s.length >= 10) return true;

      return false;
    });

  // Extraire la période
  const { period, age } = extractPeriod(tags);

  return { continent, species, period, age };
}

/**
 * Finds raw PBDB coordinates for an item WITHOUT anti-collision.
 * Returns { ok, rawLat, rawLon, location, confidence, source, period, age, requireLand }.
 * Anti-collision is resolved in the second pass of geocodeItems.
 */
async function findRawCoordinates(freeTags, itemId, slug) {
  if (slug && COORDINATE_FIXES[slug]) {
    const fix = COORDINATE_FIXES[slug];
    console.log(`✓ Correction manuelle pour "${slug}" (${fix.reason})`);
    return {
      ok: true,
      rawLat: fix.lat,
      rawLon: fix.lon,
      location: fix.reason,
      confidence: "high",
      source: "manual_fix",
      period: null,
      age: null,
      requireLand: false,
    };
  }

  const normalizedTags = normalizeCommonNames(freeTags || "");
  let { continent, species, period, age } = parseFreeTags(normalizedTags);
  const tagsLower = (freeTags || "").toLowerCase();
  const isMarine = /ocean|sea|marine|reef|pelagic|offshore|lagoon/.test(
    tagsLower,
  );

  if (species.length > 0) {
    let fallbackResult = null;

    for (const sp of species) {
      console.log(`🔍 Recherche PBDB pour "${sp}"...`);
      let records = await searchPaleoBioDBAll(sp);
      if (records.length === 0 && sp.includes(" ")) {
        const genus = sp.split(" ")[0];
        console.log(`   🔄 Aucun résultat — retry genre seul: "${genus}"`);
        records = await searchPaleoBioDBAll(genus);
      }
      if (records.length === 0) continue;
      console.log(`   🔬 ${records.length} occurrence(s) trouvée(s)`);

      let filtered = records;
      if (continent && continent !== "global oceans") {
        const continentFiltered = records.filter((r) =>
          isInContinent(r.lat, r.lng, continent),
        );
        if (continentFiltered.length > 0) {
          filtered = continentFiltered;
          console.log(
            `   ✓ ${filtered.length}/${records.length} résultats dans ${continent}`,
          );
        } else {
          console.log(`   ⚠️  Aucun résultat dans ${continent} pour "${sp}"`);
          if (!fallbackResult) fallbackResult = { records, species: sp };
          continue;
        }
      }

      const { cluster: bestCluster, label: clusterLabel } =
        selectBestPbdbCluster(filtered);
      const medoid = findClusterMedoid(bestCluster);
      const bestFormation =
        clusterLabel || filtered.find((r) => r.formation)?.formation;
      const bestCountry = filtered.find((r) => r.country)?.country;
      const locationLabel =
        bestFormation || bestCountry || continent || "Unknown";

      return {
        ok: true,
        rawLat: medoid.lat,
        rawLon: medoid.lon,
        location: `${locationLabel} (PBDB)`,
        confidence: bestFormation ? "high" : "medium",
        source: "pbdb",
        period,
        age,
        requireLand: !isMarine,
      };
    }

    if (fallbackResult) {
      console.log(
        `   ⚠️  Fallback: utilisation de "${fallbackResult.species}" sans filtre continent`,
      );
      const records = fallbackResult.records;
      const { cluster: bestCluster, label: clusterLabel } =
        selectBestPbdbCluster(records);
      const medoid = findClusterMedoid(bestCluster);
      const bestFormation =
        clusterLabel || records.find((r) => r.formation)?.formation;
      const bestCountry = records.find((r) => r.country)?.country;
      const locationLabel =
        bestFormation || bestCountry || continent || "Unknown";

      return {
        ok: true,
        rawLat: medoid.lat,
        rawLon: medoid.lon,
        location: `${locationLabel} (PBDB)`,
        confidence: "medium",
        source: "pbdb",
        period,
        age,
        requireLand: !isMarine,
      };
    }
  }

  if (isMarine) {
    console.warn(`⚠️  [${itemId}] PBDB échoue, placement océanique global`);
    const oceanPos = getRandomPositionInContinent("global oceans");
    if (oceanPos) {
      return {
        ok: true,
        rawLat: oceanPos.lat,
        rawLon: oceanPos.lon,
        location: "global oceans",
        confidence: "medium",
        source: "ocean_fallback",
        period,
        age,
        requireLand: false,
      };
    }
  }

  if (continent && continent !== "global oceans" && CONTINENT_CENTERS[continent]) {
    const center = CONTINENT_CENTERS[continent];
    console.log(
      `   📍 Fallback: centre du continent ${continent} (${center.lat}°, ${center.lon}°)`,
    );
    return {
      ok: true,
      rawLat: center.lat,
      rawLon: center.lon,
      location: `${continent} (continent center)`,
      confidence: "low",
      source: "continent_fallback",
      period,
      age,
      requireLand: true,
    };
  }

  return { ok: false, reason: "pbdb_failed" };
}

/**
 * Builds the final geocoded result object from a rawResult and a resolved position.
 */
function buildGeocodedResult(r, pos) {
  return {
    id: r.item.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    creditsLine: r.creditsLine,
    creatorLink: r.creatorLink,
    category: r.category,
    isNew: r.isNew,
    displayOnApp: r.displayOnApp,
    geologicalPeriod: r.geologicalPeriod,
    contentLink: r.contentLink,
    youtubeId: r.youtubeId,
    lastUpdated: r.item.lastUpdated || null,
    createdOn: r.item.createdOn || null,
    backgroundImage: r.backgroundImage,
    galleryImage: r.galleryImage,
    freeTags: r.freeTags,
    latitude: Math.round(pos.lat * 100) / 100,
    longitude: Math.round(pos.lon * 100) / 100,
    location: r.raw.location,
    confidence: r.raw.confidence,
    period: r.raw.period,
    age: r.raw.age,
    collisionAttempts: pos.attempts,
  };
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

async function geocodeItems(
  allItems,
  { log = true, existingCoords = [] } = {},
) {
  // Pre-populate per-period placed points from existing data
  const placedByPeriod = {};
  for (const ec of existingCoords) {
    const p = ec.period || "unknown";
    (placedByPeriod[p] = placedByPeriod[p] || []).push(ec);
  }
  if (log && existingCoords.length > 0) {
    console.log(
      `📍 Anti-collision: ${existingCoords.length} items existants chargés (par période)\n`,
    );
  }

  if (log) {
    console.log("🔍 Analyse et génération des coordonnées...\n");
    console.log("─".repeat(80));
  }

  const results = [];
  const failedItems = [];
  const totalItems = allItems.length;
  let processedItems = 0;

  for (const item of allItems) {
    processedItems++;
    if (log) {
      console.log(
        `\n▶️  ${processedItems}/${totalItems} — ${item.fieldData.name} (${item.fieldData.slug})`,
      );
    }

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
        if (keywords.split("|").some((kw) => tagLower.includes(kw))) {
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
      if (log) console.log(`⏭️  [${name}] Pas de free-tags - ignoré`);
      continue;
    }

    const raw = await findRawCoordinates(freeTags, item.id, slug);

    if (!raw || !raw.ok) {
      if (log) {
        console.log("");
        console.log(`❌ [${name}] Géoloc échouée`);
        console.log(`   Tags: ${freeTags}`);
        if (raw?.reason) console.log(`   Raison: ${raw.reason}`);
        console.log("");
      }
      failedItems.push({
        id: item.id,
        name,
        slug,
        freeTags,
        reason: raw?.reason || "unknown",
      });
      continue;
    }

    const r = {
      item,
      raw,
      name,
      slug,
      freeTags,
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
    };

    // Manual fixes: place at exact coords, skip spiral
    let pos;
    if (raw.source === "manual_fix") {
      pos = { lat: raw.rawLat, lon: raw.rawLon, attempts: 0 };
    } else {
      // Anti-collision is per geological period: items from different periods
      // never appear simultaneously on the globe, so they should not block each other.
      const period = geologicalPeriod || "unknown";
      if (!placedByPeriod[period]) placedByPeriod[period] = [];
      placedPoints.length = 0;
      placedPoints.push(...placedByPeriod[period]);
      pos = findNonCollidingPosition(raw.rawLat, raw.rawLon, raw.requireLand);
      placedByPeriod[period].push({ lat: pos.lat, lon: pos.lon, id: item.id });
    }

    if (log) {
      console.log("");
      console.log(`✅ [${name}]`);
      console.log(`   Tags: ${freeTags}`);
      console.log(`   → ${raw.location}`);
      console.log(`   → ${pos.lat.toFixed(2)}°, ${pos.lon.toFixed(2)}° (moderne)`);
      console.log(`   → Période: ${raw.period} (~${raw.age} Ma)`);
      console.log(`   → Confiance: ${raw.confidence}`);
      if (pos.attempts > 0) {
        console.log(`   → Tentatives anti-collision: ${pos.attempts}`);
      }
      console.log("");
    }

    results.push(buildGeocodedResult(r, pos));
  }

  if (log) {
    console.log("─".repeat(80));
    console.log(`\n📊 Résumé:`);
    console.log(`   Total items: ${allItems.length}`);
    console.log(`   Géocodés: ${results.length}`);
    console.log(`   Échoués: ${failedItems.length}`);
    console.log(
      `   Ignorés: ${allItems.length - results.length - failedItems.length}`,
    );
    console.log(
      `   Haute confiance: ${results.filter((r) => r.confidence === "high").length}`,
    );
    console.log(
      `   Confiance moyenne: ${results.filter((r) => r.confidence === "medium").length}`,
    );
    const totalPBDB = PBDB_CACHE_HITS + PBDB_CACHE_MISSES;
    if (totalPBDB > 0) {
      const hitRate = ((PBDB_CACHE_HITS / totalPBDB) * 100).toFixed(1);
      console.log(
        `   ⚡ Cache PBDB: ${PBDB_CACHE_HITS} hits / ${totalPBDB} requêtes (${hitRate}% efficacité)`,
      );
    }
    console.log(
      `   🌐 PBDB API: ${PBDB_STATS.apiOk}/${PBDB_STATS.apiCalls} OK | ` +
        `vides: ${PBDB_STATS.noRecords} | sans coords: ${PBDB_STATS.noCoords} | erreurs: ${PBDB_STATS.errors}`,
    );
  }

  return { successful: results, failed: failedItems };
}

async function fetchGeocodedItems({
  writeFile = false,
  log = true,
  limit = null,
  slugs = null,
} = {}) {
  const allItems = await fetchAllItems({ log });
  let itemsToProcess = allItems;

  // Filtrer par slugs si spécifié
  if (slugs && slugs.length > 0) {
    const beforeFilter = allItems.length;
    itemsToProcess = allItems.filter((item) =>
      slugs.includes(item.fieldData.slug),
    );
    if (log) {
      console.log(
        `✅ ${itemsToProcess.length} item(s) trouvé(s) sur ${beforeFilter} (filtré par slug)\n`,
      );
    }
  }

  // Load existing coordinates to pre-populate anti-collision (incremental runs)
  let existingCoords = [];
  const contentDataPath = path.join(
    __dirname,
    "../assets/data/content-data.json",
  );
  if (fs.existsSync(contentDataPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(contentDataPath, "utf8"));
      const slugSet = new Set(slugs || []);
      existingCoords = (existing.items || [])
        .filter(
          (item) => !slugSet.has(item.slug) && item.modernLat && item.modernLon,
        )
        .map((item) => ({
          lat: item.modernLat,
          lon: item.modernLon,
          id: item.id,
          period: item.geologicalPeriod || "unknown",
        }));
    } catch (_) {
      /* ignore if file unreadable */
    }
  }
  // Appliquer la limite si spécifiée (après filtre slugs)
  else if (limit && allItems.length > limit) {
    if (log) {
      console.log(
        `⚠️  Limitation à ${limit} items sur ${allItems.length} trouvés\n`,
      );
    }
    itemsToProcess = allItems.slice(0, limit);
  }

  const results = await geocodeItems(itemsToProcess, { log, existingCoords });

  if (writeFile) {
    const fs = await import("fs");
    fs.writeFileSync("geocoded-items.json", JSON.stringify(results, null, 2));
    if (log) {
      console.log(`\n💾 Résultats sauvegardés dans: geocoded-items.json`);
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

  // Parse arguments
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

  const slugsArg = args.find((arg) => arg.startsWith("--slugs="));
  const slugs = slugsArg
    ? slugsArg
        .split("=")[1]
        .split(",")
        .map((s) => s.trim())
    : null;

  if (limit) {
    console.log(`⚙️  Mode test: limite à ${limit} items\n`);
  }

  if (slugs) {
    console.log(
      `🎯 Mode --slugs: géocodage de ${slugs.length} slug(s) spécifique(s)\n`,
    );
  }

  try {
    await fetchGeocodedItems({ writeFile: true, log: true, limit, slugs });
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
