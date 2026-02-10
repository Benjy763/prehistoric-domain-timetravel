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
  "f3e16047f64a12d4824314badfc168a2": "permian",
  "533e85b7f1b3b58d6ebfff5540af3f2c": "carboniferous",
  "1f640518ea2f2905ae9e818010b9c3f6": "devonian",
  "927ffc97d1dec789edc8062baa88b5a1": "silurian",
  "7935a60cb719155a2d225b59569b5699": "ordovician",
  "f44a29ca025a2b23e3c47810ec7621a1": "cambrian",
};

const MIN_DISTANCE_DEGREES = 2.5; // Distance minimale entre 2 points
const MAX_OFFSET = 15.0; // Offset maximum en cas de collision (priorité visuelle)
const NORMAL_OFFSET = 1.5; // Offset normal
const MAX_ATTEMPTS = 100; // Tentatives maximales anti-collision

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
 * Recherche dans la Paleobiology Database pour trouver
 * formation et coordonnées d'une espèce
 */
async function searchPaleobioDB(genus) {
  // Vérifier le cache d'abord
  const cacheKey = genus.toLowerCase().trim();
  if (PBDB_CACHE.has(cacheKey)) {
    PBDB_CACHE_HITS++;
    console.log(`   💾 Cache PBDB: "${genus}" (hit #${PBDB_CACHE_HITS})`);
    return PBDB_CACHE.get(cacheKey);
  }

  PBDB_CACHE_MISSES++;
  PBDB_STATS.apiCalls++;
  const url = `https://paleobiodb.org/data1.2/occs/list.json?base_name=${encodeURIComponent(genus)}&show=coords,loc,stratext&limit=10`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      PBDB_STATS.noRecords++;
      PBDB_CACHE.set(cacheKey, null);
      return null;
    }

    // Trouver la meilleure occurrence avec coordonnées et formation
    const best =
      data.records.find((r) => r.lng && r.lat && r.formation) ||
      data.records.find((r) => r.lng && r.lat);

    if (!best) {
      PBDB_STATS.noCoords++;
      PBDB_CACHE.set(cacheKey, null);
      return null;
    }

    PBDB_STATS.apiOk++;
    console.log(
      `   🔬 PBDB: ${best.formation || "Formation inconnue"} (${best.cc || "N/A"})`,
    );

    const result = {
      formation: best.formation,
      lat: parseFloat(best.lat),
      lng: parseFloat(best.lng),
      country: best.cc,
      state: best.state,
      period: best.early_interval || best.late_interval,
      source: "paleobiodb",
    };

    PBDB_CACHE.set(cacheKey, result);
    return result;
  } catch (error) {
    PBDB_STATS.errors++;
    PBDB_CACHE.set(cacheKey, null);
    return null;
  }
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
 * Génère un offset aléatoire
 */
function randomOffset(min, max) {
  return min + Math.random() * (max - min);
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
    .split(",")
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
          const latinEndings = /(?:us|is|a|or|ex|on|es|um|ae)$/i;
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

      // ACCEPTER: Noms latins (se terminent souvent par -us, -is, -a, -or, -ex, -ops, -on, -aurus, -itan, -an)
      const latinEndings =
        /(?:saurus|raptor|ceratops|titan|suchus|therium|odon|pteryx|chelys|mimus|venator|lophus|nykus|dactyl|forma|chelonia|aurus|itan|an)$/i;
      if (latinEndings.test(s)) return true;

      // Noms longs (10+ lettres) probablement des espèces
      if (s.length >= 10) return true;

      return false;
    });

  // Extraire la période
  const { period, age } = extractPeriod(tags);

  return { continent, species, period, age };
}

/**
 * Trouve les coordonnées pour un item
 * Stratégie : PBDB d'abord pour TOUS les items, fallback océan si marin + échec PBDB
 */
