/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Contrôleur principal de l'application
 */

/**
 * Audio Manager - Gère la musique d'ambiance
 */
class AudioManager {
  constructor() {
    this.audio = document.getElementById("ambientAudio");
    this.volumeBtn = document.getElementById("volumeBtn");
    this.volumeSlider = document.getElementById("volumeSlider");
    this.volumeControl = document.getElementById("volumeControl");
    this.isEnabled = true; // Activé par défaut
    this.hasStarted = false;
    this.userInteracted = false;
    this.fadeInterval = null;
    this.targetVolume = 0.5; // Volume par défaut (50%)
    this.previousVolume = 0.5; // Pour le mute/unmute

    // Set initial volume
    if (this.audio) {
      this.audio.volume = this.targetVolume;
    }

    this.init();
  }

  init() {
    // Volume slider
    if (this.volumeSlider) {
      // Set initial slider value
      this.volumeSlider.value = this.targetVolume * 100;
      this.updateVolumeIcon();
      this.updateSliderBackground();

      // Handle slider input
      this.volumeSlider.addEventListener("input", (e) => {
        const volume = e.target.value / 100;
        this.setVolume(volume);
        // If user increases volume from 0, also enable audio
        if (volume > 0 && !this.isEnabled) {
          this.toggle();
        }
      });
    }

    // Volume button click to toggle play/pause
    if (this.volumeBtn) {
      this.volumeBtn.addEventListener("click", () => {
        this.toggle();
      });
    }

    // Tenter l'autoplay (peut échouer selon les navigateurs)
    this.tryAutoplay();

    // Fallback: jouer au premier clic utilisateur si l'autoplay a échoué
    const playOnInteraction = () => {
      if (!this.userInteracted) {
        this.userInteracted = true;
        this.playIfNeeded();
      }
    };

    document.addEventListener("click", playOnInteraction, { once: true });
    document.addEventListener("keydown", playOnInteraction, { once: true });
  }

  async tryAutoplay() {
    if (!this.isEnabled || !this.audio) return;

    try {
      await this.audio.play();
      this.hasStarted = true;
      console.log("🎵 Ambient audio started automatically");
    } catch (error) {
      console.log("🔇 Autoplay blocked by browser, waiting for user interaction");
    }
  }

  async playIfNeeded() {
    if (this.isEnabled && !this.hasStarted && this.audio) {
      try {
        await this.audio.play();
        this.hasStarted = true;
        console.log("🎵 Ambient audio started after user interaction");
      } catch (error) {
        console.error("❌ Failed to play audio:", error);
      }
    }
  }

