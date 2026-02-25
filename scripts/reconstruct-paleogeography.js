#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Reconstruction Paléogéographique
 *
 * Calcule les coordonnées paléo pour la période géologique de chaque item
 * (1 appel GPlates API par item).
 *
 * Modes :
 *   (défaut)        Reconstruction complète de tous les items
 *   --incremental   Seulement les items nouveaux/modifiés (merge avec existant)
 *   --sample        Test sur 20 items
 *   --slugs=a,b     Items spécifiques
 *   --limit=N       Limiter à N items
 */

const fs = require("fs");
const { fetchGeocodedItems } = require("./import-cms-items");
const {
  PERIODS,
  reconstructItemForPeriod,
  buildDerivedFields,
} = require("./paleo-reconstruction");

// ============================================
// CONFIGURATION
// ============================================

const OUTPUT_FILE = "assets/data/content-data.json";

const SAMPLE_MODE = process.argv.includes("--sample");
const INCREMENTAL_MODE = process.argv.includes("--incremental");
const SAMPLE_SIZE = 20;

// ============================================
// FONCTION DE RECONSTRUCTION
// ============================================

/**
 * Reconstruit la période géologique d'un item via GPlates API
 * 1 item = 1 période = 1 appel API
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

  const result = await reconstructItemForPeriod(item, {
    verbose: false,
    existingItems,
  });

  if (!result) {
    console.log(`   ⚠️  Période géologique inconnue: ${geologicalPeriod}`);
    return null;
  }

  const derivedFields = buildDerivedFields(item);

  const periods = {};
  periods[String(result.age)] = {
    lat: result.lat,
    lon: result.lon,
    validationStatus: result.validationStatus || "unvalidated",
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
    lastUpdated: item.lastUpdated || null,
    createdOn: item.createdOn || null,
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
    paleoValidation: result.validationStatus || "unvalidated",
    periods,
  };
}

// ============================================
// HELPERS
// ============================================

function loadExistingData() {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      return JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    }
  } catch (error) {
    console.warn(`⚠️  Impossible de charger ${OUTPUT_FILE}:`, error.message);
  }
  return null;
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

async function main() {
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
    console.log("📋 MODE SAMPLE (20 items) - test e2e\n");
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

    // Gérer le format { successful, failed } ou l'ancien format (array)
    const items = Array.isArray(geocodingData)
      ? geocodingData
      : geocodingData.successful || [];

    let eligibleItems = items.filter(
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
        const existingById = new Map(
          existingData.items.map((i) => [i.id, i]),
        );
        const newItems = eligibleItems.filter((i) => !existingById.has(i.id));
        const updatedItems = eligibleItems.filter((i) => {
          const existingItem = existingById.get(i.id);
          if (!existingItem || !i.lastUpdated) return false;
          const existingUpdated =
            existingItem.lastUpdated || existingData.metadata.generated;
          return new Date(i.lastUpdated) > new Date(existingUpdated);
        });
        const uniqueUpdates = updatedItems.filter(
          (i) => !newItems.find((n) => n.id === i.id),
        );

        console.log(`\n📊 État actuel:`);
        console.log(`   Items en base: ${existingData.items.length}`);
        console.log(`   Items éligibles actuels: ${eligibleItems.length}`);
        console.log(`   Items nouveaux: ${newItems.length}`);
        console.log(`   Items modifiés: ${uniqueUpdates.length}`);

        if (slugs && slugs.length > 0) {
          itemsToReconstruct = eligibleItems;
          console.log(
            `   Items ciblés (slugs): ${itemsToReconstruct.length}`,
          );
        } else {
          itemsToReconstruct = [...newItems, ...uniqueUpdates];
        }

        if (itemsToReconstruct.length === 0) {
          console.log("\n✨ Aucun item à reconstruire!\n");
          process.exit(0);
        }
      }
    }

    const skippedItems = items.length - eligibleItems.length;

    console.log(`\n✅ ${items.length} items chargés\n`);
    console.log(
      `✅ ${eligibleItems.length} items éligibles (display-on-app + geological-period)`,
    );
    if (skippedItems > 0) {
      console.log(`⏭️  ${skippedItems} items ignorés (incomplets)`);
    }

    console.log("\n🔄 Reconstruction des coordonnées historiques...");
    console.log(
      `   (1 période × ${itemsToReconstruct.length} items = ${itemsToReconstruct.length} appels API)\n`,
    );
    console.log("─".repeat(80));

    const results = [];
    const startTime = Date.now();

    // Préparer la liste des items existants (pour anti-collision)
    const idsToReconstruct = new Set(itemsToReconstruct.map((i) => i.id));
    const existingItemsForCollision =
      INCREMENTAL_MODE && existingData && existingData.items
        ? existingData.items.filter((i) => !idsToReconstruct.has(i.id))
        : [];

    for (let i = 0; i < itemsToReconstruct.length; i++) {
      // Pass ALL existing items + already reconstructed items for collision detection
      const allItemsForCollision = [...existingItemsForCollision, ...results];

      const reconstructed = await reconstructClosestPeriod(
        itemsToReconstruct[i],
        i,
        itemsToReconstruct.length,
        allItemsForCollision,
      );
      if (reconstructed) {
        results.push(reconstructed);
      }
    }

    // Merger avec les anciennes données en mode incrémental
    let finalItems = results;
    if (INCREMENTAL_MODE && existingData && existingData.items) {
      const newIds = new Set(results.map((i) => i.id));
      const oldItems = existingData.items.filter((i) => !newIds.has(i.id));
      finalItems = [...oldItems, ...results];
      console.log(
        `\n📊 Fusion: ${oldItems.length} anciens + ${results.length} nouveaux = ${finalItems.length} total`,
      );
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

    const output = {
      metadata: {
        generated: new Date().toISOString(),
        totalItems: finalItems.length,
        sourceItems: items.length,
        eligibleItems: eligibleItems.length,
        reconstructedItems: results.length,
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
