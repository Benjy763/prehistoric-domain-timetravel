#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Add Content by Slug
 *
 * Ajoute un item spécifique au globe en utilisant son slug Webflow
 * Lance automatiquement le pipeline complet
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  reconstructItemForPeriod,
  buildDerivedFields,
} = require("./paleo-reconstruction");

const COLLECTION_ID = "679d148479ad083f33c518a1";

function readToken() {
  if (process.env.WEBFLOW_TOKEN) return process.env.WEBFLOW_TOKEN;

  const mcpPath = path.resolve(__dirname, "../.vscode/mcp.json");
  if (!fs.existsSync(mcpPath)) return null;

  const raw = fs.readFileSync(mcpPath, "utf8");
  const match = raw.match(/"WEBFLOW_TOKEN"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

async function fetchItemBySlug(token, slug) {
  console.log(`\n🔍 Recherche de l'item avec slug: "${slug}"...\n`);

  let offset = 0;
  let hasMore = true;

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

    // Chercher l'item avec ce slug
    const found = items.find((item) => item.fieldData.slug === slug);
    if (found) {
      return found;
    }

    hasMore = items.length === 100;
    offset += 100;
  }

  return null;
}

async function updateDisplayOnApp(token, itemId, value) {
  const response = await fetch(
    `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: itemId,
            fieldData: {
              "display-on-app": value,
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Erreur API (update): ${response.status} ${response.statusText} - ${error}`,
    );
  }

  return await response.json();
}

function runScript(scriptPath, description) {
  console.log(`\n▶️  ${description}...\n`);
  try {
    execSync(`node ${scriptPath}`, { stdio: "inherit" });
    console.log(`\n✅ ${description} terminé\n`);
  } catch (error) {
    console.error(`\n❌ Erreur lors de ${description}:`, error.message);
    throw error;
  }
}

function displayItemInfo(item) {
  console.log("─".repeat(80));
  console.log("📄 INFORMATIONS DE L'ITEM");
  console.log("─".repeat(80));
  console.log(`ID:          ${item.id}`);
  console.log(`Nom:         ${item.fieldData.name}`);
  console.log(`Slug:        ${item.fieldData.slug}`);
  console.log(`Type:        ${item.fieldData["content-category-cms"]}`);
  console.log(`Période:     ${item.fieldData["geological-period"]}`);
  console.log(`Free-tags:   ${item.fieldData["free-tags"] || "(vide)"}`);
  console.log(
    `Display:     ${item.fieldData["display-on-app"] ? "✅ OUI" : "❌ NON"}`,
  );
  console.log("─".repeat(80));
}

