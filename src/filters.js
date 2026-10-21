/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Gestion des filtres de contenu
 */

class FiltersManager {
  constructor() {
    this.activeFilters = new Set(["videos", "images", "3d"]);
    // Content types only ("My creations" has its own handler in app.js)
    this.filterElements = document.querySelectorAll(".filter-item[data-filter]");
    // Which globe: the artists' work ("artists") or the Academy apprentices' pieces
    this.globe = "artists";
    this.globeButtons = document.querySelectorAll(".globe-choice-btn");
    this.searchQuery = "";
    this.searchDebounceTimer = null;

    this.init();
  }

  init() {
    this.filterElements.forEach((element) => {
      element.addEventListener("click", () => this.toggleFilter(element));
      element.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggleFilter(element);
        }
      });
    });

    this.globeButtons.forEach((button) => {
      button.addEventListener("click", () => this.setGlobe(button.dataset.globe));
    });
    // ?layer=apprentices opens straight on the apprentices' globe (Academy course player)
    if (new URLSearchParams(window.location.search).get("layer") === "apprentices") {
      this.setGlobe("apprentices");
    }

    // "?" next to the globe choice: a short explanation, closed by Escape or a click elsewhere
    const helpBtn = document.getElementById("globeHelpBtn");
    const help = document.getElementById("globeHelp");
    if (helpBtn && help) {
      const setHelp = (open) => {
        help.hidden = !open;
        helpBtn.setAttribute("aria-expanded", String(open));
      };
      helpBtn.addEventListener("click", () => setHelp(help.hidden));
      document.addEventListener("click", (e) => {
        if (!help.hidden && !help.contains(e.target) && e.target !== helpBtn) setHelp(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !help.hidden) {
          setHelp(false);
          helpBtn.focus();
        }
      });
    }

    // Search input initialization
    this.searchInput = document.getElementById("searchInput");
    this.searchClearBtn = document.getElementById("searchClearBtn");

    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => {
        this.handleSearchInput(e.target.value);
      });
    }

    if (this.searchClearBtn) {
      this.searchClearBtn.addEventListener("click", () => {
        this.clearSearch();
      });
    }
  }

  toggleFilter(element) {
    const filterType = element.dataset.filter;

    if (this.activeFilters.has(filterType)) {
      this.activeFilters.delete(filterType);
      element.classList.remove("active");
    } else {
      this.activeFilters.add(filterType);
      element.classList.add("active");
    }
    element.setAttribute("aria-checked", String(this.activeFilters.has(filterType)));

    // Notifier le contrôleur de l'application
    if (window.appController) {
      window.appController.onFiltersChanged(this.activeFilters);
    }
  }

  setGlobe(globe) {
    if (globe === this.globe) return;
    this.globe = globe;
    this.globeButtons.forEach((button) => {
      const selected = button.dataset.globe === globe;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    if (window.appController) {
      window.appController.onGlobeChanged();
    }
  }

  isActive(filterType) {
    return this.activeFilters.has(filterType);
  }

  getActiveFilters() {
    return Array.from(this.activeFilters);
  }

  reset() {
    this.activeFilters = new Set(["videos", "images", "3d"]);
    this.filterElements.forEach((element) => {
      element.classList.add("active");
      element.setAttribute("aria-checked", "true");
    });
    this.clearSearch();
  }

  handleSearchInput(value) {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    if (this.searchClearBtn) {
      this.searchClearBtn.style.display = value ? "flex" : "none";
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.setSearchQuery(value);
    }, 400);
  }

  setSearchQuery(query) {
    this.searchQuery = query.trim().toLowerCase();
    if (window.appController) {
      window.appController.onFiltersChanged(this.activeFilters);
    }
  }

  getSearchQuery() {
    return this.searchQuery;
  }

  clearSearch() {
    this.searchQuery = "";
    if (this.searchInput) {
      this.searchInput.value = "";
    }
    if (this.searchClearBtn) {
      this.searchClearBtn.style.display = "none";
    }
    if (window.appController) {
      window.appController.onFiltersChanged(this.activeFilters);
    }
  }
}

window.FiltersManager = FiltersManager;