  fadeOut(duration = 500) {
    return new Promise((resolve) => {
      // Clear any existing fade
      if (this.fadeInterval) {
        clearInterval(this.fadeInterval);
      }

      const startVolume = this.audio.volume;
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = startVolume / steps;
      let currentStep = 0;

      this.fadeInterval = setInterval(() => {
        currentStep++;
        const newVolume = Math.max(0, startVolume - volumeStep * currentStep);
        this.audio.volume = newVolume;

        if (currentStep >= steps || newVolume <= 0) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
          this.audio.volume = 0;
          this.audio.pause();
          console.log("🔇 Audio faded out");
          resolve();
        }
      }, stepDuration);
    });
  }

  fadeIn(duration = 500) {
    return new Promise((resolve) => {
      // Clear any existing fade
      if (this.fadeInterval) {
        clearInterval(this.fadeInterval);
      }

      this.audio.volume = 0;
      this.audio.play().then(() => {
        this.hasStarted = true;
        const steps = 20;
        const stepDuration = duration / steps;
        const volumeStep = this.targetVolume / steps;
        let currentStep = 0;

        this.fadeInterval = setInterval(() => {
          currentStep++;
          const newVolume = Math.min(this.targetVolume, volumeStep * currentStep);
          this.audio.volume = newVolume;

          if (currentStep >= steps || newVolume >= this.targetVolume) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
            this.audio.volume = this.targetVolume;
            console.log("🎵 Audio faded in");
            resolve();
          }
        }, stepDuration);
      }).catch((error) => {
        console.error("❌ Failed to play audio:", error);
        resolve();
      });
    });
  }

  async toggle() {
    this.isEnabled = !this.isEnabled;
    if (this.volumeControl) {
      this.volumeControl.classList.toggle("active", this.isEnabled);
    }

    if (this.isEnabled) {
      await this.fadeIn();
      console.log("🎵 Ambient audio enabled");
    } else {
      await this.fadeOut();
      console.log("🔇 Ambient audio disabled");
    }
  }

  async pause() {
    if (this.audio.paused) return;
    await this.fadeOut(300);
  }

  async resume() {
    if (!this.isEnabled || !this.audio.paused) return;
    await this.fadeIn(300);
  }

  setVolume(volume) {
    this.targetVolume = Math.max(0, Math.min(1, volume));
    if (this.audio && !this.fadeInterval) {
      this.audio.volume = this.targetVolume;
    }

    // Update slider
    if (this.volumeSlider) {
      this.volumeSlider.value = this.targetVolume * 100;
      this.updateSliderBackground();
    }

    // Update icon
    this.updateVolumeIcon();
  }

  updateVolumeIcon() {
    if (!this.volumeBtn) return;

    const iconHigh = this.volumeBtn.querySelector(".volume-icon-high");
    const iconLow = this.volumeBtn.querySelector(".volume-icon-low");
    const iconMuted = this.volumeBtn.querySelector(".volume-icon-muted");

    // Hide all icons
    if (iconHigh) iconHigh.style.display = "none";
    if (iconLow) iconLow.style.display = "none";
    if (iconMuted) iconMuted.style.display = "none";

    // Show appropriate icon based on enabled state and volume
    if (!this.isEnabled || this.targetVolume === 0) {
      if (iconMuted) iconMuted.style.display = "block";
    } else if (this.targetVolume < 0.5) {
      if (iconLow) iconLow.style.display = "block";
    } else {
      if (iconHigh) iconHigh.style.display = "block";
    }
  }

  updateSliderBackground() {
    if (!this.volumeSlider || !this.volumeControl) return;
    const percent = this.targetVolume * 100;
    this.volumeControl.style.setProperty("--volume-percent", `${percent}%`);
  }
}

class AppController {
  constructor() {
    this.currentPeriod = "today";
    this.currentTime = 0; // Ma (millions d'années)

    // Initialiser les managers
    this.globeManager = null;
    this.filtersManager = null;
    this.favoritesManager = null;
    this.popupManager = null;
    this.webflowAPI = null;
    this.audioManager = null;
    this.premiumManager = null;

    this.periodButtons = document.querySelectorAll(".period-btn");
    this.loadingOverlay = document.getElementById("loadingOverlay");

    this.init();
  }

