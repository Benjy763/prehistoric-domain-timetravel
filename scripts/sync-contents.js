#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Sync Contents
 *
 * Point d'entrée unique du pipeline de données.
 * Modes :
 *   (défaut)        Incrémental — détecte nouveaux/modifiés/supprimés
 *   --all           Rebuild complet
 *   --slugs=a,b     Import ciblé
 *   --dry-run       Simulation sans modifications
 *   --limit=N       Limiter à N items (test)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { getCategoryName, getPreviewUrl } = require("./cms-helpers.js");

const COLLECTION_ID = "679d148479ad083f33c518a1";
const BTS_CATEGORY_ID = "5b90531d7e27d60e0d1f4e226449b55e"; // texts / Behind The Scenes

function readToken() {
  if (process.env.WEBFLOW_TOKEN) return process.env.WEBFLOW_TOKEN;

  const mcpPath = path.resolve(__dirname, "../.vscode/mcp.json");
  if (!fs.existsSync(mcpPath)) return null;

  const raw = fs.readFileSync(mcpPath, "utf8");
  const match = raw.match(/"WEBFLOW_TOKEN"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

async function fetchAllItems(token) {
  let allItems = [];
  let offset = 0;
  let hasMore = true;

  console.log("📥 Récupération des items depuis le CMS...\n");

  while (hasMore) {
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items?offset=${offset}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
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

    hasMore = items.length === 100;
    offset += 100;
  }

  console.log(`✅ ${allItems.length} items trouvés au total\n`);
  return allItems;
}

function loadExistingContentData() {
  const contentDataPath = path.join(
    __dirname,
    "../assets/data/content-data.json",
  );

  if (!fs.existsSync(contentDataPath)) {
    return { items: [] };
  }

  return JSON.parse(fs.readFileSync(contentDataPath, "utf8"));
}

function findNewItems(cmsItems, options = {}) {
  const existingData = loadExistingContentData();
  const existingIds = new Set(existingData.items.map((item) => item.id));

  const newItems = [];
  const updatedItems = [];
  const readyToDisplay = [];
  const toRemove = [];
  const toDisable = [];

  // 1. Build a Set of active CMS IDs (display-on-app = true)
  const cmsActiveIds = new Set();
  const cmsAllIds = new Set();

  for (const item of cmsItems) {
    cmsAllIds.add(item.id);
    const freeTags = item.fieldData["free-tags"] || "";
    const hasFreeTags = freeTags.trim().length > 0;
    const displayOnApp = !!item.fieldData["display-on-app"];
    const isArchived = !!item.isArchived;
    const isDraft = !!item.isDraft;

    // Active items: have free-tags AND display-on-app AND not archived/draft
    if (hasFreeTags && displayOnApp && !isArchived && !isDraft) {
      cmsActiveIds.add(item.id);
    }

    const isBTS = item.fieldData["top-category"] === BTS_CATEGORY_ID;

    // Brand new eligible items (not BTS, have free-tags)
    // → will be auto-activated display-on-app by the pipeline
    if (
      !existingIds.has(item.id) &&
      hasFreeTags &&
      !isBTS &&
      !isArchived &&
      !isDraft
    ) {
      newItems.push(item);
    }

    // Items not yet eligible: BTS with free-tags, or non-BTS without free-tags (info only)
    else if (
      !existingIds.has(item.id) &&
      !isArchived &&
      !isDraft &&
      (isBTS || !hasFreeTags)
    ) {
      readyToDisplay.push(item);
    }

    // Recently modified items (check lastUpdated)
    else if (
      existingIds.has(item.id) &&
      hasFreeTags &&
      displayOnApp &&
      !isArchived &&
      !isDraft
    ) {
      const existingItem = existingData.items.find((i) => i.id === item.id);
      const cmsUpdated = new Date(item.lastUpdated);

      // Compare with item's lastUpdated in content-data,
      // or the global generation date as fallback
      let lastProcessed;
      if (existingItem && existingItem.lastUpdated) {
        lastProcessed = new Date(existingItem.lastUpdated);
      } else {
        lastProcessed = new Date(existingData.metadata.generated);
      }

      if (cmsUpdated > lastProcessed) {
        updatedItems.push(item);
      }
    }

    // Items disabled in CMS (display-on-app = false, archived, or draft)
    else if (
      existingIds.has(item.id) &&
      (!displayOnApp || isArchived || isDraft)
    ) {
      toDisable.push(item);
    }
  }

  // 2. Detect items deleted from CMS (in content-data but no longer in CMS)
  for (const existingItem of existingData.items) {
    if (!cmsAllIds.has(existingItem.id)) {
      toRemove.push(existingItem);
    }
  }

  // 3. Detect items in content-data but disabled in CMS
  for (const existingItem of existingData.items) {
    if (cmsAllIds.has(existingItem.id) && !cmsActiveIds.has(existingItem.id)) {
      // Skip if already in toDisable
      if (!toDisable.find((i) => i.id === existingItem.id)) {
        toDisable.push(existingItem);
      }
    }
  }

  return {
    newItems,
    updatedItems,
    readyToDisplay,
    toRemove,
    toDisable,
    total:
      newItems.length +
      updatedItems.length +
      readyToDisplay.length +
      toRemove.length +
      toDisable.length,
  };
}

function displaySummary(result) {
  console.log("─".repeat(80));
  console.log("📊 ANALYSE DES NOUVEAUX CONTENUS");
  console.log("─".repeat(80));
  console.log(
    `🆕 Nouveaux items (pas encore dans le globe):        ${result.newItems.length}`,
  );
  console.log(
    `🔄 Items modifiés (mise à jour nécessaire):          ${result.updatedItems.length}`,
  );
  console.log(
    `⏳ Items prêts (free-tags OK, display-on-app OFF):   ${result.readyToDisplay.length}`,
  );
  console.log(
    `🗑️  Items à supprimer (supprimés du CMS):            ${result.toRemove.length}`,
  );
  console.log(
    `⏸️  Items à désactiver (display-on-app OFF dans CMS): ${result.toDisable.length}`,
  );
  console.log("─".repeat(80));
  console.log(
    `📈 TOTAL de changements:                             ${result.total}`,
  );
  console.log("─".repeat(80));

  if (result.total === 0) {
    console.log("\n✅ Aucun changement à appliquer. Tout est à jour !\n");
    return;
  }

  // Show details
  if (result.newItems.length > 0) {
    console.log("\n🆕 NOUVEAUX ITEMS:\n");
    result.newItems.forEach((item, index) => {
      console.log(
        `   ${index + 1}. ${item.fieldData.name} (${item.fieldData.slug})`,
      );
      console.log(`      Free-tags: "${item.fieldData["free-tags"]}"`);
    });
  }

  if (result.readyToDisplay.length > 0) {
    console.log("\n⏳ ITEMS PRÊTS À AFFICHER:\n");
    result.readyToDisplay.forEach((item, index) => {
      console.log(
        `   ${index + 1}. ${item.fieldData.name} (${item.fieldData.slug})`,
      );
      console.log(`      Free-tags: "${item.fieldData["free-tags"]}"`);
    });
  }

  if (result.updatedItems.length > 0) {
    console.log("\n🔄 ITEMS MODIFIÉS:\n");
    result.updatedItems.forEach((item, index) => {
      console.log(
        `   ${index + 1}. ${item.fieldData.name} (${item.fieldData.slug})`,
      );
      console.log(`      Mis à jour: ${item.lastUpdated}`);
    });
  }

  if (result.toRemove.length > 0) {
    console.log("\n🗑️  ITEMS À SUPPRIMER (supprimés du CMS):\n");
    result.toRemove.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name} (${item.slug})`);
    });
  }

  if (result.toDisable.length > 0) {
    console.log("\n⏸️  ITEMS À DÉSACTIVER (display-on-app OFF dans CMS):\n");
    result.toDisable.forEach((item, index) => {
      const name = item.fieldData ? item.fieldData.name : item.name;
      const slug = item.fieldData ? item.fieldData.slug : item.slug;
      console.log(`   ${index + 1}. ${name} (${slug})`);
    });
  }

  console.log();
}

/**
 * Disable items that failed geocoding (set display-on-app = false).
 */
async function disableFailedItems(token, failedItemIds) {
  if (failedItemIds.length === 0) return;

  console.log(
    `\n⏸️  Désactivation de ${failedItemIds.length} items échoués (display-on-app = false)...\n`,
  );

  // Batch by 100
  for (let i = 0; i < failedItemIds.length; i += 100) {
    const batch = failedItemIds.slice(i, i + 100);

    const updates = batch.map((id) => ({
      id,
      fieldData: { "display-on-app": false },
    }));

    const response = await fetch(
      `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: updates }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Erreur API (disable): ${response.status} ${response.statusText} - ${error}`,
      );
    }
  }

  console.log(`✅ ${failedItemIds.length} items désactivés\n`);
}

/**
 * Auto-activate display-on-app for eligible new items (not BTS).
 * Non-blocking: logs errors but does not throw.
 */
async function updateDisplayOnApp(token, items) {
  console.log(
    `\n🔛 Auto-activation display-on-app pour ${items.length} item(s) éligible(s)...\n`,
  );

  let activatedCount = 0;

  for (let i = 0; i < items.length; i += 100) {
    const batch = items.slice(i, i + 100);
    const updates = batch.map((item) => ({
      id: item.id,
      fieldData: { "display-on-app": true },
    }));

    const response = await fetch(
      `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: updates }),
      },
    );

    if (response.ok) {
      activatedCount += batch.length;
    } else {
      const error = await response.text();
      console.error(
        `⚠️  Erreur auto-activation: ${response.status} - ${error}`,
      );
    }
  }

  console.log(`✅ ${activatedCount}/${items.length} item(s) activé(s)\n`);
}

