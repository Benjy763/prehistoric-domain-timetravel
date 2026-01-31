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
const {
  PERIODS,
  reconstructItemForPeriod,
  buildDerivedFields,
} = require("./paleo-reconstruction");

// ============================================
// CONFIGURATION
// ============================================

const OUTPUT_FILE = "assets/data/content-data.json";

// Support du mode sample (--sample) pour tester sur peu d'items
const SAMPLE_MODE = process.argv.includes("--sample");
const SAMPLE_SIZE = 20;

// ============================================
// FONCTION DE RECONSTRUCTION
// ============================================

/**
 * Reconstruit la période la plus proche pour un item
 * Utilise le module centralisé paleo-reconstruction.js
 */
async function reconstructClosestPeriod(
  item,
  index,
  total,
  existingItems = [],
) {
  const { latitude, longitude, name, geologicalPeriod, age } = item;

  console.log(`\n[${index + 1}/${total}] 🔄 ${name}`);
  console.log(`   Position moderne: ${latitude}°, ${longitude}°`);
  console.log(`   Période: ${geologicalPeriod} (~${age} Ma)`);

  // Utiliser le module centralisé pour la reconstruction
  const result = await reconstructItemForPeriod(item, {
    verbose: false,
    existingItems,
  });

  if (!result) {
    console.log(`   ⚠️  Période géologique inconnue: ${geologicalPeriod}`);
    return null;
  }

  // Construire les champs dérivés via le module centralisé
  const derivedFields = buildDerivedFields(item);

  const periods = {};
  periods[String(result.age)] = {
    lat: result.lat,
    lon: result.lon,
  };
  process.stdout.write("✓");

  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    creditsLine: item.creditsLine,
    creatorLink: item.creatorLink,
    category: item.category,
    isNew: !!item.isNew,
    displayOnApp: !!item.displayOnApp,
    geologicalPeriod: item.geologicalPeriod || null,
    contentLink: item.contentLink || null,
    youtubeId: item.youtubeId || null,
    youtubeUrl: derivedFields.youtubeUrl,
    backgroundImage: item.backgroundImage,
    galleryImage: item.galleryImage,
    preview: derivedFields.preview,
    pageUrl: derivedFields.pageUrl,
    freeTags: item.freeTags,
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
  if (SAMPLE_MODE) {
    console.log("📝 MODE SAMPLE (2 items) - test e2e\n");
  }
  console.log("📋 Chargement des coordonnées modernes (Webflow)...\n");

  try {
    const geocodingData = await fetchGeocodedItems({
      writeFile: false,
      log: true,
    });

    let eligibleItems = geocodingData.filter(
      (item) => item.displayOnApp && item.geologicalPeriod,
    );

    // Mode sample : ne traiter que 2 items
    if (SAMPLE_MODE) {
      eligibleItems = eligibleItems.slice(0, SAMPLE_SIZE);
    }

    const skippedItems = geocodingData.length - eligibleItems.length;

    console.log(`✅ ${geocodingData.length} items chargés\n`);
    console.log(
      `✅ ${eligibleItems.length} items éligibles (display-on-app + geological-period)`,
    );
    if (skippedItems > 0) {
      console.log(`⏭️  ${skippedItems} items ignorés (incomplets)`);
    }
    console.log("\n🔄 Reconstruction des coordonnées historiques...");
    console.log(
      `   (1 période par item × ${eligibleItems.length} items = ${eligibleItems.length} appels API)\n`,
    );
    console.log("─".repeat(80));

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < eligibleItems.length; i++) {
      const reconstructed = await reconstructClosestPeriod(
        eligibleItems[i],
        i,
        eligibleItems.length,
        results, // Passer les items déjà reconstruits pour éviter collisions océaniques
      );
      if (reconstructed) {
        results.push(reconstructed);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n" + "─".repeat(80));
    console.log(`\n📊 Résumé:`);
    console.log(`   Items traités: ${results.length}`);
    console.log(`   Appels API: ${results.length} (1 période par item)`);
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
        sourceItems: geocodingData.length,
        eligibleItems: eligibleItems.length,
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
