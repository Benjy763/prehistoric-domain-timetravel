/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Gestion des filtres de contenu
 */

class FiltersManager {
  constructor() {
    // Note: "favorites" and "new" are NOT active by default - user must enable them
    this.activeFilters = new Set(["videos", "images", "3d"]);
    this.filterElements = document.querySelectorAll(".filter-item");
    this.searchQuery = "";
    this.searchDebounceTimer = null;

    this.init();
  }

  init() {
    this.filterElements.forEach((element) => {
      element.addEventListener("click", () => {
        this.toggleFilter(element);
      });
    });

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

    // Notifier le contrôleur de l'application
    if (window.appController) {
      window.appController.onFiltersChanged(this.activeFilters);
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
      const isSwitch = element.classList.contains("filter-switch");
      if (isSwitch) {
        element.classList.remove("active");
      } else {
        element.classList.add("active");
      }
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