function checkFreeTags(item) {
  const freeTags = item.fieldData["free-tags"];

  if (!freeTags || freeTags.trim().length === 0) {
    console.log("\n⚠️  WARNING: L'item n'a pas de free-tags !");
    console.log(
      "   Le géocodage automatique ne pourra pas générer de coordonnées.",
    );
    console.log(
      '   Ajoutez des free-tags dans Webflow (format: "Continent, Période, Espèces")',
    );
    return false;
  }

  // Vérifier présence du continent
  const continents = [
    "north america",
    "south america",
    "asia",
    "europe",
    "africa",
    "australia",
    "india",
  ];
  const tags = freeTags.toLowerCase();
  const hasContinent = continents.some((c) => tags.includes(c));

  if (!hasContinent) {
    console.log("\n⚠️  WARNING: Aucun continent détecté dans les free-tags !");
    console.log(`   Tags actuels: "${freeTags}"`);
    console.log("   Continents valides:", continents.join(", "));
    return false;
  }

  console.log("\n✅ Free-tags valides détectés");
  console.log(`   "${freeTags}"`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("\n❌ Usage: node add-content-by-slug.js <slug>\n");
    console.log("Exemples:");
    console.log(
      "  node add-content-by-slug.js experience-giants-of-the-ice-age",
    );
    console.log("  node add-content-by-slug.js tyrannosaurus-rex\n");
    process.exit(1);
  }

  const slug = args[0];
  const token = readToken();

  if (!token) {
    console.error("\n❌ WEBFLOW_TOKEN manquant.\n");
    process.exit(1);
  }

  console.log("\n🌍 PREHISTORIC DOMAIN - Add Content by Slug\n");

  // 1. Chercher l'item
  const item = await fetchItemBySlug(token, slug);

  if (!item) {
    console.log(`\n❌ Aucun item trouvé avec le slug "${slug}"\n`);
    process.exit(1);
  }

  // 2. Afficher les infos
  displayItemInfo(item);

  // 3. Vérifier les free-tags
  const hasValidTags = checkFreeTags(item);

  if (!hasValidTags) {
    console.log(
      "\n⚠️  Voulez-vous continuer quand même ? L'item sera ignoré par le géocodage.",
    );
    console.log(
      "   Pour annuler, appuyez sur Ctrl+C. Pour continuer, attendez 5 secondes...\n",
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // 4. Activer display-on-app si free-tags présents
  if (item.fieldData["free-tags"] && !item.fieldData["display-on-app"]) {
    console.log("\n🔄 Activation de display-on-app...");
    await updateDisplayOnApp(token, item.id, true);
    console.log("✅ display-on-app activé\n");
  }

  // 5. Géocoder uniquement ce nouvel item
  console.log("\n🚀 GÉOCODAGE DE L'ITEM\n");
  console.log("─".repeat(80));

  try {
    // Charger les données existantes
    const contentDataPath = path.join(
      __dirname,
      "../assets/data/content-data.json",
    );
    let existingData = { items: [] };
    if (fs.existsSync(contentDataPath)) {
      existingData = JSON.parse(fs.readFileSync(contentDataPath, "utf8"));
    }

    // Géocoder uniquement le nouvel item
    const geocoder = require("./auto-geocode-contents.js");
    const geocodedItems = geocoder.geocodeItems([item], { log: true });

    if (geocodedItems.length === 0) {
      throw new Error("Impossible de géocoder l'item (continent manquant ?)");
    }

    const geocodedItem = geocodedItems[0];

    // Mettre à jour ou ajouter l'item dans content-data.json
    const existingIndex = existingData.items.findIndex((i) => i.id === item.id);

    // Construire les champs dérivés via le module centralisé
    const derivedFields = buildDerivedFields(geocodedItem);

    const itemWithPeriods = {
      id: geocodedItem.id,
      name: geocodedItem.name,
      slug: geocodedItem.slug,
      description: geocodedItem.description,
      creditsLine: geocodedItem.creditsLine,
      creatorLink: geocodedItem.creatorLink,
      category: geocodedItem.category,
      isNew: geocodedItem.isNew,
      displayOnApp: geocodedItem.displayOnApp,
      geologicalPeriod: geocodedItem.geologicalPeriod,
      contentLink: geocodedItem.contentLink,
      youtubeId: geocodedItem.youtubeId,
      youtubeUrl: derivedFields.youtubeUrl,
      backgroundImage: geocodedItem.backgroundImage,
      galleryImage: geocodedItem.galleryImage,
      preview: derivedFields.preview,
      pageUrl: derivedFields.pageUrl,
      freeTags: geocodedItem.freeTags,
      modernLat: geocodedItem.latitude,
      modernLon: geocodedItem.longitude,
      location: geocodedItem.location,
      confidence: geocodedItem.confidence,
      estimatedAge: geocodedItem.age,
      periods: {},
    };

    console.log("\n🔄 Reconstruction paléogéographique...\n");

    // Utiliser le module centralisé pour la reconstruction
    const result = await reconstructItemForPeriod(geocodedItem, {
      verbose: true,
      existingItems: existingData.items, // Passer les items existants pour éviter collisions océaniques
    });

    if (!result) {
      console.log(`   ✗ Reconstruction impossible pour cet item\n`);
      return;
    }

    // Stocker avec clé numérique (ex: "100" pas "100Ma")
    itemWithPeriods.periods[String(result.age)] = {
      lat: result.lat,
      lon: result.lon,
    };

    console.log(`   ✓ Position enregistrée pour ${result.age} Ma\n`);

    // Ajouter/remplacer dans le tableau
    if (existingIndex >= 0) {
      existingData.items[existingIndex] = itemWithPeriods;
    } else {
      existingData.items.push(itemWithPeriods);
    }

    // Sauvegarder
    fs.writeFileSync(contentDataPath, JSON.stringify(existingData, null, 2));
    console.log(`\n💾 Sauvegardé dans content-data.json`);

    console.log("\n" + "─".repeat(80));
    console.log("✅ PIPELINE TERMINÉ AVEC SUCCÈS");
    console.log("─".repeat(80));

    console.log("\n" + "─".repeat(80));
    console.log("✅ ITEM AJOUTÉ AVEC SUCCÈS");
    console.log("─".repeat(80));

    // Afficher le résultat
    console.log("\n📊 RÉSULTAT\n");
    console.log(`   Nom: ${itemWithPeriods.name}`);
    console.log(
      `   Position moderne: ${itemWithPeriods.modernLat}°, ${itemWithPeriods.modernLon}°`,
    );
    console.log(`   Lieu: ${itemWithPeriods.location}`);
    console.log(`   Confiance: ${itemWithPeriods.confidence}`);
    console.log(`   Âge estimé: ${itemWithPeriods.estimatedAge} Ma`);
    console.log(
      `   Période du globe: ${Object.keys(itemWithPeriods.periods)[0] || "aucune"}`,
    );

    console.log(
      "\n💡 Ouvrez index.html dans votre navigateur pour voir le résultat sur le globe.\n",
    );
  } catch (error) {
    console.log("\n" + "─".repeat(80));
    console.log("❌ ERREUR");
    console.log("─".repeat(80));
    console.error("\n", error.message, "\n");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ Erreur:", error.message, "\n");
  process.exit(1);
});
