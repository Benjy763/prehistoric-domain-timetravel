/**
 * SCRIPT DE RÉCUPÉRATION DES DONNÉES WEBFLOW
 *
 * Ce script récupère les données du CMS Webflow et les transforme
 * pour l'application Time Travel Globe.
 *
 * Utilisation : node data/fetch-webflow-data.js
 */

const fs = require("fs");
const path = require("path");

// Charger la configuration
const config = require("../config.js");

/**
 * Récupérer les données depuis Webflow API v2
 */
async function fetchWebflowData() {
  const { apiToken, siteId, collectionId, baseUrl } = config.webflow;

  if (!apiToken || apiToken === "YOUR_WEBFLOW_API_TOKEN") {
    console.error("❌ Erreur : Clé API Webflow non configurée !");
    console.error(
      "📝 Éditez le fichier config.js et ajoutez votre clé API Webflow.",
    );
    console.error("📖 Consultez CONFIGURATION.md pour les instructions.");
    process.exit(1);
  }

  console.log("🔄 Récupération des données depuis Webflow...");
  console.log(`📦 Collection ID: ${collectionId}`);

  try {
    // URL de l'API Webflow v2
    const url = `${baseUrl}/collections/${collectionId}/items`;

    console.log(`🌐 Requête: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "accept-version": "1.0.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ ${data.items?.length || 0} contenus récupérés`);

    return data.items || [];
  } catch (error) {
    console.error(
      "❌ Erreur lors de la récupération des données:",
      error.message,
    );
    console.error("");
    console.error("💡 Vérifiez que :");
    console.error("   - Votre clé API est valide");
    console.error("   - L'ID de collection est correct");
    console.error("   - Vous avez accès à la collection");
    console.error("");
    console.error("📖 Consultez CONFIGURATION.md pour plus d'aide");
    throw error;
  }
}

/**
 * Transformer les données Webflow au format de l'application
 */
function transformWebflowData(items) {
  const { webflowFields } = config;
  const { periods } = config;

  console.log("🔄 Transformation des données...");

  return items.map((item, index) => {
    const fieldData = item.fieldData || item;

    // Récupérer les valeurs selon le mapping
    const period = fieldData[webflowFields.period];
    const periodConfig = periods[period] || {};

    const contentType = fieldData[webflowFields.contentType];
    const slug = fieldData[webflowFields.pageUrl] || item.slug;

    const transformed = {
      id: item.id || `content-${index}`,
      title: fieldData[webflowFields.title] || "Sans titre",
      description: fieldData[webflowFields.description] || "",
      artist: fieldData[webflowFields.artist] || "Inconnu",
      period: period || "jurassic",
      periodLabel: periodConfig.name || "Jurassique",
      type: contentType || "images",
      latitude: parseFloat(fieldData[webflowFields.latitude]) || 0,
      longitude: parseFloat(fieldData[webflowFields.longitude]) || 0,
      preview:
        fieldData[webflowFields.previewImage]?.url ||
        fieldData[webflowFields.previewImage] ||
        "",
      youtubeUrl: fieldData[webflowFields.youtubeUrl] || "",
      pageUrl: slug ? `https://prehistoricdomain.com/${slug}` : "",
      featured: fieldData[webflowFields.featured] || false,
      _raw: item, // Garder les données brutes pour debug
    };

    // Pour les vidéos YouTube, générer l'URL de preview
    if (
      transformed.type === "videos" &&
      transformed.youtubeUrl &&
      !transformed.preview
    ) {
      const videoId = extractYouTubeId(transformed.youtubeUrl);
      if (videoId) {
        transformed.preview = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    return transformed;
  });
}

/**
 * Extraire l'ID d'une vidéo YouTube depuis son URL
 */
function extractYouTubeId(url) {
  if (!url) return null;
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
}

/**
 * Sauvegarder les données transformées
 */
function saveData(data) {
  const outputDir = path.join(__dirname, "../assets/data");
  const outputFile = path.join(outputDir, "contents.json");

  // Créer le dossier s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Sauvegarder avec une indentation pour la lisibilité
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), "utf-8");

  console.log(`💾 Données sauvegardées dans: ${outputFile}`);
  console.log(`📊 ${data.length} contenus au total`);

  // Afficher un résumé
  const summary = {
    total: data.length,
    byPeriod: {},
    byType: {},
  };

  data.forEach((item) => {
    summary.byPeriod[item.period] = (summary.byPeriod[item.period] || 0) + 1;
    summary.byType[item.type] = (summary.byType[item.type] || 0) + 1;
  });

  console.log("\n📈 Résumé:");
  console.log("   Par période:", summary.byPeriod);
  console.log("   Par type:", summary.byType);
}

/**
 * Fonction principale
 */
async function main() {
  console.log("🌍 Prehistoric Domain - Récupération des données Webflow\n");

  try {
    // Récupérer les données
    const items = await fetchWebflowData();

    if (!items || items.length === 0) {
      console.warn("⚠️  Aucun contenu trouvé dans la collection");
      return;
    }

    // Transformer les données
    const transformed = transformWebflowData(items);

    // Sauvegarder
    saveData(transformed);

    console.log("\n✅ Récupération terminée avec succès !");
    console.log("🚀 Vous pouvez maintenant lancer l'application");
  } catch (error) {
    console.error("\n❌ Erreur fatale:", error.message);
    process.exit(1);
  }
}

// Lancer le script
if (require.main === module) {
  main();
}

module.exports = { fetchWebflowData, transformWebflowData };
