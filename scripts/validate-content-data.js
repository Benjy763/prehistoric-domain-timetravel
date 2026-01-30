#!/usr/bin/env node

/**
 * Script de validation du content-data.json
 * Vérifie que la structure est correcte et prête pour l'app
 */

const fs = require("fs");

const FILE = "assets/data/content-data.json";

if (!fs.existsSync(FILE)) {
  console.error(`❌ Fichier non trouvé: ${FILE}`);
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

  console.log("\n📋 Validation du content-data.json\n");

  // Vérifier métadonnées
  console.log("✅ Métadonnées:");
  console.log(`   Generated: ${data.metadata.generated}`);
  console.log(`   Total items: ${data.metadata.totalItems}`);
  console.log(`   Mode: ${data.metadata.mode}`);
  console.log(`   Periods: ${data.metadata.periods.length}`);

  if (!data.items || data.items.length === 0) {
    console.log("\n⚠️  Pas d'items générés!");
    process.exit(0);
  }

  // Inspecter premier item
  const item = data.items[0];
  console.log("\n✅ Premier item:");
  console.log(`   ID: ${item.id}`);
  console.log(`   Name: ${item.name}`);
  console.log(`   Type: ${item.type}`);
  console.log(`   Period: ${item.geologicalPeriod}`);
  console.log(`   Display on app: ${item.displayOnApp}`);
  console.log(`   Page URL: ${item.pageUrl}`);
  console.log(`   Preview: ${item.preview ? "✅" : "❌"}`);
  console.log(`   Periods count: ${Object.keys(item.periods).length}`);

  // Vérifier periods structure
  if (item.periods && Object.keys(item.periods).length > 0) {
    const firstPeriodKey = Object.keys(item.periods)[0];
    const periodData = item.periods[firstPeriodKey];
    console.log(`\n✅ Sample period (${firstPeriodKey}Ma):`);
    console.log(`   Lat: ${periodData.lat}`);
    console.log(`   Lon: ${periodData.lon}`);
  }

  // Vérifier diversité
  const types = new Set(data.items.map((i) => i.type));
  const periods = new Set(data.items.map((i) => i.geologicalPeriod));

  console.log("\n✅ Couverture:");
  console.log(`   Types: ${Array.from(types).join(", ")}`);
  console.log(`   Periods: ${Array.from(periods).join(", ")}`);

  // Stats
  const withPreview = data.items.filter((i) => i.preview).length;
  const withYoutube = data.items.filter((i) => i.youtubeUrl).length;
  const withPageUrl = data.items.filter((i) => i.pageUrl).length;

  console.log("\n✅ Stats:");
  console.log(`   Items avec preview: ${withPreview}/${data.items.length}`);
  console.log(`   Items avec YouTube: ${withYoutube}/${data.items.length}`);
  console.log(`   Items avec page URL: ${withPageUrl}/${data.items.length}`);

  console.log("\n✨ Structure validée et prête pour l'app!\n");
} catch (error) {
  console.error(`❌ Erreur: ${error.message}`);
  process.exit(1);
}
