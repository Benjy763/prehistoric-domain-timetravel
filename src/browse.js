/**
 * PREHISTORIC DOMAIN - Browse Page
 * Search and display all CMS contents (eligible + non-eligible)
 */

class BrowseManager {
  constructor() {
    this.allContents = [];
    this.filteredContents = [];
    this.searchInput = document.getElementById("searchInput");
    this.searchButton = document.getElementById("searchButton");
    this.browseHeader = document.getElementById("browseHeader");
    this.resultsCount = document.getElementById("resultsCount");
    this.browseGrid = document.getElementById("browseGrid");
    this.loadingState = document.getElementById("loadingState");
    this.noResultsState = document.getElementById("noResultsState");
    this.hasSearched = false;

    this.init();
  }

  async init() {
    console.log("🔍 Browse Manager initialized");

    // Load contents
    await this.loadContents();

    // Setup search button
    this.searchButton.addEventListener("click", () => {
      this.triggerSearch();
    });

    // Setup Enter key
    this.searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.triggerSearch();
      }
    });

    // Hide everything initially
    this.showInitialState();
  }

  showInitialState() {
    this.browseGrid.classList.add("hidden");
    this.loadingState.classList.add("hidden");
    this.noResultsState.classList.add("hidden");
    this.resultsCount.classList.add("hidden");
  }

  triggerSearch() {
    if (!this.hasSearched) {
      // First search - show loader, animate to top, then show results
      this.hasSearched = true;
      this.showLoadingState();
      this.browseHeader.classList.add("at-top");

      // Wait for animation to complete before showing results
      setTimeout(() => {
        this.handleSearch(this.searchInput.value);
      }, 500); // Match CSS transition duration
    } else {
      // Subsequent searches - show results immediately
      this.handleSearch(this.searchInput.value);
    }
  }

  async loadContents() {
    try {
      console.log("📦 Loading contents from content-data.json...");

      const response = await fetch("assets/data/content-data.json");
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      this.allContents = data.items || [];

      console.log(
        `✅ Loaded ${this.allContents.length} contents (${data.metadata.eligibleItems} eligible for globe)`,
      );

      this.loadingState.classList.add("hidden");
    } catch (error) {
      console.error("❌ Failed to load contents:", error);
      this.loadingState.innerHTML = `
        <p style="color: #ef4444;">Failed to load contents. Please try again.</p>
      `;
    }
  }

  handleSearch(query) {
    const trimmedQuery = query.trim().toLowerCase();

    if (trimmedQuery === "") {
      // Show all contents when input is empty
      this.filteredContents = this.allContents;
    } else {
      this.filteredContents = this.allContents.filter((item) =>
        this.matchesQuery(item, trimmedQuery),
      );
    }

    // For subsequent searches (not first), show loader briefly
    if (this.filteredContents.length > 0 && this.hasSearched) {
      this.showLoadingState();

      // Minimum loader display time for smooth UX
      setTimeout(() => {
        this.displayAllResults();
      }, 150);
    } else {
      // No results or first search (loader already shown) - display directly
      this.displayAllResults();
    }
  }

  showLoadingState() {
    this.browseGrid.classList.add("hidden");
    this.noResultsState.classList.add("hidden");
    this.loadingState.classList.remove("hidden");
    this.loadingState.innerHTML = `
      <div class="loading-spinner"></div>
    `;
  }

  matchesQuery(item, query) {
    const searchableFields = [
      item.name || "",
      item.description || "",
      item.freeTags || "",
      item.creditsLine || "",
      item.category || "",
      item.geologicalPeriod || "",
    ];

    const searchText = searchableFields.join(" ").toLowerCase();
    return searchText.includes(query);
  }

  displayAllResults() {
    if (this.filteredContents.length === 0) {
      this.browseGrid.classList.add("hidden");
      this.noResultsState.classList.remove("hidden");
      this.noResultsState.innerHTML = `
        <div class="no-results-icon">🔍</div>
        <h2>No results found</h2>
        <p>Try adjusting your search or browse all content</p>
      `;
      return;
    }

    this.browseGrid.classList.remove("hidden");
    this.loadingState.classList.add("hidden");
    this.noResultsState.classList.add("hidden");

    // Display all results at once
    this.browseGrid.innerHTML = this.filteredContents
      .map((item) => this.createCard(item))
      .join("");

    // Add click listeners to all cards
    this.browseGrid.querySelectorAll(".content-card").forEach((card) => {
      card.addEventListener("click", () => {
        const url = card.dataset.url;
        if (url) {
          window.top.location.href = url;
        }
      });
    });

    console.log(`📄 Displaying ${this.filteredContents.length} results`);
  }

  createCard(item) {
    let category = item.category || "unknown";

    // Auto-detect category if unknown
    if (category === "unknown") {
      if (item.youtubeId || item.youtubeUrl) {
        category = "videos";
      } else if (item.galleryImage || item.backgroundImage) {
        category = "images";
      }
    }

    const badgeClass = `badge-${category}`;
    const categoryLabel = this.getCategoryLabel(category);
    const preview = this.getPreviewUrl(item, category);
    const fallback = this.getFallbackUrl(item, category);

    // Escape HTML to prevent XSS
    const escapeHtml = (str) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const safeName = escapeHtml(item.name || "Untitled");
    const safeUrl = escapeHtml(item.pageUrl || "#");
    const safeAlt = escapeHtml(item.name || "Content");

    return `
      <div class="content-card" data-url="${safeUrl}">
        <img
          src="${preview}"
          alt="${safeAlt}"
          class="card-image"
          loading="lazy"
          onerror="this.onerror=null; this.src='${fallback}';"
        />
        <div class="card-content">
          <div class="card-category ${badgeClass}">${categoryLabel}</div>
          <h3 class="card-title">${safeName}</h3>
        </div>
      </div>
    `;
  }

  getPreviewUrl(item, category) {
    // Priority 1: Existing preview field
    if (item.preview && !item.preview.includes("maxresdefault")) {
      return item.preview;
    }

    // Priority 2: For videos, try hqdefault (more reliable than maxresdefault)
    if (category === "videos" && item.youtubeId) {
      return `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`;
    }

    // Priority 3: Gallery or background image
    if (item.galleryImage) return item.galleryImage;
    if (item.backgroundImage) return item.backgroundImage;

    // Priority 4: Default placeholder
    return this.getDefaultPreview(category);
  }

  getFallbackUrl(item, category) {
    // Fallback chain: sddefault → default thumbnail → placeholder
    if (item.youtubeId) {
      return `https://img.youtube.com/vi/${item.youtubeId}/sddefault.jpg`;
    }
    return this.getDefaultPreview(category);
  }

  getCategoryLabel(category) {
    const labels = {
      videos: "Video",
      images: "Image",
      "3D": "3D Immersion",
      texts: "Behind The Scenes",
    };
    return labels[category] || category;
  }

  getDefaultPreview(category) {
    // Placeholder SVG for missing images
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect fill='%231a1a1a' width='800' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-family='sans-serif' font-size='20'%3E${category}%3C/text%3E%3C/svg%3E`;
  }

}

// Initialize
new BrowseManager();