async function findCoordinates(freeTags, itemId, slug) {
  // Vérifier si une correction manuelle existe
  if (slug && COORDINATE_FIXES[slug]) {
    const fix = COORDINATE_FIXES[slug];
    console.log(
      `✓ Utilisant correction manuelle pour "${slug}" (${fix.reason})`,
    );
    return {
      ok: true,
      lat: fix.lat,
      lon: fix.lon,
      location: fix.reason,
      confidence: "high",
      source: "manual_fix",
      period: null,
      age: 0,
      collisionAttempts: 0,
    };
  }

  let { continent, species, period, age } = parseFreeTags(freeTags);
  const tagsLower = (freeTags || "").toLowerCase();
  const isMarine = /ocean|sea|marine|reef|pelagic|offshore|lagoon/.test(
    tagsLower,
  );

  // Étape 1 : Chercher la première espèce dans PBDB (pour TOUS les items)
  const firstSpecies = species[0];
  if (firstSpecies) {
    console.log(`🔍 Recherche Paleobiology Database pour "${firstSpecies}"...`);
    const pbdbData = await searchPaleobioDB(firstSpecies);

    if (pbdbData && pbdbData.lat && pbdbData.lng) {
      const position = findNonCollidingPosition(pbdbData.lat, pbdbData.lng);
      return {
        ok: true,
        lat: Math.round(position.lat * 100) / 100,
        lon: Math.round(position.lon * 100) / 100,
        location:
          pbdbData.formation || `${pbdbData.country || "Unknown"} (PBDB)`,
        confidence: pbdbData.formation ? "high" : "medium",
        source: "pbdb",
        period: period,
        age: age,
        collisionAttempts: position.attempts,
      };
    }
  }

  // Étape 2 : Si PBDB a échoué et que c'est marin → placement océan global
  if (isMarine) {
    console.warn(
      `⚠️  [${itemId}] PBDB échoue, placement océanique global (marin)`,
    );
    const oceanPos = getRandomPositionInContinent("global oceans");
    if (oceanPos) {
      const position = findNonCollidingPosition(oceanPos.lat, oceanPos.lon);
      return {
        ok: true,
        lat: Math.round(position.lat * 100) / 100,
        lon: Math.round(position.lon * 100) / 100,
        location: "global oceans",
        confidence: "medium",
        source: "ocean_fallback",
        period: period,
        age: age,
        collisionAttempts: position.attempts,
      };
    }
  }

  // Étape 3 : Item terrestre sans espèce ou PBDB échouée → ignorer
  return { ok: false, reason: "pbdb_failed" };
}

/**
 * Réinitialise l'état du géocodage
 */
function resetGeocodeState() {
  placedPoints.length = 0;
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
  const failedItems = [];  // Items dont la géocodification a échoué

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

    const coords = await findCoordinates(freeTags, item.id, slug);

    if (!coords || coords.ok === false) {
      if (log) {
        console.log(`❌ [${name}] Géoloc échouée`);
        console.log(`   Tags: ${freeTags}`);
        if (coords?.reason) {
          console.log(`   Raison: ${coords.reason}`);
        }
        console.log("");
      }
      // Ajouter aux items échoués pour désactivation ultérieure
      failedItems.push({
        id: item.id,
        name,
        slug,
        freeTags,
        reason: coords?.reason || "unknown"
      });
      continue;
    }

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
        lastUpdated: item.lastUpdated || null,
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
    }
  }

  if (log) {
    console.log("─".repeat(80));
    console.log(`\n📊 Résumé:`);
    console.log(`   Total items: ${allItems.length}`);
    console.log(`   Géocodés: ${results.length}`);
    console.log(`   Échoués: ${failedItems.length}`);
    console.log(`   Ignorés: ${allItems.length - results.length - failedItems.length}`);
    console.log(
      `   Haute confiance: ${results.filter((r) => r.confidence === "high").length}`,
    );
    console.log(
      `   Confiance moyenne: ${results.filter((r) => r.confidence === "medium").length}`,
    );

    // Statistiques cache PBDB
    const totalPBDB = PBDB_CACHE_HITS + PBDB_CACHE_MISSES;
    if (totalPBDB > 0) {
      const hitRate = ((PBDB_CACHE_HITS / totalPBDB) * 100).toFixed(1);
      console.log(
        `   ⚡ Cache PBDB: ${PBDB_CACHE_HITS} hits / ${totalPBDB} requêtes (${hitRate}% efficacité)`,
      );
    }

    console.log(
      `   🌐 PBDB API: ${PBDB_STATS.apiOk}/${PBDB_STATS.apiCalls} OK | ` +
        `vides: ${PBDB_STATS.noRecords} | ` +
        `sans coords: ${PBDB_STATS.noCoords} | ` +
        `erreurs: ${PBDB_STATS.errors}`,
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
  // Appliquer la limite si spécifiée (après filtre slugs)
  else if (limit && allItems.length > limit) {
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
      "geocoded-items.json",
      JSON.stringify(results, null, 2),
    );
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
