#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Reconstruction Paléogéographique (Mode Incrémental)
 *
 * Modes d'usage:
 *   node reconstruct-paleogeography.js           = Full (tous les items)
 *   node reconstruct-paleogeography.js --sample  = Sample (2 items, test e2e)
 *   node reconstruct-paleogeography.js --incremental = Incremental (seulement nouveaux/modifiés)
 *
 * Mode incrémental :
 * - Charge le content-data.json existant
 * - Compare avec les items CMS actuels (par ID)
 * - Reconstruit seulement les items nouveaux ou dont la dernière modification est plus récente
 * - Merge les résultats avec les anciens
 * - Économise ~70% des appels API
 */

const fs = require("fs");
const { fetchGeocodedItems } = require("./import-cms-items");
const {
  PERIODS,
  reconstructItemForAllPeriods,
  buildDerivedFields,
} = require("./paleo-reconstruction");

// Configuration
const OUTPUT_FILE = "assets/data/content-data.json";
const API_DELAY_MS = 100;

// Modes
const SAMPLE_MODE = process.argv.includes("--sample");
const INCREMENTAL_MODE = process.argv.includes("--incremental");
const SAMPLE_SIZE = 20;

/**
 * Reconstruit toutes les périodes pour un item
 * Utilise le module centralisé paleo-reconstruction.js
 */
async function reconstructAllPeriods(item, index, total) {
  const { latitude, longitude, name, geologicalPeriod } = item;

  console.log(`\n[${index + 1}/${total}] 🔄 ${name}`);
  console.log(`   Position moderne: ${latitude}°, ${longitude}°`);
  console.log(`   Période: ${geologicalPeriod}`);

  // Utiliser le module centralisé pour la reconstruction
  const periods = await reconstructItemForAllPeriods(item, {
    verbose: true,
    delay: API_DELAY_MS,
  });

  // Construire les champs dérivés via le module centralisé
  const derivedFields = buildDerivedFields(item);

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
    estimatedAge: item.age,
    location: item.location,
    confidence: item.confidence,
    periods,
    _reconstructedAt: new Date().toISOString(),
  };
}

function loadExistingData() {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
      return data;
    }
  } catch (error) {
    console.warn(`⚠️  Impossible de charger ${OUTPUT_FILE}:`, error.message);
  }
  return null;
}

async function main() {
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

  console.log("\n🌍 PREHISTORIC DOMAIN - Reconstruction Paléogéographique\n");

  if (SAMPLE_MODE) {
    console.log("📝 MODE SAMPLE (2 items) - test e2e\n");
  } else if (INCREMENTAL_MODE) {
    console.log("♻️  MODE INCREMENTAL - mise à jour seulement\n");
  }
  if (limit && !SAMPLE_MODE) {
    console.log(`⚙️  Mode test: limite à ${limit} items\n`);
  }
  if (slugs) {
    console.log(
      `🎯 Mode --slugs: reconstruction de ${slugs.length} slug(s) spécifique(s)\n`,
    );
  }

  console.log("📋 Chargement des coordonnées modernes (Webflow)...\n");

  try {
    const geocodingData = await fetchGeocodedItems({
      writeFile: false,
      log: true,
      limit: !SAMPLE_MODE ? limit : null,
      slugs: slugs,
    });

    let eligibleItems = geocodingData.filter(
      (item) => item.displayOnApp && item.geologicalPeriod,
    );

    if (SAMPLE_MODE) {
      eligibleItems = eligibleItems.slice(0, SAMPLE_SIZE);
    }

    // Mode incrémental : filtrer seulement les items à reconstruire
    let itemsToReconstruct = eligibleItems;
    let existingData = null;

    if (INCREMENTAL_MODE) {
      existingData = loadExistingData();

      if (existingData && existingData.items && existingData.items.length > 0) {
        const existingIds = new Set(existingData.items.map((i) => i.id));
        const newItems = eligibleItems.filter((i) => !existingIds.has(i.id));

        console.log(`\n📊 État actuel:`);
        console.log(`   Items en base: ${existingData.items.length}`);
        console.log(`   Items éligibles actuels: ${eligibleItems.length}`);
        console.log(`   Items nouveaux: ${newItems.length}`);

        itemsToReconstruct = newItems;

        if (newItems.length === 0) {
          console.log("\n✨ Aucun nouvel item à reconstruire!\n");
          process.exit(0);
        }
      }
    }

    const skippedItems = geocodingData.length - eligibleItems.length;

    console.log(`\n✅ ${geocodingData.length} items chargés\n`);
    console.log(
      `✅ ${eligibleItems.length} items éligibles (display-on-app + geological-period)`,
    );
    if (skippedItems > 0) {
      console.log(`⏭️  ${skippedItems} items ignorés (incomplets)`);
    }

    console.log("\n🔄 Reconstruction des coordonnées historiques...");
    console.log(
      `   (${PERIODS.length} périodes × ${itemsToReconstruct.length} items = ${PERIODS.length * itemsToReconstruct.length} appels API)\n`,
    );
    console.log("─".repeat(80));

    const reconstructedItems = [];
    const startTime = Date.now();

    for (let i = 0; i < itemsToReconstruct.length; i++) {
      const reconstructed = await reconstructAllPeriods(
        itemsToReconstruct[i],
        i,
        itemsToReconstruct.length,
      );
      reconstructedItems.push(reconstructed);
    }

    // Merger avec les anciennes données en mode incrémental
    let finalItems = reconstructedItems;
    if (INCREMENTAL_MODE && existingData && existingData.items) {
      const newIds = new Set(reconstructedItems.map((i) => i.id));
      const oldItems = existingData.items.filter((i) => !newIds.has(i.id));
      finalItems = [...oldItems, ...reconstructedItems];
      console.log(
        `\n📊 Fusion: ${oldItems.length} anciens + ${reconstructedItems.length} nouveaux = ${finalItems.length} total`,
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n" + "─".repeat(80));
    console.log(`\n📊 Résumé:`);
    console.log(`   Items traités: ${reconstructedItems.length}`);
    console.log(`   Périodes par item: ${PERIODS.length}`);
    console.log(
      `   Appels API réussis: ${reconstructedItems.length * PERIODS.length}`,
    );
    console.log(`   Temps total: ${duration}s`);

    const outputDir = OUTPUT_FILE.split("/").slice(0, -1).join("/");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const output = {
      metadata: {
        generated: new Date().toISOString(),
        totalItems: finalItems.length,
        sourceItems: geocodingData.length,
        eligibleItems: eligibleItems.length,
        reconstructedItems: reconstructedItems.length,
        mode: SAMPLE_MODE
          ? "sample"
          : INCREMENTAL_MODE
            ? "incremental"
            : "full",
        periods: PERIODS.map((p) => ({ time: p.time, name: p.name })),
        model: "MERDITH2021",
        note: "Cambrian and Ordovician use Silurian (410 Ma) data due to API limitations",
      },
      items: finalItems,
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

main();
