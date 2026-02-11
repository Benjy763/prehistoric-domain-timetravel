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
      const response = await fetch("assets/data/content-data.json");

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      const items = data.items || [];

      if (items.length === 0) {
        console.warn("⚠️  Aucun item trouvé dans content-data.json");
      }

      this.contents = items.map((item) => this.normalizeItem(item));
      console.log(
        `✅ ${this.contents.length} contenus chargés depuis le fichier local`,
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
        item.preview || item.backgroundImage || item.galleryImage || null,
      youtubeUrl: item.youtubeUrl || null,
      pageUrl: item.pageUrl || item.contentLink || null,
      slug: item.slug,
      displayOnApp: !!item.displayOnApp,
      freeTags: item.freeTags || "",
      location: item.location || "",
    };
  }


  filterByPeriod(period) {
    return this.contents.filter((content) => content.period === period);
  }

  filterByType(types) {
    if (!types || types.length === 0) return this.contents;
    return this.contents.filter((content) => types.includes(content.type));
  }

  filterByPeriodAndType(period, types) {
    const hasNewFilter = types.includes("new");
    return this.contents.filter((content) => {
      if (content.period !== period) return false;
      const matchesType = types.includes(content.type);
      const matchesNew = hasNewFilter && content.isNew;
      return matchesType || matchesNew;
    });
  }
}
