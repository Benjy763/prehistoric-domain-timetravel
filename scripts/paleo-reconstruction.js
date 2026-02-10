/**
 * PREHISTORIC DOMAIN - Module de reconstruction paléogéographique
 *
 * Centralise toute la logique générique :
 * - Mapping des périodes géologiques
 * - Reconstruction via GPlates API
 * - Gestion des items océaniques
 * - Gestion des limites API (>410 Ma)
 */

// ============================================
// CONFIGURATION
// ============================================

const fs = require("fs");
const path = require("path");

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
  ordovician: 450,
  cambrian: 500,
};

const PERIODS = [
  { time: 0, name: "today" },
  { time: 2, name: "quaternary" },
  { time: 15, name: "neogene" },
  { time: 50, name: "paleogene" },
  { time: 100, name: "cretaceous" },
  { time: 160, name: "jurassic" },
  { time: 220, name: "triassic" },
  { time: 280, name: "permian" },
  { time: 320, name: "carboniferous" },
  { time: 380, name: "devonian" },
  { time: 410, name: "silurian" },
  { time: 450, name: "ordovician" },
  { time: 500, name: "cambrian" },
];

const GPLATES_API_URL =
  "https://gws.gplates.org/reconstruct/reconstruct_points/";
const GPLATES_MODEL = "MERDITH2021";
const GPLATES_MAX_AGE = 410; // Au-delà, l'API ne fonctionne pas bien

// Positions océaniques garanties par période (au milieu des grands bassins océaniques)
// Basées sur l'analyse des coastlines Merdith2021
// Plusieurs positions par période pour éviter collisions (rotation)
const OCEANIC_POSITIONS_BY_PERIOD = {
  0: [
    { lat: -15.0, lon: -140.0, name: "Pacific Ocean" },
    { lat: 5.0, lon: -35.0, name: "Atlantic Ocean" },
    { lat: -25.0, lon: 75.0, name: "Indian Ocean" },
  ],
  2: [
    { lat: -15.0, lon: -140.0, name: "Pacific Ocean" },
    { lat: 5.0, lon: -35.0, name: "Atlantic Ocean" },
    { lat: -25.0, lon: 75.0, name: "Indian Ocean" },
  ],
  15: [
    { lat: -15.0, lon: -140.0, name: "Pacific Ocean" },
    { lat: 5.0, lon: -35.0, name: "Atlantic Ocean" },
    { lat: -25.0, lon: 75.0, name: "Indian Ocean" },
  ],
  50: [
    { lat: -10.0, lon: -150.0, name: "Pacific Ocean" },
    { lat: 10.0, lon: -25.0, name: "Atlantic Ocean" },
    { lat: -20.0, lon: 80.0, name: "Indian Ocean" },
  ],
  100: [
    { lat: 0.0, lon: -120.0, name: "Pacific Ocean" },
    { lat: 15.0, lon: -40.0, name: "Atlantic Ocean" },
    { lat: -10.0, lon: 90.0, name: "Tethys Ocean" },
  ],
  160: [
    { lat: 5.0, lon: -140.0, name: "Panthalassa Ocean" },
    { lat: 0.0, lon: -50.0, name: "Central Atlantic" },
    { lat: 10.0, lon: 70.0, name: "Tethys Ocean" },
  ],
  220: [
    { lat: 0.0, lon: -160.0, name: "Panthalassa Ocean" },
    { lat: 15.0, lon: 60.0, name: "Paleo-Tethys Ocean" },
  ],
  280: [
    { lat: 10.0, lon: 100.0, name: "Paleo-Tethys Ocean" },
    { lat: -20.0, lon: -140.0, name: "Panthalassa Ocean" },
  ],
  320: [
    { lat: 15.0, lon: 80.0, name: "Paleo-Tethys Ocean" },
    { lat: 0.0, lon: -150.0, name: "Panthalassa Ocean" },
  ],
  380: [
    { lat: 0.0, lon: 60.0, name: "Rheic Ocean" },
    { lat: -15.0, lon: -140.0, name: "Panthalassa Ocean" },
  ],
  410: [
    { lat: 5.0, lon: 40.0, name: "Iapetus Ocean" },
    { lat: -10.0, lon: -130.0, name: "Panthalassa Ocean" },
  ],
  450: [
    { lat: -20.0, lon: 100.0, name: "Panthalassa Ocean" },
    { lat: 10.0, lon: 20.0, name: "Iapetus Ocean" },
  ],
  500: [
    { lat: -30.0, lon: 120.0, name: "Panthalassa Ocean" },
    { lat: 0.0, lon: 0.0, name: "Iapetus Ocean" },
  ],
};

