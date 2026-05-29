/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Intégration avec Webflow CMS API
 */

class WebflowAPI {
  constructor() {
    this.contents = [];
  }

  async fetchContents() {
    try {
      console.log(
        "📦 Chargement des données depuis assets/data/content-data.json...",
      );
      const response = await fetch(`assets/data/content-data.json?v=${__CONTENT_DATA_HASH__}`);

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      const items = data.items || [];

      if (items.length === 0) {
        console.warn("⚠️  No items found in content-data.json");
      }

      // Filter: only items with displayOnApp = true (eligible for globe)
      const eligibleItems = items.filter((item) => item.displayOnApp === true);

      this.contents = eligibleItems.map((item) => this.normalizeItem(item));
      console.log(
        `✅ ${this.contents.length} contenus chargés (${items.length} total dans le fichier)`,
      );
      return this.contents;
    } catch (error) {
      console.error(
        "❌ Impossible de charger content-data.json:",
        error.message,
      );
      console.error(
        "💡 Veuillez exécuter 'npm run sync:all' pour générer le fichier de données.",
      );
      this.contents = [];
      return this.contents;
    }
  }

  normalizeItem(item) {
    return {
      id: item.id,
      title: item.name || item.title,
      description: item.description,
      artist: item.creditsLine || item.artist || null,
      period: item.geologicalPeriod || item.period,
      type: item.type || item.category,
      isNew: !!item.isNew,
      latitude: item.modernLat,
      longitude: item.modernLon,
      periods: item.periods || {},
      preview:
        item.preview || item.galleryImage || item.backgroundImage || null,
      youtubeUrl: item.youtubeUrl || null,
      pageUrl: item.pageUrl || item.contentLink || null,
      slug: item.slug,
      displayOnApp: !!item.displayOnApp,
      freeTags: item.freeTags || "",
      location: item.location || "",
      createdOn: item.createdOn || null,
    };
  }


  getAllContents() {
    return this.contents;
  }

  filterByPeriod(period) {
    return this.contents.filter((content) => content.period === period);
  }

  filterByType(types) {
    if (!types || types.length === 0) return this.contents;
    return this.contents.filter((content) => types.includes(content.type));
  }

  filterByPeriodAndType(period, types) {
    return this.contents.filter((content) => {
      if (content.period !== period) return false;
      return types.includes(content.type);
    });
  }
}

window.WebflowAPI = WebflowAPI;
