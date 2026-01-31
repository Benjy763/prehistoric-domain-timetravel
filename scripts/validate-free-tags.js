#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Validate Free Tags
 *
 * Valide les free-tags de tous les items CMS
 * Détecte les erreurs courantes et propose des corrections
 */

const fs = require("fs");
const path = require("path");

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

  console.log(`✅ ${allItems.length} items récupérés\n`);
  return allItems;
}

const VALID_CONTINENTS = [
  "north america",
  "south america",
  "asia",
  "east asia",
  "europe",
  "africa",
  "australia",
  "india",
  "global oceans",
];

const VALID_PERIODS = [
  "late cretaceous",
  "early cretaceous",
  "cretaceous",
  "late jurassic",
  "middle jurassic",
  "early jurassic",
  "jurassic",
  "late triassic",
  "middle triassic",
  "early triassic",
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
];

function validateFreeTags(freeTags) {
  const errors = [];
  const warnings = [];
  const suggestions = [];

  if (!freeTags || freeTags.trim().length === 0) {
    errors.push("Free-tags vide");
    suggestions.push(
      'Ajoutez des tags au format: "Continent, Période, Espèces"',
    );
    return { valid: false, errors, warnings, suggestions };
  }

  const tags = freeTags.toLowerCase();

  // Vérifier continent
  const hasContinent = VALID_CONTINENTS.some((c) => tags.includes(c));
  if (!hasContinent) {
    errors.push("Aucun continent détecté");
    suggestions.push(
      `Ajoutez un continent valide: ${VALID_CONTINENTS.join(", ")}`,
    );
  }

  // Vérifier période
  const hasPeriod = VALID_PERIODS.some((p) => tags.includes(p));
  if (!hasPeriod) {
    warnings.push("Aucune période géologique détectée");
    suggestions.push("Ajoutez une période pour plus de précision (optionnel)");
  }

  // Vérifier présence d'espèces (au moins un mot de 4+ lettres)
  const words = freeTags.split(/[,\s]+/).filter((w) => w.length >= 4);
  const speciesCount = words.filter(
    (w) =>
      !VALID_CONTINENTS.includes(w.toLowerCase()) &&
      !VALID_PERIODS.includes(w.toLowerCase()),
  ).length;

  if (speciesCount === 0) {
    warnings.push("Aucune espèce détectée");
    suggestions.push("Ajoutez au moins une espèce ou formation");
  }

  // Vérifier doublons
  const tagsArray = freeTags.split(",").map((t) => t.trim());
  const uniqueTags = new Set(tagsArray.map((t) => t.toLowerCase()));
  if (tagsArray.length !== uniqueTags.size) {
    warnings.push("Tags en doublon détectés");
  }

  // Vérifier format (devrait contenir des virgules)
  if (!freeTags.includes(",")) {
    warnings.push("Format inhabituel (pas de virgules)");
    suggestions.push('Format recommandé: "Continent, Période, Espèces"');
  }

  const valid = errors.length === 0;

  return { valid, errors, warnings, suggestions };
}

function analyzeItems(items) {
  const results = {
    total: items.length,
    withFreeTags: 0,
    withoutFreeTags: 0,
    valid: 0,
    invalid: 0,
    warnings: 0,
    details: [],
  };

  for (const item of items) {
    const freeTags = item.fieldData["free-tags"] || "";
    const hasFreeTags = freeTags.trim().length > 0;

    if (hasFreeTags) {
      results.withFreeTags++;
      const validation = validateFreeTags(freeTags);

      if (validation.valid) {
        results.valid++;
      } else {
        results.invalid++;
      }

      if (validation.warnings.length > 0) {
        results.warnings++;
      }

      // Stocker détails si erreurs ou warnings
      if (validation.errors.length > 0 || validation.warnings.length > 0) {
        results.details.push({
          id: item.id,
          name: item.fieldData.name,
          slug: item.fieldData.slug,
          freeTags: freeTags,
          validation: validation,
        });
      }
    } else {
      results.withoutFreeTags++;
    }
  }

  return results;
}

