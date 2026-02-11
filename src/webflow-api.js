/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Intégration avec Webflow CMS API
 */

class WebflowAPI {
  constructor() {
    this.contents = [];
  }

  async fetchContents() {
    // Essayer de charger depuis le fichier JSON local d'abord
    try {
      console.log(
        "📦 Chargement des données depuis assets/data/content-data.json...",
      );
      const response = await fetch("assets/data/content-data.json");

      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        this.contents = items.map((item) => this.normalizeItem(item));
        console.log(
          `✅ ${this.contents.length} contenus chargés depuis le fichier local`,
        );
        return this.contents;
      }
    } catch (error) {
      console.log(
        "ℹ️  Fichier local non trouvé, utilisation des données de test",
      );
    }

    // Si le fichier n'existe pas, utiliser les données de test
    console.log("📝 Utilisation des données de test...");
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.contents = this.getMockData();

    return this.contents;
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

  getMockData() {
    return [
      {
        id: "1",
        title: "T-REX HUNT - Gobi Desert",
        description:
          "Découverte d'un T-Rex dans le désert de Gobi durant la période du Crétacé supérieur.",
        artist: "John Doe",
        period: "cretaceous",
        periodLabel: "Crétacé",
        type: "videos",
        latitude: 43.5,
        longitude: 104.0,
        preview: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        pageUrl: "https://prehistoricdomain.com/content/t-rex-hunt",
      },
      {
        id: "2",
        title: "Stegosaurus - Amérique du Nord",
        description:
          "Illustration d'un Stegosaurus durant le Jurassique supérieur en Amérique du Nord.",
        artist: "Jane Smith",
        period: "jurassic",
        periodLabel: "Jurassique",
        type: "images",
        latitude: 39.0,
        longitude: -105.5,
        preview:
          "https://via.placeholder.com/500x300/2a3f5f/e6dac7?text=Stegosaurus",
        pageUrl: "https://prehistoricdomain.com/content/stegosaurus",
      },
      {
        id: "3",
        title: "Forêt du Carbonifère",
        description:
          "Immersion 3D dans une forêt tropicale du Carbonifère avec des fougères géantes.",
        artist: "Mike Johnson",
        period: "permian",
        periodLabel: "Permien",
        type: "3d",
        latitude: 51.5,
        longitude: -0.1,
        preview:
          "https://via.placeholder.com/500x300/2a3f5f/e6dac7?text=Carboniferous+Forest",
        pageUrl: "https://prehistoricdomain.com/content/carboniferous-forest",
      },
      {
        id: "4",
        title: "Plateosaurus - Allemagne",
        description:
          "Vidéo documentaire sur le Plateosaurus, un des premiers grands dinosaures herbivores.",
        artist: "Sarah Williams",
        period: "triassic",
        periodLabel: "Trias",
        type: "videos",
        latitude: 48.8,
        longitude: 9.2,
        preview: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        pageUrl: "https://prehistoricdomain.com/content/plateosaurus",
      },
      {
        id: "5",
        title: "Diplodocus - Wyoming",
        description:
          "Reconstitution artistique d'un troupeau de Diplodocus au Jurassique.",
        artist: "Robert Brown",
        period: "jurassic",
        periodLabel: "Jurassique",
        type: "images",
        latitude: 43.0,
        longitude: -107.5,
        preview:
          "https://via.placeholder.com/500x300/2a3f5f/e6dac7?text=Diplodocus",
        pageUrl: "https://prehistoricdomain.com/content/diplodocus",
      },
      {
        id: "6",
        title: "Tricératops - Montana",
        description:
          "Exploration 3D interactive d'un site de fouilles de Tricératops.",
        artist: "Emily Davis",
        period: "cretaceous",
        periodLabel: "Crétacé",
        type: "3d",
        latitude: 46.8,
        longitude: -110.4,
        preview:
          "https://via.placeholder.com/500x300/2a3f5f/e6dac7?text=Triceratops",
        pageUrl: "https://prehistoricdomain.com/content/triceratops",
      },
    ];
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
