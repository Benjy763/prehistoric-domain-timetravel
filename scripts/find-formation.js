#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Find Formation
 *
 * Recherche des formations géologiques pour une espèce donnée
 * Sources : fichier local + API Paleobiology Database (optionnel)
 */

const fs = require("fs");
const path = require("path");

const FORMATIONS_PATH = path.join(
  __dirname,
  "../assets/data/famous-formations.json",
);

function loadFormations() {
  if (!fs.existsSync(FORMATIONS_PATH)) {
    console.error("❌ Fichier famous-formations.json introuvable");
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(FORMATIONS_PATH, "utf8"));
}

function normalizeSpeciesName(name) {
  return name
    .toLowerCase()
    .replace(/[\s\-\.]/g, "")
    .trim();
}

function searchInLocalDatabase(speciesQuery) {
  const data = loadFormations();
  const normalized = normalizeSpeciesName(speciesQuery);
  const results = [];

  // Parcourir tous les continents
  for (const [continent, formations] of Object.entries(data.formations)) {
    for (const formation of formations) {
      // Vérifier si l'espèce correspond
      for (const species of formation.species) {
        const speciesNormalized = normalizeSpeciesName(species);

        if (
          speciesNormalized.includes(normalized) ||
          normalized.includes(speciesNormalized)
        ) {
          results.push({
            ...formation,
            continent: continent,
            matchedSpecies: species,
          });
          break; // Éviter doublons pour cette formation
        }
      }
    }
  }

  return results;
}

async function searchInPaleobiologyDB(speciesQuery) {
  // API Paleobiology Database
  const url = `https://paleobiodb.org/data1.2/occs/list.json?base_name=${encodeURIComponent(speciesQuery)}&show=coords,attr,loc&limit=10`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return [];
    }

    // Extraire les formations uniques
    const formations = new Map();

    for (const record of data.records) {
      if (!record.lat || !record.lng || !record.formation) continue;

      const key = record.formation;
      if (!formations.has(key)) {
        formations.set(key, {
          name: record.formation,
          lat: record.lat,
          lon: record.lng,
          country: record.cc || "Unknown",
          age: record.max_ma || null,
          occurrences: 1,
          source: "Paleobiology Database",
        });
      } else {
        formations.get(key).occurrences++;
      }
    }

    return Array.from(formations.values()).sort(
      (a, b) => b.occurrences - a.occurrences,
    );
  } catch (error) {
    console.error("⚠️  Erreur API Paleobiology Database:", error.message);
    return [];
  }
}

function displayResults(localResults, apiResults, speciesQuery) {
  console.log("\n" + "═".repeat(80));
  console.log(`🔍 RECHERCHE DE FORMATIONS POUR: "${speciesQuery}"`);
  console.log("═".repeat(80));

  if (localResults.length > 0) {
    console.log("\n📚 RÉSULTATS DANS LA BASE LOCALE:\n");

    localResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}`);
      console.log(`   Coordonnées: ${result.lat}°, ${result.lon}°`);
      console.log(`   Période: ${result.period} (~${result.age} Ma)`);
      console.log(`   Continent: ${result.continent}`);
      console.log(`   Espèce reconnue: ${result.matchedSpecies}`);
      if (result.description) {
        console.log(`   Description: ${result.description}`);
      }
      console.log();
    });
  } else {
    console.log("\n⚠️  Aucun résultat dans la base locale\n");
  }

  if (apiResults.length > 0) {
    console.log("\n🌐 RÉSULTATS DE PALEOBIOLOGY DATABASE:\n");

    apiResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}`);
      console.log(`   Coordonnées: ${result.lat}°, ${result.lon}°`);
      console.log(`   Pays: ${result.country}`);
      if (result.age) {
        console.log(`   Âge: ~${result.age} Ma`);
      }
      console.log(`   Occurrences: ${result.occurrences}`);
      console.log();
    });
  }

  console.log("═".repeat(80));

  if (localResults.length === 0 && apiResults.length === 0) {
    console.log("\n❌ Aucune formation trouvée pour cette espèce\n");
    console.log("💡 Suggestions:");
    console.log("   - Vérifiez l'orthographe du nom");
    console.log(
      "   - Essayez le nom scientifique complet (ex: Tyrannosaurus rex)",
    );
    console.log("   - Consultez Wikipedia ou la littérature scientifique\n");
  } else if (localResults.length > 0) {
    console.log("\n✅ Formation trouvée dans la base locale !");
    console.log("   Le géocodage automatique utilisera cette formation.\n");
  } else {
    console.log("\n💡 Formations trouvées dans Paleobiology Database");
    console.log(
      "   Vous pouvez ajouter la plus pertinente à famous-formations.json\n",
    );
  }
}

function generateAddCommand(result, speciesQuery) {
  if (!result) return;

  console.log("\n📝 POUR AJOUTER CETTE FORMATION:\n");
  console.log(
    "Éditez assets/data/famous-formations.json et ajoutez dans le continent approprié:",
  );
  console.log("\n```json");
  console.log("{");
  console.log(`  "species": ["${normalizeSpeciesName(speciesQuery)}"],`);
  console.log(`  "lat": ${result.lat},`);
  console.log(`  "lon": ${result.lon},`);
  console.log(`  "name": "${result.name}",`);
  console.log(`  "age": ${result.age || 0},`);
  console.log(`  "period": "À compléter",`);
  console.log(`  "description": "À compléter",`);
  console.log(`  "source": "${result.source || "À compléter"}"`);
  console.log("}");
  console.log("```\n");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("\n❌ Usage: node find-formation.js <nom-espèce>\n");
    console.log("Exemples:");
    console.log('  node find-formation.js "Tyrannosaurus rex"');
    console.log("  node find-formation.js velociraptor");
    console.log("  node find-formation.js spinosaurus\n");
    console.log("Options:");
    console.log(
      "  --api-only    Chercher uniquement dans Paleobiology Database",
    );
    console.log("  --local-only  Chercher uniquement dans la base locale\n");
    process.exit(1);
  }

  const speciesQuery = args[0];
  const options = {
    apiOnly: args.includes("--api-only"),
    localOnly: args.includes("--local-only"),
  };

  console.log("\n🔍 Recherche en cours...\n");

  let localResults = [];
  let apiResults = [];

  // Recherche locale
  if (!options.apiOnly) {
    localResults = searchInLocalDatabase(speciesQuery);
  }

  // Recherche API
  if (!options.localOnly) {
    apiResults = await searchInPaleobiologyDB(speciesQuery);
  }

  // Afficher résultats
  displayResults(localResults, apiResults, speciesQuery);

  // Générer commande d'ajout si résultats API mais pas local
  if (apiResults.length > 0 && localResults.length === 0) {
    generateAddCommand(apiResults[0], speciesQuery);
  }
}

main().catch((error) => {
  console.error("\n❌ Erreur:", error.message, "\n");
  process.exit(1);
});
