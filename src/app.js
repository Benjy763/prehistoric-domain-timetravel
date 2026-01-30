/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Contrôleur principal de l'application
 */

class AppController {
  constructor() {
    this.currentPeriod = "today";
    this.currentTime = 0; // Ma (millions d'années)

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
      // Définir la couche par défaut pour "today"
      this.globeManager.currentLayer = "muller2022";
      this.setupEventListeners();
      // Mettre à jour l'UI des boutons après l'init
      this.updateLayerUI();
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

  updateLayerUI() {
    const currentLayer = this.globeManager.currentLayer;
    document.querySelectorAll(".layer-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.layer === currentLayer);
    });

    // Désactiver Real Land si on est sur today ou périodes anciennes
    if (this.currentTime >= 450 || this.currentTime === 0) {
      const realLandBtn = document.querySelector(
        '.layer-btn[data-layer="cao2017"]',
      );
      if (realLandBtn) {
        realLandBtn.disabled = true;
        realLandBtn.style.opacity = "0.3";
        realLandBtn.style.cursor = "not-allowed";
      }
    }
  }

  setupEventListeners() {
    // Boutons de sélection de période
    this.periodButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.onPeriodChange(btn);
      });
    });

    // Boutons de sélection de couche
    const layerButtons = document.querySelectorAll(".layer-btn");
    layerButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.onLayerChange(btn);
      });
    });

    // Bouton info modal
    const layerInfoBtn = document.getElementById("layerInfoBtn");
    const layerInfoModal = document.getElementById("layerInfoModal");
    const closeLayerInfo = document.getElementById("closeLayerInfo");
    const modalContent = layerInfoModal?.querySelector(".info-modal-content");

    if (layerInfoBtn && layerInfoModal && closeLayerInfo) {
      layerInfoBtn.addEventListener("click", () => {
        layerInfoModal.classList.remove("hidden");
      });

      closeLayerInfo.addEventListener("click", () => {
        layerInfoModal.classList.add("hidden");
      });

      layerInfoModal.addEventListener("click", (e) => {
        if (e.target === layerInfoModal) {
          layerInfoModal.classList.add("hidden");
        }
      });

      // Empêcher la propagation du clic sur le contenu
      if (modalContent) {
        modalContent.addEventListener("click", (e) => {
          e.stopPropagation();
        });
      }
    }
  }

  onLayerChange(button) {
    const layer = button.dataset.layer;

    // Mise à jour UI
    document
      .querySelectorAll(".layer-btn")
      .forEach((b) => b.classList.remove("active"));
    button.classList.add("active");

    // Mise à jour du globe
    if (this.globeManager) {
      this.globeManager.currentLayer = layer;
      this.updateGlobe();
    }

    console.log(`🔄 Couche changée vers: ${layer}`);
  }

  async onPeriodChange(button) {
    // Mettre à jour l'UI
    this.periodButtons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");

    // Récupérer les données de la période
    this.currentPeriod = button.dataset.period;
    this.currentTime = parseInt(button.dataset.time);

    // Auto-switch vers Merdith pour Cambrian, Ordovician (pas de données Cao) ET Today
    if (this.currentTime >= 450 || this.currentTime === 0) {
      // 450 Ma et plus OU période actuelle (0 Ma)
      if (this.globeManager.currentLayer !== "muller2022") {
        console.log(
          `🔄 Auto-switch vers Merdith 2021 pour période ${this.currentTime} Ma`,
        );
        this.globeManager.currentLayer = "muller2022";

        // Mettre à jour l'UI des boutons layer
        document.querySelectorAll(".layer-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.layer === "muller2022");
        });
      }

      // Désactiver le bouton Real Land
      const realLandBtn = document.querySelector(
        '.layer-btn[data-layer="cao2017"]',
      );
      if (realLandBtn) {
        realLandBtn.disabled = true;
        realLandBtn.style.opacity = "0.3";
        realLandBtn.style.cursor = "not-allowed";
      }
    } else {
      // Réactiver le bouton Real Land pour les périodes récentes (sauf Today)
      const realLandBtn = document.querySelector(
        '.layer-btn[data-layer="cao2017"]',
      );
      if (realLandBtn) {
        realLandBtn.disabled = false;
        realLandBtn.style.opacity = "";
        realLandBtn.style.cursor = "";
      }
    }

    // Mettre à jour le globe
    await this.updateGlobe();
  }

  async updateGlobe() {
    if (!this.globeManager) return;

    // Afficher le loading
    this.showLoading();

    try {
      const layer = this.globeManager.currentLayer;

      if (layer === "cao2017") {
        // Couche Cao 2017 : terres émergées blanches uniquement
        await this.globeManager.loadCaoLands(this.currentTime);
      } else if (layer === "muller2022") {
        // Couche Muller 2022 : juste les coastlines de l'API GPlates
        await this.globeManager.loadContinentsOnly(this.currentTime);
      }

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
