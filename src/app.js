/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Contrôleur principal de l'application
 */

class AppController {
  constructor() {
    this.currentPeriod = "jurassic";
    this.currentTime = 160; // Ma (millions d'années)

    // Initialiser les managers
    this.globeManager = null;
    this.filtersManager = null;
    this.popupManager = null;
    this.webflowAPI = null;

    this.periodButtons = document.querySelectorAll(".period-btn");
    this.loadingOverlay = document.getElementById("loadingOverlay");

    this.init();
  }

  async init() {
    console.log("🌍 Initialisation de l'application Time Travel Globe...\n");

    // Initialiser les managers
    this.filtersManager = new FiltersManager();
    this.popupManager = new PopupManager();
    this.webflowAPI = new WebflowAPI();

    // Rendre le contrôleur accessible globalement
    window.appController = this;

    // Charger les données
    await this.loadData();

    // Initialiser le globe (après un court délai pour laisser le DOM se charger)
    setTimeout(() => {
      console.log("🎨 Initialisation du globe 3D...");
      this.globeManager = new GlobeManager("globe-canvas");
      this.setupEventListeners();
      this.updateGlobe();

      // Start preloading other periods in background after initial load
      setTimeout(() => {
        this.globeManager.preloadAllPeriods();
      }, 2000); // Wait 2s after initial load
    }, 100);
  }

  async loadData() {
    try {
      await this.webflowAPI.fetchContents();
      console.log(
        "Données chargées:",
        this.webflowAPI.contents.length,
        "contenus",
      );
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    }
  }

  setupEventListeners() {
    // Boutons de sélection de période
    this.periodButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.onPeriodChange(btn);
      });
    });
  }

  async onPeriodChange(button) {
    // Mettre à jour l'UI
    this.periodButtons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");

    // Récupérer les données de la période
    this.currentPeriod = button.dataset.period;
    this.currentTime = parseInt(button.dataset.time);

    // Mettre à jour le globe
    await this.updateGlobe();
  }

  async updateGlobe() {
    if (!this.globeManager) return;

    // Afficher le loading
    this.showLoading();

    try {
      // Charger uniquement les continents (pas les coastlines pour éviter la surcharge visuelle)
      await this.globeManager.loadContinents(this.currentTime);

      // Filtrer et afficher les points
      this.updatePoints();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du globe:", error);
    } finally {
      // Masquer le loading
      setTimeout(() => this.hideLoading(), 500);
    }
  }

  updatePoints() {
    if (!this.globeManager) return;

    // Supprimer les points existants
    this.globeManager.clearPoints();

    // Récupérer les filtres actifs
    const activeFilters = this.filtersManager.getActiveFilters();

    // Filtrer les contenus
    const filteredContents = this.webflowAPI.filterByPeriodAndType(
      this.currentPeriod,
      activeFilters,
    );

    console.log(
      `Affichage de ${filteredContents.length} contenus pour la période ${this.currentPeriod}`,
    );

    // Ajouter les points au globe
    filteredContents.forEach((content) => {
      this.globeManager.addPoint(content.latitude, content.longitude, content);
    });
  }

  onFiltersChanged(activeFilters) {
    console.log("Filtres actifs:", activeFilters);
    this.updatePoints();
  }

  showContentPopup(contentData) {
    console.log("Affichage du contenu:", contentData);
    this.popupManager.show(contentData);
  }

  showLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove("hidden");
    }
  }

  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add("hidden");
    }
  }
}

// Initialiser l'application quand le DOM est prêt
document.addEventListener("DOMContentLoaded", () => {
  new AppController();
});