// Index de rotation pour les positions océaniques (comme rotationIndexes dans auto-geocode)
const oceanicRotationIndexes = {};

// Ages disponibles dans assets/geojson/ (correspondant aux 13 périodes)
const AVAILABLE_GEOJSON_AGES = [0, 2, 15, 50, 100, 160, 220, 280, 320, 380, 410, 450, 500];

/**
 * Trouve l'âge GeoJSON disponible le plus proche d'un âge cible
 * Ex: 66 → 50, 125 → 100, 3 → 2
 */
function getNearestAvailableAge(age) {
  let nearest = AVAILABLE_GEOJSON_AGES[0];
  let minDiff = Math.abs(age - nearest);
  for (const a of AVAILABLE_GEOJSON_AGES) {
    const diff = Math.abs(age - a);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = a;
    }
  }
  return nearest;
}

// Cache GeoJSON des continents par période
const LAND_GEOJSON_CACHE = new Map();

function loadLandGeoJSON(age) {
  const nearestAge = getNearestAvailableAge(age);
  const key = String(nearestAge);
  if (LAND_GEOJSON_CACHE.has(key)) return LAND_GEOJSON_CACHE.get(key);

  const filePath = path.join(__dirname, `../assets/geojson/${key}Ma.json`);
  if (!fs.existsSync(filePath)) {
    LAND_GEOJSON_CACHE.set(key, null);
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const geo = JSON.parse(raw);
    const polygons = [];

    for (const feature of geo.features || []) {
      const geom = feature.geometry;
      if (!geom) continue;
      if (geom.type === "Polygon") {
        polygons.push(geom.coordinates);
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) polygons.push(poly);
      }
    }

    LAND_GEOJSON_CACHE.set(key, polygons);
    return polygons;
  } catch (error) {
    LAND_GEOJSON_CACHE.set(key, null);
    return null;
  }
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  if (!polygon || polygon.length === 0) return false;
  // On utilise seulement l'anneau extérieur (index 0)
  return pointInRing(point, polygon[0]);
}

function isPointOnLand(lat, lon, age) {
  const polygons = loadLandGeoJSON(age);
  if (!polygons) return null;

  const point = [lon, lat];
  for (const polygon of polygons) {
    if (pointInPolygon(point, polygon)) return true;
  }
  return false;
}

function findNearbyLand(lat, lon, age, attempts = 100, radiusStart = 5) {
  if (isPointOnLand(lat, lon, age)) return { lat, lon };

  // Recherche progessive avec rayon croissant (5° -> 10° -> 20° -> 40°)
  const radii = [5, 10, 20, 40];

  for (const radius of radii) {
    for (let i = 0; i < Math.min(attempts, 25); i++) {
      const offsetLat = (Math.random() - 0.5) * radius * 2;
      const offsetLon = (Math.random() - 0.5) * radius * 2;
      const testLat = lat + offsetLat;
      const testLon = lon + offsetLon;

      // Validation des coordonnées
      if (Math.abs(testLat) <= 90 && Math.abs(testLon) <= 180) {
        if (isPointOnLand(testLat, testLon, age)) {
          return { lat: testLat, lon: testLon };
        }
      }
    }
  }

  return null;
}

// ============================================
// CONSTRUCTION DES CHAMPS DÉRIVÉS
// ============================================

/**
 * Construit les champs dérivés à partir des données de base
 * (youtubeUrl, preview, pageUrl)
 *
 * RÈGLE UNIQUE: Toutes les constructions d'URL se font ici
 */