function displayReport(results) {
  console.log("═".repeat(80));
  console.log("📊 RAPPORT DE VALIDATION DES FREE-TAGS");
  console.log("═".repeat(80));
  console.log();

  // Statistiques globales
  console.log("📈 STATISTIQUES GLOBALES:\n");
  console.log(`   Total items:              ${results.total}`);
  console.log(`   Avec free-tags:           ${results.withFreeTags}`);
  console.log(`   Sans free-tags:           ${results.withoutFreeTags}`);
  console.log(`   ✅ Valides:               ${results.valid}`);
  console.log(`   ❌ Invalides:             ${results.invalid}`);
  console.log(`   ⚠️  Avec avertissements:  ${results.warnings}`);
  console.log();

  // Taux de validation
  if (results.withFreeTags > 0) {
    const validPercent = ((results.valid / results.withFreeTags) * 100).toFixed(
      1,
    );
    console.log(`   Taux de validation: ${validPercent}%`);
    console.log();
  }

  // Détails des problèmes
  if (results.details.length > 0) {
    console.log("═".repeat(80));
    console.log("🔍 DÉTAILS DES PROBLÈMES:");
    console.log("═".repeat(80));
    console.log();

    results.details.forEach((detail, index) => {
      console.log(`${index + 1}. ${detail.name}`);
      console.log(`   Slug: ${detail.slug}`);
      console.log(`   Free-tags: "${detail.freeTags}"`);
      console.log();

      if (detail.validation.errors.length > 0) {
        console.log("   ❌ ERREURS:");
        detail.validation.errors.forEach((error) => {
          console.log(`      - ${error}`);
        });
      }

      if (detail.validation.warnings.length > 0) {
        console.log("   ⚠️  AVERTISSEMENTS:");
        detail.validation.warnings.forEach((warning) => {
          console.log(`      - ${warning}`);
        });
      }

      if (detail.validation.suggestions.length > 0) {
        console.log("   💡 SUGGESTIONS:");
        detail.validation.suggestions.forEach((suggestion) => {
          console.log(`      - ${suggestion}`);
        });
      }

      console.log();
    });
  }

  console.log("═".repeat(80));

  // Recommandations finales
  if (results.invalid > 0) {
    console.log("\n⚠️  ACTIONS RECOMMANDÉES:\n");
    console.log("1. Corriger les items invalides dans Webflow CMS");
    console.log(
      '2. Ajouter continent manquant (ex: "North America, Late Cretaceous, T.rex")',
    );
    console.log("3. Relancer la validation après corrections");
    console.log("4. Lancer le pipeline : npm run update-contents\n");
  } else if (results.warnings > 0) {
    console.log("\n💡 SUGGESTIONS:\n");
    console.log("   Certains items ont des avertissements mais sont valides.");
    console.log(
      "   Vous pouvez améliorer la précision en ajoutant périodes et espèces.\n",
    );
  } else {
    console.log("\n✅ Tous les items avec free-tags sont valides !\n");
  }
}

function exportReport(results, format = "json") {
  const outputDir = path.join(__dirname, "../reports");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `validation-report-${timestamp}.${format}`;
  const filepath = path.join(outputDir, filename);

  if (format === "json") {
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  } else if (format === "csv") {
    const lines = ["ID,Nom,Slug,Free-tags,Valide,Erreurs,Avertissements"];

    results.details.forEach((detail) => {
      lines.push(
        [
          detail.id,
          `"${detail.name}"`,
          detail.slug,
          `"${detail.freeTags}"`,
          detail.validation.valid ? "OUI" : "NON",
          `"${detail.validation.errors.join("; ")}"`,
          `"${detail.validation.warnings.join("; ")}"`,
        ].join(","),
      );
    });

    fs.writeFileSync(filepath, lines.join("\n"));
  }

  console.log(`\n📄 Rapport exporté: ${filepath}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    export: args.includes("--export"),
    format: args.includes("--csv") ? "csv" : "json",
    onlyErrors: args.includes("--only-errors"),
  };

  const token = readToken();

  if (!token) {
    console.error("\n❌ WEBFLOW_TOKEN manquant.\n");
    process.exit(1);
  }

  console.log("\n🔍 PREHISTORIC DOMAIN - Validation des Free-Tags\n");

  // Récupérer items
  const items = await fetchAllItems(token);

  // Analyser
  const results = analyzeItems(items);

  // Filtrer si --only-errors
  if (options.onlyErrors) {
    results.details = results.details.filter(
      (d) => d.validation.errors.length > 0,
    );
  }

  // Afficher rapport
  displayReport(results);

  // Exporter si demandé
  if (options.export) {
    exportReport(results, options.format);
  }

  // Code de sortie
  process.exit(results.invalid > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("\n❌ Erreur:", error.message, "\n");
  process.exit(1);
});
