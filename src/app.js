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
    // Show the muted speaker as soon as the sound is off
    this.updateVolumeIcon();
    this.volumeBtn?.setAttribute("aria-pressed", String(this.isEnabled));

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

// Pins shown at once on the globe, the most recent first (the pager moves to
// older ones); the visitor can switch to 100
const PIN_PAGE_SIZES = [50, 100];

class AppController {
  constructor() {
    this.currentPeriod = "today";
    // Pins are shown a page at a time, the most recent first
    this.pinPage = 0;
    this.pinPageSize = PIN_PAGE_SIZES[0];
    this.currentTime = 0; // Ma (millions d'années)

    // Initialiser les managers
    this.globeManager = null;
    this.filtersManager = null;
    this.favoritesManager = null;
    this.popupManager = null;
    this.webflowAPI = null;
    this.audioManager = null;

    this.periodButtons = document.querySelectorAll(".period-btn");
    this.loadingOverlay = document.getElementById("loadingOverlay");

    this.init();
  }

  async init() {
    console.log("🌍 Initializing Time Travel Globe application...\n");

    // Initialiser les managers
    this.filtersManager = new FiltersManager();
    this.favoritesManager = new FavoritesManager();
    // "My creations" (site, Academy): the signed-in member's owner keys come
    // as ?owners= (always) and ?mine= (opens straight on their creations)
    const query = new URLSearchParams(window.location.search);
    const keys = (name) => (query.get(name) || "").split(",").filter(Boolean);
    this.myOwners = new Set([...keys("owners"), ...keys("mine")]);
    this.myCreationsOnly = keys("mine").length > 0;
    // Opened on the member's creations: the globe turns to the newest one
    this.focusPending = this.myCreationsOnly;
    this.startPeriod = query.get("period");
    this.popupManager = new PopupManager();
    this.webflowAPI = new WebflowAPI();
    this.audioManager = new AudioManager();

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
      this.setupCreationsSwitch();
      // Mettre à jour l'UI des boutons après l'init
      this.updateLayerUI();
      // ?period= (end of an Academy course): open on the course's period
      const startButton = this.startPeriod
        ? document.querySelector(`.period-btn[data-period="${CSS.escape(this.startPeriod)}"]`)
        : null;
      if (startButton) {
        this.onPeriodChange(startButton);
        // Bring it into view once the header is laid out (the smooth scroll
        // of onPeriodChange can run too early on first load)
        setTimeout(() => startButton.scrollIntoView({ block: "nearest", inline: "center" }), 600);
      } else {
        this.updateGlobe();
      }

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

  /**
   * Period header: horizontal scroll when the periods do not fit, by touch,
   * mouse drag or mouse wheel. A drag never triggers a period click.
   */
  setupPeriodScroll() {
    const bar = document.querySelector(".periods");
    if (!bar) return;

    // Start with the active period (Today, at the far right) in view
    const active = bar.querySelector(".period-btn.active");
    if (active) {
      bar.scrollLeft = active.offsetLeft - (bar.clientWidth - active.offsetWidth) / 2;
    }

    let startX = 0;
    let startScroll = 0;
    let pointerId = null;
    let dragged = false;

    bar.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScroll = bar.scrollLeft;
      dragged = false;
    });
    bar.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      if (!dragged && Math.abs(dx) > 5) {
        dragged = true;
        bar.classList.add("is-dragging");
        bar.setPointerCapture(pointerId);
      }
      if (dragged) bar.scrollLeft = startScroll - dx;
    });
    const end = () => {
      pointerId = null;
      bar.classList.remove("is-dragging");
    };
    bar.addEventListener("pointerup", end);
    bar.addEventListener("pointercancel", end);
    // Swallow the click that ends a drag
    bar.addEventListener(
      "click",
      (event) => {
        if (dragged) {
          event.stopPropagation();
          event.preventDefault();
          dragged = false;
        }
      },
      true,
    );

    // Vertical wheel scrolls the bar horizontally when it overflows
    bar.addEventListener(
      "wheel",
      (event) => {
        if (bar.scrollWidth <= bar.clientWidth) return;
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          bar.scrollLeft += event.deltaY;
          event.preventDefault();
        }
      },
      { passive: false },
    );
  }

  setupEventListeners() {
    this.setupPeriodScroll();
    this.setupPinPager();

    // Period buttons: every period is open to everyone (Memberstack paywall removed, 2026-10-20)
    this.periodButtons.forEach((btn) => {
      btn.addEventListener("click", () => this.onPeriodChange(btn));
    });

    // Layer buttons
    const layerButtons = document.querySelectorAll(".layer-btn");
    layerButtons.forEach((btn) => {
      btn.addEventListener("click", () => this.onLayerChange(btn));
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
    // Keep the chosen period visible in a scrolled header
    button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

    // Récupérer les données de la période
    this.currentPeriod = button.dataset.period;
    this.currentTime = parseInt(button.dataset.time);
    this.pinPage = 0;

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
      document.getElementById("pinPager")?.setAttribute("hidden", "");
      return;
    }

    const activeFilters = this.filtersManager.getActiveFilters();
    const apprenticeGlobe = this.filtersManager.globe === "apprentices";

    let filteredContents = this.webflowAPI.filterByPeriodAndType(this.currentPeriod, activeFilters);

    // The apprentices' globe is apart, never mixed with the artists' work;
    // "My creations" keeps the member's own pieces, on either globe
    filteredContents = filteredContents.filter((content) => {
      if (this.myCreationsOnly && !this.myOwners.has(content.owner)) return false;
      return apprenticeGlobe ? content.grade === "apprentice" : content.grade !== "apprentice";
    });
    console.log(
      `Affichage de ${filteredContents.length} contenus pour la période ${this.currentPeriod}`,
    );

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
    const shown = this.paginatePins(resolvedItems);
    this.globeManager.initClusterData(shown);
    if (this.focusPending && shown.length > 0) {
      this.focusPending = false;
      this.globeManager.focusOn(shown[0].lat, shown[0].lon);
    }
  }

  /**
   * Keep one page of pins, the most recent first, so the globe never gets
   * crowded however much the collection grows; updates the pager
   * @param {Array} items - Resolved pins
   * @returns {Array} The pins of the current page
   */
  paginatePins(items) {
    const size = this.pinPageSize;
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / size));
    this.pinPage = Math.min(this.pinPage, pages - 1);
    const start = this.pinPage * size;
    const end = Math.min(start + size, total);

    const pager = document.getElementById("pinPager");
    if (pager) {
      // Always shown, so the page size stays choosable in every period
      pager.hidden = false;
      // "Latest" is dropped on phones (.pin-pager-latest), where room is short
      document.getElementById("pinPagerLabel").innerHTML =
        total === 0
          ? this.myCreationsOnly
            ? "None of yours here"
            : "No pieces here"
          : `${this.pinPage === 0 ? `<span class="pin-pager-latest">Latest </span>${end}` : `${start + 1}–${end}`} of ${total}`;
      document.getElementById("pinPagerNewer").disabled = this.pinPage === 0;
      document.getElementById("pinPagerOlder").disabled = this.pinPage === pages - 1;
    }

    const time = (item) => (item.data.createdOn ? new Date(item.data.createdOn).getTime() : 0);
    return items.sort((a, b) => time(b) - time(a)).slice(start, end);
  }

  /** "My creations": only for a member who has some keys; off shows everyone's work. */
  setupCreationsSwitch() {
    const toggle = document.getElementById("creationsSwitch");
    if (!toggle) return;
    if (this.myOwners.size === 0) {
      toggle.hidden = true;
      return;
    }
    const render = () => {
      toggle.classList.toggle("active", this.myCreationsOnly);
      toggle.setAttribute("aria-checked", String(this.myCreationsOnly));
    };
    this.renderCreationsSwitch = render;
    const flip = () => {
      this.myCreationsOnly = !this.myCreationsOnly;
      this.pinPage = 0;
      render();
      this.updatePoints();
    };
    toggle.addEventListener("click", flip);
    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flip();
      }
    });
    render();
    // Opened on the member's creations (end of a course): say so, next to the switch
    if (this.myCreationsOnly) this.showCreationsHint(toggle);
  }

  /**
   * A bubble next to "My creations", sliding in with a pulse on the switch,
   * so the member sees that only their pieces are shown; it goes after a few
   * seconds, on a click anywhere, or when the switch changes.
   */
  showCreationsHint(toggle) {
    const hint = document.createElement("div");
    hint.className = "creations-hint";
    hint.setAttribute("role", "status");
    hint.innerHTML =
      '<strong>Only your creations</strong><span>Turn off "My creations" to see everyone\'s work.</span>';
    document.body.appendChild(hint);
    const place = () => {
      const box = toggle.getBoundingClientRect();
      hint.style.left = `${box.right + 14}px`;
      hint.style.top = `${box.top + box.height / 2}px`;
    };
    place();
    toggle.classList.add("is-pulsing");
    requestAnimationFrame(() => hint.classList.add("is-shown"));
    let gone = false;
    const close = () => {
      if (gone) return;
      gone = true;
      toggle.classList.remove("is-pulsing");
      hint.classList.remove("is-shown");
      window.removeEventListener("resize", place);
      setTimeout(() => hint.remove(), 400);
    };
    window.addEventListener("resize", place);
    setTimeout(close, 7000);
    setTimeout(() => document.addEventListener("pointerdown", close, { once: true }), 300);
    toggle.addEventListener("click", close, { once: true });
  }

  /**
   * Another globe chosen: back to everyone's work ("My creations" opened from
   * a course would otherwise leave the artists' globe empty for a learner)
   */
  onGlobeChanged() {
    if (this.myCreationsOnly) {
      this.myCreationsOnly = false;
      this.renderCreationsSwitch?.();
    }
    this.pinPage = 0;
    this.updatePoints();
  }

  setupPinPager() {
    const step = (delta) => {
      this.pinPage = Math.max(0, this.pinPage + delta);
      this.updatePoints();
    };
    document.getElementById("pinPagerNewer")?.addEventListener("click", () => step(-1));
    document.getElementById("pinPagerOlder")?.addEventListener("click", () => step(1));

    const sizeButtons = document.querySelectorAll(".pin-pager-size-btn");
    sizeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.pinPageSize = Number(button.dataset.size);
        this.pinPage = 0;
        sizeButtons.forEach((other) => {
          const selected = other === button;
          other.classList.toggle("active", selected);
          other.setAttribute("aria-pressed", String(selected));
        });
        this.updatePoints();
      });
    });
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
    this.pinPage = 0;
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
    popup.className = "cluster-list";

    const header = document.createElement("div");
    header.className = "cluster-list-title";
    header.textContent = `${items.length} contents at this location`;
    popup.appendChild(header);

    const list = document.createElement("div");
    list.className = "cluster-list-items";
    popup.appendChild(list);

    items.forEach(item => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "cluster-list-item";
      row.textContent = item.name || item.title || "Unnamed";
      row.onclick = () => { popup.remove(); this.showContentPopup(item); };
      list.appendChild(row);
    });

    const close = document.createElement("button");
    close.type = "button";
    close.className = "cluster-list-close";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
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