function buildDerivedFields(item) {
  const {
    youtubeId,
    category,
    backgroundImage,
    galleryImage,
    contentLink,
    slug,
  } = item;

  // YouTube URL: seulement si youtubeId existe
  const youtubeUrl = youtubeId
    ? `https://www.youtube.com/watch?v=${youtubeId}`
    : null;

  // Preview: thumbnail YouTube pour vidéos, sinon image de fallback
  const preview =
    category === "videos" && youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
      : backgroundImage || galleryImage || null;

  // Page URL: contentLink si 3D experience, sinon URL standard du site
  const pageUrl = contentLink
    ? contentLink
    : slug
      ? `https://www.prehistoricdomain.com/content/${slug}`
      : null;

  return { youtubeUrl, preview, pageUrl };
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Convertit une période géologique en âge numérique
 * @param {string} geologicalPeriod - Nom de la période (ex: "Cretaceous", "cambrian")
 * @returns {number|null} - Âge en Ma, ou null si inconnu
 */
function getPeriodAge(geologicalPeriod) {
  if (!geologicalPeriod) return null;
  const normalized = geologicalPeriod.toLowerCase();
  return PERIOD_MAPPING[normalized] ?? null;
}

/**
 * Vérifie si un item est océanique
 * @param {object} item - Item avec champ location
 * @returns {boolean}
 */
function isOceanicItem(item) {
  return item.location === "global oceans";
}

/**
 * Vérifie si un âge dépasse la limite de l'API GPlates
 * @param {number} age - Âge en Ma
 * @returns {boolean}
 */
function exceedsAPILimit(age) {
  return age > GPLATES_MAX_AGE;
}

/**
 * Reconstruit la position paléogéographique d'un point via GPlates API
 * @param {number} lat - Latitude moderne
 * @param {number} lon - Longitude moderne
 * @param {number} age - Âge en Ma
 * @returns {Promise<{lat: number, lon: number}>}
 */
async function reconstructPoint(lat, lon, age) {
  const url = `${GPLATES_API_URL}?points=${lon},${lat}&time=${age}&model=${GPLATES_MODEL}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.coordinates?.[0]?.length === 2) {
      const [paleoLon, paleoLat] = data.coordinates[0];

      // Vérifier si l'API a retourné des coordonnées invalides (999.99)
      if (Math.abs(paleoLon) > 180 || Math.abs(paleoLat) > 90) {
        throw new Error("Invalid coordinates returned by API");
      }

      return { lat: paleoLat, lon: paleoLon };
    }

    throw new Error("Invalid API response format");
  } catch (error) {
    // En cas d'erreur API, retourner la position moderne
    console.warn(
      `   ⚠️  Reconstruction failed: ${error.message} - using modern position`,
    );
    return { lat, lon };
  }
}

/**
 * Reconstruit la position d'un item pour sa période géologique
 * avec gestion intelligente des cas spéciaux
 *
 * @param {object} item - Item avec latitude, longitude, geologicalPeriod, location
 * @param {object} options - Options de logging et données existantes
 * @returns {Promise<{age: number, lat: number, lon: number}|null>}
 */
async function reconstructItemForPeriod(item, options = {}) {
  const { verbose = true, existingItems = [] } = options;

  const { latitude, longitude, geologicalPeriod, location } = item;

  // Déterminer l'âge de la période
  const age = getPeriodAge(geologicalPeriod);

  if (age === null && age !== 0) {
    if (verbose) {
      console.log(`   ⚠️  Période géologique inconnue: ${geologicalPeriod}`);
    }
    return null;
  }

  // CAS 1: Items océaniques globaux
  // L'API GPlates ne peut pas reconstruire les positions océaniques
  // On utilise des positions océaniques prédéfinies pour chaque période avec rotation
  if (isOceanicItem(item)) {
    const oceanicPositions = OCEANIC_POSITIONS_BY_PERIOD[age];

    if (!oceanicPositions || oceanicPositions.length === 0) {
      if (verbose) {
        console.log(
          `   ⚠️  Pas de position océanique définie pour ${age} Ma - position moderne conservée`,
        );
      }
      return {
        age,
        lat: latitude,
        lon: longitude,
      };
    }

    // Vérifier quelles positions sont déjà utilisées pour cette période
    const usedPositions = new Set();
    for (const existingItem of existingItems) {
      if (existingItem.id === item.id) continue; // Ignorer l'item lui-même
      const periodData = existingItem.periods?.[String(age)];
      if (periodData) {
        usedPositions.add(`${periodData.lat},${periodData.lon}`);
      }
    }

    // Trouver la première position non utilisée
    let oceanicPos = null;
    for (const pos of oceanicPositions) {
      const posKey = `${pos.lat},${pos.lon}`;
      if (!usedPositions.has(posKey)) {
        oceanicPos = pos;
        break;
      }
    }

    // Si toutes les positions sont utilisées, prendre la première avec un offset
    if (!oceanicPos) {
      oceanicPos = oceanicPositions[0];
      if (verbose) {
        console.log(
          `   ⚠️  Toutes les positions océaniques utilisées pour ${age} Ma - utilisation avec offset`,
        );
      }
      // Ajouter un petit offset pour éviter collision exacte
      return {
        age,
        lat: oceanicPos.lat + (Math.random() * 10 - 5),
        lon: oceanicPos.lon + (Math.random() * 10 - 5),
      };
    }

    if (verbose) {
      console.log(
        `   ℹ️  Item océanique global (${age} Ma) - placé dans ${oceanicPos.name}`,
      );
      console.log(`   📍 Position: ${oceanicPos.lat}°, ${oceanicPos.lon}°`);
    }

    return {
      age,
      lat: oceanicPos.lat,
      lon: oceanicPos.lon,
    };
  }

  // CAS 2: Périodes au-delà de la limite API (>410 Ma)
  // Pour Cambrian (500) et Ordovician (450), conserver position moderne
  if (exceedsAPILimit(age)) {
    if (verbose) {
      console.log(
        `   ⚠️  Période ${age} Ma au-delà limite API (${GPLATES_MAX_AGE} Ma) - position moderne conservée`,
      );
    }
    return {
      age,
      lat: latitude,
      lon: longitude,
    };
  }

  // CAS 3: Reconstruction normale via API
  if (verbose) {
    console.log(`   🔄 Reconstruction à ${age} Ma via GPlates API...`);
  }

  let coords = await reconstructPoint(latitude, longitude, age);
  let validationStatus = "unvalidated";

  // Validation paléo : vérifier que le point reconstruit est sur terre
  if (!isOceanicItem(item)) {
    const onLand = isPointOnLand(coords.lat, coords.lon, age);

    if (onLand === true) {
      validationStatus = "on_land";
    } else if (onLand === false) {
      // Point dans l'océan → chercher terre proche
      const landResult = findNearbyLand(coords.lat, coords.lon, age);
      if (landResult) {
        if (verbose) {
          console.log(
            `   🔧 Point corrigé vers terre proche: ${landResult.lat.toFixed(2)}°, ${landResult.lon.toFixed(2)}°`,
          );
        }
        coords = landResult;
        validationStatus = "corrected_to_land";
      } else {
        if (verbose) {
          console.log(
            `   ⚠️  Point reconstruit en mer (${age} Ma) - conservation de la position GPlates`,
          );
        }
        validationStatus = "ocean_no_correction";
      }
    }
    // onLand === null → pas de données GeoJSON, reste "unvalidated"
  }

  // Vérifier les collisions avec les items existants
  const COLLISION_THRESHOLD = 3.0; // 3° de distance minimale
  let finalLat = coords.lat;
  let finalLon = coords.lon;

  for (const existingItem of existingItems) {
    if (existingItem.id === item.id) continue;

    const periodData = existingItem.periods?.[String(age)];
    if (!periodData) continue;

    const distance = Math.sqrt(
      Math.pow(periodData.lat - finalLat, 2) +
        Math.pow(periodData.lon - finalLon, 2),
    );

    if (distance < COLLISION_THRESHOLD) {
      const offsetLat = (Math.random() - 0.5) * 6;
      const offsetLon = (Math.random() - 0.5) * 6;
      finalLat = coords.lat + offsetLat;
      finalLon = coords.lon + offsetLon;

      if (verbose) {
        console.log(
          `   ⚠️  Collision détectée avec "${existingItem.slug}" - dispersion appliquée`,
        );
      }
      break;
    }
  }

  return {
    age,
    lat: finalLat,
    lon: finalLon,
    validationStatus,
  };
}

/**
 * Reconstruit un item pour toutes les périodes (mode full reconstruction)
 * @param {object} item - Item avec coordonnées modernes
 * @param {Array<{time: number, name: string}>} periods - Liste des périodes
 * @param {object} options - Options (delay, verbose)
 * @returns {Promise<object>} - Object avec périodes reconstruites
 */
async function reconstructItemForAllPeriods(item, periods, options = {}) {
  const { delay = 100, verbose = false } = options;
  const { latitude, longitude } = item;

  const reconstructed = {};

  for (const period of periods) {
    const coords = await reconstructPoint(latitude, longitude, period.time);
    reconstructed[String(period.time)] = {
      lat: coords.lat,
      lon: coords.lon,
    };

    if (verbose) {
      process.stdout.write(".");
    }

    // Respecter les rate limits de l'API
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return reconstructed;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Constants
  PERIOD_MAPPING,
  PERIODS,
  GPLATES_API_URL,
  GPLATES_MODEL,
  GPLATES_MAX_AGE,

  // Utility functions
  getPeriodAge,
  isOceanicItem,
  exceedsAPILimit,
  buildDerivedFields,

  // Land validation
  isPointOnLand,
  findNearbyLand,
  getNearestAvailableAge,
  AVAILABLE_GEOJSON_AGES,

  // Reconstruction functions
  reconstructPoint,
  reconstructItemForPeriod,
  reconstructItemForAllPeriods,
};
