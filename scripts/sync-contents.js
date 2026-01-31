#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Import New Contents
 *
 * Détecte et importe automatiquement les nouveaux items du CMS :
 * - Items récemment créés ou modifiés
 * - Items avec free-tags mais display-on-app = false
 * - Option --all pour tout réimporter
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const COLLECTION_ID = "679d148479ad083f33c518a1";

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

  // 1. Créer un Set des IDs du CMS avec display-on-app = true
  const cmsActiveIds = new Set();
  const cmsAllIds = new Set();

  for (const item of cmsItems) {
    cmsAllIds.add(item.id);
    const freeTags = item.fieldData["free-tags"] || "";
    const hasFreeTags = freeTags.trim().length > 0;
    const displayOnApp = !!item.fieldData["display-on-app"];
    const isArchived = !!item.isArchived;
    const isDraft = !!item.isDraft;

    // Items actifs : ont free-tags ET display-on-app ET pas archivés/draft
    if (hasFreeTags && displayOnApp && !isArchived && !isDraft) {
      cmsActiveIds.add(item.id);
    }

    // Items complètement nouveaux (pas encore dans content-data.json)
    if (!existingIds.has(item.id) && hasFreeTags && !isArchived && !isDraft) {
      newItems.push(item);
    }

    // Items avec free-tags mais pas affichés
    else if (
      hasFreeTags &&
      !displayOnApp &&
      !isArchived &&
      !isDraft &&
      !existingIds.has(item.id)
    ) {
      readyToDisplay.push(item);
    }

    // Items récemment modifiés (vérifier lastUpdated)
    else if (
      existingIds.has(item.id) &&
      hasFreeTags &&
      displayOnApp &&
      !isArchived &&
      !isDraft
    ) {
      const existingItem = existingData.items.find((i) => i.id === item.id);
      const cmsUpdated = new Date(item.lastUpdated);
      const dataGenerated = new Date(existingData.metadata.generated);

      if (cmsUpdated > dataGenerated) {
        updatedItems.push(item);
      }
    }

    // Items désactivés dans le CMS (display-on-app = false)
    else if (
      existingIds.has(item.id) &&
      (!displayOnApp || isArchived || isDraft)
    ) {
      toDisable.push(item);
    }
  }

  // 2. Détecter items supprimés du CMS (dans content-data mais plus dans CMS)
  for (const existingItem of existingData.items) {
    if (!cmsAllIds.has(existingItem.id)) {
      toRemove.push(existingItem);
    }
  }

  // 3. Détecter items dans content-data mais désactivés dans CMS
  for (const existingItem of existingData.items) {
    if (cmsAllIds.has(existingItem.id) && !cmsActiveIds.has(existingItem.id)) {
      // Vérifier si pas déjà dans toDisable
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

  // Afficher détails
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

async function updateDisplayOnApp(token, itemIds) {
  if (itemIds.length === 0) return;

  console.log(
    `\n🔄 Activation de display-on-app pour ${itemIds.length} items...\n`,
  );

  // Batch de 100
  for (let i = 0; i < itemIds.length; i += 100) {
    const batch = itemIds.slice(i, i + 100);

    const updates = batch.map((id) => ({
      id,
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Erreur API (update): ${response.status} ${response.statusText} - ${error}`,
      );
    }
  }

  console.log("✅ display-on-app activé\n");
}

function runPipeline(incremental = false, limit = null, slugs = null) {
  console.log("\n🚀 LANCEMENT DU PIPELINE AUTOMATIQUE\n");
  console.log("─".repeat(80));

  try {
    // Étape 1: Géocodage
    console.log("\n▶️  Géocodage automatique...\n");
    let geocodeCmd = `node ${path.join(__dirname, "import-cms-items.js")}`;
    if (slugs && slugs.length > 0) {
      geocodeCmd += ` --slugs=${slugs.join(",")}`;
    } else if (limit) {
      geocodeCmd += ` --limit=${limit}`;
    }
    execSync(geocodeCmd, { stdio: "inherit" });
    console.log("\n✅ Géocodage terminé\n");

    // Étape 2: Reconstruction (incrémentale ou complète)
    if (incremental) {
      console.log(
        "\n▶️  Reconstruction paléogéographique INCRÉMENTALE (nouveaux/modifiés seulement)...\n",
      );
      let reconstructCmd = `node ${path.join(__dirname, "reconstruct-paleogeography-incremental.js")} --incremental`;
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

    // Nettoyer le fichier temporaire
    const tempFile = path.join(__dirname, "../geocoded-items.json");
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log("🗑️  Fichier temporaire supprimé: geocoded-items.json\n");
    }

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

  console.log("\n🌍 PREHISTORIC DOMAIN - Import New Contents\n");

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

  // 1. Récupérer tous les items
  let allItems = await fetchAllItems(token);

  // Filtrer par slugs si spécifié
  if (options.slugs && options.slugs.length > 0) {
    const beforeFilter = allItems.length;
    allItems = allItems.filter((item) =>
      options.slugs.includes(item.fieldData.slug),
    );
    console.log(
      `✅ ${allItems.length} item(s) trouvé(s) sur ${beforeFilter} (filtré par slug)\n`,
    );

    // Vérifier slugs non trouvés
    const foundSlugs = allItems.map((item) => item.fieldData.slug);
    const notFound = options.slugs.filter((slug) => !foundSlugs.includes(slug));
    if (notFound.length > 0) {
      console.log(`⚠️  Slugs non trouvés: ${notFound.join(", ")}\n`);
    }
  }

  //  2. Analyser les nouveaux
  console.log("🔍 DEBUG: Début analyse des nouveaux items...");
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

  // Appliquer la limite si spécifiée
  if (options.limit && result.newItems.length > options.limit) {
    console.log(
      `⚠️  Limitation à ${options.limit} items sur ${result.newItems.length} trouvés\n`,
    );
    result.newItems = result.newItems.slice(0, options.limit);
    result.total = options.limit;
  }

  // 3. Afficher résumé
  displaySummary(result);

  if (result.total === 0) {
    process.exit(0);
  }

  // 4. Demander confirmation
  console.log(
    `🔍 DEBUG: dryRun=${options.dryRun}, slugs=${options.slugs ? options.slugs.join(",") : "none"}`,
  );
  if (!options.dryRun) {
    // Skip confirmation si --slugs (import ciblé)
    if (!options.slugs) {
      console.log(
        `\n⚠️  ${result.total} changements vont être appliqués. Continuer ?\n`,
      );
      console.log(
        "   Pour annuler, appuyez sur Ctrl+C. Pour continuer, attendez 5 secondes...\n",
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
      console.log(`\n▶️  Import de ${result.total} item(s) via --slugs...\n`);
    }
  }

  if (options.dryRun) {
    console.log("\n✅ Simulation terminée (--dry-run activé)\n");
    process.exit(0);
  }

  // 5. Activer display-on-app pour les items prêts/nouveaux
  const itemsToActivate = [
    ...result.newItems.map((i) => i.id),
    ...result.readyToDisplay.map((i) => i.id),
  ];

  if (itemsToActivate.length > 0) {
    await updateDisplayOnApp(token, itemsToActivate);
  }

  // 6. Lancer le pipeline
  // Mode incrémental si seulement quelques items nouveaux/modifiés
  // Mode complet si --all ou si beaucoup de changements (> 50% des items)
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

    runPipeline(useIncremental, options.limit, options.slugs);
  }

  // 7. Nettoyer APRÈS si besoin (items supprimés ou désactivés)
  // Seulement si on n'a PAS lancé le pipeline (car sinon déjà fait)
  else if (result.toRemove.length > 0 || result.toDisable.length > 0) {
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

  // 7. Afficher résultat final
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