async function runPipeline(
  token,
  incremental = false,
  limit = null,
  slugs = null,
) {
  console.log("\n🚀 LANCEMENT DU PIPELINE AUTOMATIQUE\n");
  console.log("─".repeat(80));

  try {
    // Step 1: Geocoding
    console.log("\n▶️  Géocodage automatique...\n");
    let geocodeCmd = `node ${path.join(__dirname, "import-cms-items.js")}`;
    if (slugs && slugs.length > 0) {
      geocodeCmd += ` --slugs=${slugs.join(",")}`;
    } else if (limit) {
      geocodeCmd += ` --limit=${limit}`;
    }
    execSync(geocodeCmd, { stdio: "inherit" });
    console.log("\n✅ Géocodage terminé\n");

    // Step 2: Disable failed items
    const geocodingResultsFile = path.join(__dirname, "../geocoded-items.json");
    if (fs.existsSync(geocodingResultsFile)) {
      const geocodingResults = JSON.parse(
        fs.readFileSync(geocodingResultsFile, "utf8"),
      );
      const failedItems = geocodingResults.failed || [];

      if (failedItems.length > 0) {
        console.log(
          `\n⚠️  ${failedItems.length} items ont échoué la géocodification:\n`,
        );
        failedItems.forEach((item, index) => {
          console.log(
            `   ${index + 1}. ${item.name} (${item.slug}) - Raison: ${item.reason}`,
          );
        });

        const failedIds = failedItems.map((item) => item.id);
        await disableFailedItems(token, failedIds);
      } else {
        console.log("\n✅ Aucun item n'a échoué\n");
      }
    }

    // Step 3: Reconstruction (incremental or full)
    if (incremental) {
      console.log(
        "\n▶️  Reconstruction paléogéographique INCRÉMENTALE (nouveaux/modifiés seulement)...\n",
      );
      let reconstructCmd = `node ${path.join(__dirname, "reconstruct-paleogeography.js")} --incremental`;
      if (slugs && slugs.length > 0) {
        reconstructCmd += ` --slugs=${slugs.join(",")}`;
      } else if (limit) {
        reconstructCmd += ` --limit=${limit}`;
      }
      execSync(reconstructCmd, { stdio: "inherit" });
    } else {
      console.log(
        "\n▶️  Reconstruction paléogéographique COMPLÈTE (tous les items)...\n",
      );
      let reconstructCmd = `node ${path.join(__dirname, "reconstruct-paleogeography.js")}`;
      if (slugs && slugs.length > 0) {
        reconstructCmd += ` --slugs=${slugs.join(",")}`;
      } else if (limit) {
        reconstructCmd += ` --limit=${limit}`;
      }
      execSync(reconstructCmd, { stdio: "inherit" });
    }
    console.log("\n✅ Reconstruction terminée\n");

    // Clean up temporary files
    const tempFiles = [path.join(__dirname, "../geocoded-items.json")];

    for (const tempFile of tempFiles) {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log(
          `🗑️  Fichier temporaire supprimé: ${path.basename(tempFile)}`,
        );
      }
    }
    console.log("");

    console.log("─".repeat(80));
    console.log("✅ PIPELINE TERMINÉ AVEC SUCCÈS");
    console.log("─".repeat(80));
  } catch (error) {
    console.log("\n" + "─".repeat(80));
    console.log("❌ ERREUR LORS DU PIPELINE");
    console.log("─".repeat(80));
    throw error;
  }
}