  async init() {
    console.log("🌍 Initializing Time Travel Globe application...\n");

    // Initialiser les managers
    this.filtersManager = new FiltersManager();
    this.favoritesManager = new FavoritesManager();
    this.popupManager = new PopupManager();
    this.webflowAPI = new WebflowAPI();
    this.audioManager = new AudioManager();
    this.premiumManager = new PremiumManager();

    // Rendre le contrôleur accessible globalement
    window.appController = this;

    // Listen to favorites changes and refresh points
    this.favoritesManager.onChange(() => {
      this.updatePoints();
    });

    // Charger les données
    await this.loadData();

    // Initialiser le globe (après un court délai pour laisser le DOM se charger)
    setTimeout(() => {
      console.log("🎨 Initializing 3D globe...");
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
      console.error("Error loading data:", error);
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

    // Boutons de sélection de couche (premium)
    const layerButtons = document.querySelectorAll(".layer-btn");
    layerButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.premiumManager.gate(() => this.onLayerChange(btn));
      });
    });

    // Bouton auto-rotation toggle
    const autoRotateBtn = document.getElementById("autoRotateBtn");
    if (autoRotateBtn) {
      autoRotateBtn.addEventListener("click", () => {
        this.globeManager.autoRotate = !this.globeManager.autoRotate;
        autoRotateBtn.classList.toggle("active", this.globeManager.autoRotate);
      });
    }

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

    // Désactiver/activer les filtres selon la couche
    const filterItems = document.querySelectorAll(".filter-item");
    if (layer === "cao2017") {
      // Désactiver les filtres en Real Land view
      filterItems.forEach(item => {
        item.style.opacity = "0.3";
        item.style.pointerEvents = "none";
      });
    } else {
      // Activer les filtres en Our Continents view
      filterItems.forEach(item => {
        item.style.opacity = "1";
        item.style.pointerEvents = "auto";
      });
    }

    // Mise à jour du globe
    if (this.globeManager) {
      this.globeManager.currentLayer = layer;
      this.updateGlobe();
    }

    console.log(`🔄 Layer changed to: ${layer}`);
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
      console.error("Error updating globe:", error);
    } finally {
      // Masquer le loading
      setTimeout(() => this.hideLoading(), 500);
    }
  }

  updatePoints() {
    if (!this.globeManager) return;

    // Supprimer les points existants
    this.globeManager.clearPoints();

    // Ne pas afficher les points en Real Land view
    if (this.globeManager.currentLayer === "cao2017") {
      console.log("⚪ Points hidden in Real Land view");
      return;
    }

    // Récupérer les filtres actifs
    const activeFilters = this.filtersManager.getActiveFilters();
    const favoritesFilterActive = activeFilters.includes("favorites");
    const newFilterActive = activeFilters.includes("new");

    // Filtrer les contenus
    let filteredContents = this.webflowAPI.filterByPeriodAndType(
      this.currentPeriod,
      activeFilters.filter(f => f !== "favorites" && f !== "new"), // Remove exclusive filters from type filters
    );

    // Appliquer les filtres exclusifs (favorites et/ou recent)
    if (favoritesFilterActive && newFilterActive) {
      // Les DEUX filtres actifs → afficher favoris OU récents
      const favoriteIds = this.favoritesManager.getAll();
      const recentIds = this.getRecentItemsForPeriod(this.currentPeriod, 10);
      filteredContents = filteredContents.filter(content =>
        favoriteIds.includes(content.id) || recentIds.has(content.id)
      );
      console.log(
        `💙⭐ Affichage de ${filteredContents.length} favoris ou récents pour la période ${this.currentPeriod}`,
      );
    } else if (favoritesFilterActive) {
      // Seulement favoris
      const favoriteIds = this.favoritesManager.getAll();
      filteredContents = filteredContents.filter(content => favoriteIds.includes(content.id));
      console.log(
        `💙 Affichage de ${filteredContents.length} favoris pour la période ${this.currentPeriod}`,
      );
    } else if (newFilterActive) {
      // Seulement récents (10 derniers de la période)
      const recentIds = this.getRecentItemsForPeriod(this.currentPeriod, 10);
      filteredContents = filteredContents.filter(content => recentIds.has(content.id));
      console.log(
        `⭐ Affichage de ${filteredContents.length} contenus récents pour la période ${this.currentPeriod}`,
      );
    } else {
      console.log(
        `Affichage de ${filteredContents.length} contenus pour la période ${this.currentPeriod}`,
      );
    }

    // Appliquer le filtre recherche
    const searchQuery = this.filtersManager.getSearchQuery();
    if (searchQuery) {
      const beforeSearchCount = filteredContents.length;
      filteredContents = filteredContents.filter(content =>
        this.matchesSearch(content, searchQuery)
      );
      console.log(
        `🔍 Search "${searchQuery}": ${filteredContents.length}/${beforeSearchCount} résultats`
      );
    }

    // Build resolved items list for clustering
    const resolvedItems = [];
    filteredContents.forEach((content) => {
      const periodCoords =
        content.periods?.[this.currentTime] ||
        content.periods?.[String(this.currentTime)];

      const lat = periodCoords?.lat ?? content.latitude;
      const lon = periodCoords?.lon ?? content.longitude;

      if (lat == null || lon == null) return;

      resolvedItems.push({ lat, lon, data: content, isFavorite: this.favoritesManager.isFavorite(content.id) });
    });
    this.globeManager.initClusterData(resolvedItems);
  }

  /**
   * Get the most recent items for a given period
   * @param {string} period - Geological period name (e.g., "quaternary")
   * @param {number} limit - Max number of items (default 50)
   * @returns {Set<string>} Set of item IDs
   */
  getRecentItemsForPeriod(period, limit = 50) {
    // DEBUG: Verify PERIOD_TO_AGE_MAP is loaded
    if (!window.PERIOD_TO_AGE_MAP) {
      console.error("⚠️ window.PERIOD_TO_AGE_MAP not loaded! Check constants.js import.");
      return new Set();
    }

    const ageKey = window.PERIOD_TO_AGE_MAP[period];

    if (!ageKey) {
      console.warn(`Unknown period: ${period}`);
      return new Set();
    }

    // Filter items for this geological period
    const periodItems = this.webflowAPI.getAllContents().filter(item => {
      if (!item.periods || !item.displayOnApp) return false;
      return item.periods.hasOwnProperty(ageKey);
    });

    // Sort by createdOn descending (most recent first)
    // Handle invalid dates explicitly
    const sorted = periodItems.sort((a, b) => {
      const dateA = a.createdOn ? new Date(a.createdOn) : new Date(0);
      const dateB = b.createdOn ? new Date(b.createdOn) : new Date(0);

      // Fallback to epoch (0) for invalid dates
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();

      return timeB - timeA;
    });

    // Return top N item IDs as a Set
    return new Set(sorted.slice(0, limit).map(item => item.id));
  }

  matchesSearch(item, searchQuery) {
    if (!searchQuery) return true;

    const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 0) return true;

    const searchableFields = [
      item.title || "",
      item.freeTags || "",
      item.artist || "",
      item.location || "",
      item.description || "",
    ];

    const searchableText = searchableFields.join(" ").toLowerCase();

    return terms.every(term => searchableText.includes(term));
  }

  onFiltersChanged(activeFilters) {
    console.log("Active filters:", activeFilters);
    this.updatePoints();
  }

  showContentPopup(contentData) {
    console.log("Displaying content:", contentData);
    this.popupManager.show(contentData);
  }

  showClusterList(items) {
    const existing = document.getElementById("clusterListPopup");
    if (existing) existing.remove();

    const popup = document.createElement("div");
    popup.id = "clusterListPopup";
    Object.assign(popup.style, {
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%,-50%)",
      background: "rgba(13,17,23,0.95)",
      border: "1px solid rgba(79,195,247,0.4)",
      borderRadius: "12px", padding: "16px",
      zIndex: "1000", minWidth: "240px", maxWidth: "320px",
      backdropFilter: "blur(8px)",
    });

    const header = document.createElement("div");
    header.style.cssText = "color:#4fc3f7;font-size:12px;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;";
    header.textContent = `${items.length} contents at this location`;
    popup.appendChild(header);

    const list = document.createElement("div");
    list.style.cssText = "max-height:320px;overflow-y:auto;padding-right:4px;";
    popup.appendChild(list);

    items.forEach(item => {
      const row = document.createElement("div");
      row.style.cssText = "padding:8px;cursor:pointer;border-radius:6px;color:#ebebeb;font-size:13px;margin-bottom:4px;";
      row.textContent = item.name || item.title || "Unnamed";
      row.onmouseover = () => { row.style.background = "rgba(79,195,247,0.1)"; };
      row.onmouseout = () => { row.style.background = ""; };
      row.onclick = () => { popup.remove(); this.showContentPopup(item); };
      list.appendChild(row);
    });

    const close = document.createElement("button");
    close.textContent = "×";
    close.style.cssText = "position:absolute;top:8px;right:12px;background:none;border:none;color:#ebebeb;font-size:18px;cursor:pointer;";
    close.onclick = () => popup.remove();
    popup.appendChild(close);

    setTimeout(() => {
      const onOutside = (e) => {
        if (!popup.contains(e.target)) {
          popup.remove();
          document.removeEventListener("click", onOutside);
        }
      };
      document.addEventListener("click", onOutside);
    }, 100);

    document.body.appendChild(popup);
  }

  showLoading() {
    // Keep overlay hidden to see holographic globe loading effect
    // if (this.loadingOverlay) {
    //   this.loadingOverlay.classList.remove("hidden");
    // }
  }

  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add("hidden");
    }
  }
}

window.AudioManager = AudioManager;
window.AppController = AppController;

// Initialiser l'application quand le DOM est prêt
document.addEventListener("DOMContentLoaded", () => {
  new AppController();
});
