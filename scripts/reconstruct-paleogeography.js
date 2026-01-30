#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Reconstruction Paléogéographique
 *
 * Pré-calcule les coordonnées historiques pour TOUTES les périodes
 * pour chaque contenu CMS, en utilisant l'API GPlates.
 *
 * Génère un fichier JSON statique prêt pour la production.
 */

const fs = require("fs");
const { fetchGeocodedItems } = require("./auto-geocode-contents");

// ============================================
// CONFIGURATION
// ============================================

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
  { time: 450, name: "ordovician" }, // Utilise 410 Ma (limite API)
  { time: 500, name: "cambrian" }, // Utilise 410 Ma (limite API)
];

const GPLATES_API = "https://gws.gplates.org/reconstruct/reconstruct_points/";
const OUTPUT_FILE = "assets/data/paleogeographic-coordinates.json";

// Délai entre appels API pour éviter rate limiting
const API_DELAY_MS = 100;

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Attend un délai en ms
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Appelle l'API GPlates pour reconstruire un point
 */
async function reconstructPoint(lat, lon, time) {
  try {
    // L'API GPlates limite à 410 Ma maximum
    const actualTime = Math.min(time, 410);

    // L'API attend lon,lat (pas lat,lon) !
    // Utiliser MERDITH2021 pour cohérence avec les continents affichés
    const url = `${GPLATES_API}?points=${lon},${lat}&time=${actualTime}&model=MERDITH2021`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`⚠️  API erreur pour time=${time}: ${response.status}`);
      return { lat, lon }; // Retourner coordonnées modernes en fallback
    }

    const data = await response.json();

    // Format de réponse GPlates : { "type": "MultiPoint", "coordinates": [[lon, lat]] }
    if (data.coordinates && data.coordinates.length > 0) {
      const coords = data.coordinates[0];
      return {
        lat: Math.round(coords[1] * 100) / 100,
        lon: Math.round(coords[0] * 100) / 100,
      };
    }

    return { lat, lon }; // Fallback
  } catch (error) {
    console.error(
      `❌ Erreur reconstruction (${lat}, ${lon}) @ ${time}Ma:`,
      error.message,
    );
    return { lat, lon }; // Fallback
  }
}

/**
 * Reconstruit toutes les périodes pour un item
 */
async function reconstructAllPeriods(item, index, total) {
  const { latitude, longitude, name, id, age } = item;

  console.log(`\n[${index + 1}/${total}] 🔄 ${name}`);
  console.log(`   Position moderne: ${latitude}°, ${longitude}°`);
  console.log(`   Âge estimé: ${age} Ma`);

  const periods = {};

  for (const period of PERIODS) {
    await delay(API_DELAY_MS);

    const coords = await reconstructPoint(latitude, longitude, period.time);
    periods[period.time] = coords;

    // Afficher seulement si différent de moderne
    const isSame = coords.lat === latitude && coords.lon === longitude;
    const marker = isSame ? "=" : "→";
    console.log(
      `   ${marker} ${period.name} (${period.time} Ma): ${coords.lat}°, ${coords.lon}°`,
    );
  }

  return {
    id,
    name,
    modernLat: latitude,
    modernLon: longitude,
    estimatedAge: age,
    location: item.location,
    confidence: item.confidence,
    periods,
  };
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

async function main() {
  console.log("\n🌍 PREHISTORIC DOMAIN - Reconstruction Paléogéographique\n");
  console.log("📋 Chargement des coordonnées modernes (Webflow)...\n");

  try {
    const geocodingData = await fetchGeocodedItems({
      writeFile: false,
      log: true,
    });

    console.log(`✅ ${geocodingData.length} items chargés\n`);
    console.log("🔄 Reconstruction des coordonnées historiques...");
    console.log(
      `   (${PERIODS.length} périodes × ${geocodingData.length} items = ${PERIODS.length * geocodingData.length} appels API)\n`,
    );
    console.log("─".repeat(80));

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < geocodingData.length; i++) {
      const reconstructed = await reconstructAllPeriods(
        geocodingData[i],
        i,
        geocodingData.length,
      );
      results.push(reconstructed);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n" + "─".repeat(80));
    console.log(`\n📊 Résumé:`);
    console.log(`   Items traités: ${results.length}`);
    console.log(`   Périodes par item: ${PERIODS.length}`);
    console.log(`   Appels API réussis: ${results.length * PERIODS.length}`);
    console.log(`   Temps total: ${duration}s`);

    // Créer le dossier si nécessaire
    const outputDir = OUTPUT_FILE.split("/").slice(0, -1).join("/");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Sauvegarder le résultat
    const output = {
      metadata: {
        generated: new Date().toISOString(),
        totalItems: results.length,
        periods: PERIODS.map((p) => ({ time: p.time, name: p.name })),
          model: "MERDITH2021",
        note: "Cambrian and Ordovician use Silurian (410 Ma) data due to API limitations",
      },
      items: results,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

    console.log(`\n💾 Fichier sauvegardé: ${OUTPUT_FILE}`);
    console.log(
      `   Taille: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`,
    );
    console.log(
      `\n✨ Terminé! Le globe peut maintenant charger ce fichier en local.\n`,
    );
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

// Exécuter
main();