/**
 * Merge ALL CMS items into content-data.json
 * - Eligible items: keep full data with paleo coords (from pipeline)
 * - Non-eligible items: add basic metadata only (no coords)
 */
async function mergeAllCMSItems(allCMSItems) {
  console.log("\n🔄 Fusion de TOUS les items CMS dans content-data.json...\n");

  // 1. Load current content-data.json (contains eligible items with paleo coords)
  const contentDataPath = path.join(__dirname, "../assets/data/content-data.json");
  const contentData = loadExistingContentData();
  const eligibleItemsMap = new Map(contentData.items.map(item => [item.id, item]));

  // 2. Use already-fetched CMS items (passed as parameter)

  // 3. Build merged items array
  const mergedItems = [];

  for (const cmsItem of allCMSItems) {
    // Skip archived and draft items entirely
    if (cmsItem.isArchived || cmsItem.isDraft) {
      continue;
    }

    const itemId = cmsItem.id;
    const freeTags = cmsItem.fieldData["free-tags"] || "";
    const hasFreeTags = freeTags.trim().length > 0;
    const displayOnApp = !!cmsItem.fieldData["display-on-app"];
    const isEligible = hasFreeTags && displayOnApp;

    if (eligibleItemsMap.has(itemId)) {
      // Eligible item with full paleo data → keep it
      mergedItems.push(eligibleItemsMap.get(itemId));
    } else {
      // Non-eligible item → add basic metadata only
      const category = getCategoryName(cmsItem.fieldData["top-category"]);
      const preview = getPreviewUrl(cmsItem, category);

      mergedItems.push({
        id: itemId,
        name: cmsItem.fieldData.name || "",
        slug: cmsItem.fieldData.slug || "",
        description: cmsItem.fieldData.description || "",
        creditsLine: cmsItem.fieldData["credits-line"] || "",
        category,
        isNew: !!cmsItem.fieldData.new,
        displayOnApp,
        geologicalPeriod: cmsItem.fieldData["geological-period"] || null,
        contentLink: cmsItem.fieldData["content-link"] || null,
        youtubeId: cmsItem.fieldData["youtube-video-id"] || null,
        lastUpdated: cmsItem.lastUpdated,
        createdOn: cmsItem.createdOn || null,
        youtubeUrl: cmsItem.fieldData["youtube-video-id"]
          ? `https://www.youtube.com/watch?v=${cmsItem.fieldData["youtube-video-id"]}`
          : null,
        backgroundImage: cmsItem.fieldData["background"]?.url || null,
        galleryImage: cmsItem.fieldData["gallery-low-quality-image"]?.url || null,
        preview,
        pageUrl: `https://www.prehistoricdomain.com/content/${cmsItem.fieldData.slug}`,
        freeTags: freeTags,
        // NO paleo coords for non-eligible items
        modernLat: null,
        modernLon: null,
        estimatedAge: null,
        location: null,
        confidence: null,
        paleoValidation: null,
        periods: {}
      });
    }
  }

  // 4. Update content-data.json with all items
  const updatedData = {
    ...contentData,
    metadata: {
      ...contentData.metadata,
      totalItems: mergedItems.length,
      sourceItems: allCMSItems.length,
      eligibleItems: eligibleItemsMap.size,
      generated: new Date().toISOString()
    },
    items: mergedItems
  };

  fs.writeFileSync(contentDataPath, JSON.stringify(updatedData, null, 2));

  console.log(`✅ ${mergedItems.length} items au total dans content-data.json`);
  console.log(`   ├─ ${eligibleItemsMap.size} items éligibles (avec coords paléo)`);
  console.log(`   └─ ${mergedItems.length - eligibleItemsMap.size} items non-éligibles (métadonnées uniquement)\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    all: args.includes("--all"),
    dryRun: args.includes("--dry-run"),
    limit: null,
    slugs: null,
  };

  // Parse --limit=N
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  if (limitArg) {
    options.limit = parseInt(limitArg.split("=")[1], 10);
  }

  // Parse --slugs=slug1,slug2,slug3
  const slugsArg = args.find((arg) => arg.startsWith("--slugs="));
  if (slugsArg) {
    options.slugs = slugsArg
      .split("=")[1]
      .split(",")
      .map((s) => s.trim());
  }

  const token = readToken();

  if (!token) {
    console.error("\n❌ WEBFLOW_TOKEN manquant.\n");
    process.exit(1);
  }

  console.log("\n🌍 PREHISTORIC DOMAIN - Sync Contents\n");

  if (options.all) {
    console.log(
      "⚠️  Mode --all: réimportation complète de tous les contenus\n",
    );
  }

  if (options.limit) {
    console.log(`⚙️  Mode test: limite à ${options.limit} items\n`);
  }

  if (options.dryRun) {
    console.log("🔍 Mode --dry-run: simulation sans modifications\n");
  }

  if (options.slugs) {
    console.log(
      `🎯 Mode --slugs: import ciblé de ${options.slugs.length} slug(s)\n`,
    );
    console.log(`   Slugs: ${options.slugs.join(", ")}\n`);
  }

  // 1. Fetch all CMS items
  let allItems = await fetchAllItems(token);

  // Filter by slugs if specified
  if (options.slugs && options.slugs.length > 0) {
    const beforeFilter = allItems.length;
    allItems = allItems.filter((item) =>
      options.slugs.includes(item.fieldData.slug),
    );
    console.log(
      `✅ ${allItems.length} item(s) trouvé(s) sur ${beforeFilter} (filtré par slug)\n`,
    );

    // Check for missing slugs
    const foundSlugs = allItems.map((item) => item.fieldData.slug);
    const notFound = options.slugs.filter((slug) => !foundSlugs.includes(slug));
    if (notFound.length > 0) {
      console.log(`⚠️  Slugs non trouvés: ${notFound.join(", ")}\n`);
    }
  }

  // 2. Analyze changes
  const result =
    options.all || options.slugs
      ? {
          newItems: allItems.filter(
            (item) =>
              item.fieldData["free-tags"] &&
              !item.isArchived &&
              !item.isDraft &&
              item.fieldData["display-on-app"],
          ),
          updatedItems: [],
          readyToDisplay: [],
          toRemove: [],
          toDisable: [],
          total: allItems.filter(
            (item) =>
              item.fieldData["free-tags"] &&
              !item.isArchived &&
              !item.isDraft &&
              item.fieldData["display-on-app"],
          ).length,
        }
      : findNewItems(allItems);

  // Apply limit if specified
  if (options.limit && result.newItems.length > options.limit) {
    console.log(
      `⚠️  Limitation à ${options.limit} items sur ${result.newItems.length} trouvés\n`,
    );
    result.newItems = result.newItems.slice(0, options.limit);
    result.total = options.limit;
  }

  // 3. Display summary
  displaySummary(result);

  if (result.total === 0) {
    process.exit(0);
  }

  // 4. Launch pipeline
  if (!options.dryRun) {
    console.log(`\n▶️  Traitement de ${result.total} changement(s)...\n`);
  }

  if (options.dryRun) {
    console.log("\n✅ Simulation terminée (--dry-run activé)\n");
    process.exit(0);
  }

  // 5. Auto-activate display-on-app for eligible items (not BTS)
  if (result.newItems.length > 0) {
    const itemsToActivate = result.newItems.filter(
      (item) => !item.fieldData["display-on-app"],
    );
    if (itemsToActivate.length > 0) {
      await updateDisplayOnApp(token, itemsToActivate);
    }
  }

  // 6. Run pipeline
  // Incremental if only a few new/modified items
  // Full if --all or many changes (> 50% of items)
  if (
    result.newItems.length > 0 ||
    result.updatedItems.length > 0 ||
    result.readyToDisplay.length > 0
  ) {
    const totalChanges =
      result.newItems.length +
      result.updatedItems.length +
      result.readyToDisplay.length;
    const existingData = loadExistingContentData();
    const percentageChange =
      existingData.items.length > 0
        ? (totalChanges / existingData.items.length) * 100
        : 100;

    const useIncremental =
      !options.all && percentageChange < 50 && existingData.items.length > 0;

    console.log(
      `\n📊 ${totalChanges} items à traiter (${percentageChange.toFixed(1)}% du total)\n`,
    );
    console.log(
      `   Mode: ${useIncremental ? "INCRÉMENTAL ⚡" : "COMPLET 🔄"}\n`,
    );

    await runPipeline(token, useIncremental, options.limit, options.slugs);
  }

  // 7. Clean up content-data.json (removed or disabled items)
  if (result.toRemove.length > 0 || result.toDisable.length > 0) {
    console.log("\n🗑️  Nettoyage de content-data.json...\n");

    const existingData = loadExistingContentData();
    const idsToRemove = new Set([
      ...result.toRemove.map((i) => i.id),
      ...result.toDisable.map((i) => (i.fieldData ? i.id : i.id)),
    ]);

    const cleanedItems = existingData.items.filter(
      (item) => !idsToRemove.has(item.id),
    );

    const cleanedData = {
      ...existingData,
      items: cleanedItems,
      metadata: {
        ...existingData.metadata,
        totalItems: cleanedItems.length,
        generated: new Date().toISOString(),
      },
    };

    fs.writeFileSync(
      path.join(__dirname, "../assets/data/content-data.json"),
      JSON.stringify(cleanedData, null, 2),
    );

    console.log(`✅ ${idsToRemove.size} items retirés de content-data.json\n`);
  }

  // 8. Merge ALL CMS items (eligible + non-eligible)
  await mergeAllCMSItems(allItems);

  // 9. Display final result
  const contentData = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../assets/data/content-data.json"),
      "utf8",
    ),
  );

  console.log("\n📊 RÉSULTAT FINAL\n");
  console.log(
    `   Total items dans le globe: ${contentData.metadata.totalItems}`,
  );
  console.log(`   Items éligibles: ${contentData.metadata.eligibleItems}`);
  console.log(`   Dernière génération: ${contentData.metadata.generated}`);

  console.log(
    "\n💡 Ouvrez index.html dans votre navigateur pour voir les nouveaux contenus.\n",
  );
}

main().catch((error) => {
  console.error("\n❌ Erreur:", error.message, "\n");
  process.exit(1);
});
