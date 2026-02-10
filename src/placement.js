/**
 * PREHISTORIC DOMAIN - Placement Tool Controller
 *
 * Interactive tool for manually correcting item MODERN positions on the globe.
 * Shows the modern globe by default (since fixes are modern coordinates).
 * "Preview Paleo" toggle shows the reconstructed position for context.
 * Reuses GlobeManager from globe.js for rendering.
 */

class PlacementController {
  constructor() {
    this.globe = null;
    this.items = [];
    this.filteredItems = [];
    this.fixes = {};
    this.currentIndex = 0;
    this.currentFilter = "all";
    this.proposedCoords = null;
    this.proposedMarker = null;
    this.currentMarker = null;
    this.isPaleoView = false;

    this.PERIOD_MAPPING = {
      today: 0,
      quaternary: 2,
      neogene: 15,
      paleogene: 50,
      cretaceous: 100,
      jurassic: 160,
      triassic: 220,
      permian: 280,
      carboniferous: 320,
      devonian: 380,
      silurian: 410,
      ordovician: 450,
      cambrian: 500,
    };

    this.init();
  }

  async init() {
    this.globe = new GlobeManager("globe-canvas");

    // Override the default click handler
    this.globe.clickHandler = (e) => this.onGlobeClick(e);

    await Promise.all([this.loadItems(), this.loadFixes()]);

    this.applyFilter();
    this.setupEvents();

    // Small delay to let globe initialize
    setTimeout(() => this.showCurrentItem(), 200);
  }

  async loadItems() {
    try {
      const response = await fetch("/api/items");
      const data = await response.json();
      this.items = (data.items || []).filter((item) => item.displayOnApp);
      console.log(`Loaded ${this.items.length} items`);
    } catch (err) {
      console.error("Failed to load items:", err);
      this.items = [];
    }
  }

  async loadFixes() {
    try {
      const response = await fetch("/api/fixes");
      this.fixes = await response.json();
      console.log(`Loaded ${Object.keys(this.fixes).length} fixes`);
    } catch (err) {
      this.fixes = {};
    }
  }

  applyFilter() {
    switch (this.currentFilter) {
      case "needs-fix":
        this.filteredItems = this.items.filter(
          (item) =>
            item.paleoValidation === "ocean_no_correction" ||
            item.confidence === "low",
        );
        break;
      case "corrected":
        this.filteredItems = this.items.filter(
          (item) => item.paleoValidation === "corrected_to_land",
        );
        break;
      case "has-fix":
        this.filteredItems = this.items.filter(
          (item) => this.fixes[item.slug] != null,
        );
        break;
      default:
        this.filteredItems = [...this.items];
    }
    this.currentIndex = 0;
    this.updateCounter();
  }

  setupEvents() {
    document
      .getElementById("btnPrev")
      .addEventListener("click", () => this.navigate(-1));
    document
      .getElementById("btnNext")
      .addEventListener("click", () => this.navigate(1));

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") this.navigate(-1);
      if (e.key === "ArrowRight") this.navigate(1);
      if (e.key === "p" || e.key === "P") this.togglePaleoView();
    });

    document
      .getElementById("btnSaveFix")
      .addEventListener("click", () => this.saveFix());
    document
      .getElementById("btnReset")
      .addEventListener("click", () => this.resetProposed());
    document
      .getElementById("btnToggleView")
      .addEventListener("click", () => this.togglePaleoView());

    document.querySelectorAll(".filter-controls button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".filter-controls button")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentFilter = btn.dataset.filter;
        this.applyFilter();
        this.showCurrentItem();
      });
    });
  }

  onGlobeClick(event) {
    // Block clicks in paleo preview mode
    if (this.isPaleoView) return;

    const rect = this.globe.container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.globe.camera);

    // Intersect with the globe mesh
    const hits = raycaster.intersectObject(this.globe.globe);
    if (hits.length === 0) return;

    const point = hits[0].point;
    const localPoint = this.globe.globe.worldToLocal(point.clone());
    const coords = this.vector3ToLatLon(localPoint, 2.0);

    this.proposedCoords = {
      lat: Math.round(coords.lat * 100) / 100,
      lon: Math.round(coords.lon * 100) / 100,
    };

    this.showProposedMarker();
    this.updateProposedDisplay();
    document.getElementById("btnSaveFix").disabled = false;
  }

  /**
   * Reverse of GlobeManager.latLonToVector3
   */
  vector3ToLatLon(point, radius) {
    const r = radius || point.length();
    const phi = Math.acos(Math.max(-1, Math.min(1, point.y / r)));
    const lat = 90 - (phi * 180) / Math.PI;

    const sinPhi = Math.sin(phi);
    let lon;
    if (Math.abs(sinPhi) < 1e-10) {
      lon = 0;
    } else {
      const theta = Math.atan2(
        point.z / (r * sinPhi),
        -point.x / (r * sinPhi),
      );
      lon = (theta * 180) / Math.PI - 180;
    }

    while (lon < -180) lon += 360;
    while (lon > 180) lon -= 360;

    return { lat, lon };
  }

  navigate(direction) {
    if (this.filteredItems.length === 0) return;
    this.currentIndex =
      (this.currentIndex + direction + this.filteredItems.length) %
      this.filteredItems.length;
    this.isPaleoView = false;
    this.resetProposed();
    this.showCurrentItem();
  }

  async togglePaleoView() {
    if (this.filteredItems.length === 0) return;
    this.isPaleoView = !this.isPaleoView;

    const item = this.filteredItems[this.currentIndex];
    const period = item.geologicalPeriod || "today";
    const age = this.PERIOD_MAPPING[period] || 0;

    this.globe.clearPoints();

    const btn = document.getElementById("btnToggleView");
    const hint = document.getElementById("clickHint");
    const globeCanvas = document.getElementById("globe-canvas");

    if (this.isPaleoView) {
      // Show paleo map with paleo position
      await this.globe.loadContinentsOnly(age);
      btn.textContent = `Paleo View (${age} Ma) — Press P for Modern`;
      btn.classList.add("active-paleo");
      hint.textContent =
        "Paleo preview — click disabled. Press P to return to Modern view.";
      globeCanvas.style.cursor = "default";

      // Show paleo position
      const periodKey = String(age);
      const periodCoords = item.periods?.[periodKey];
      if (periodCoords) {
        const marker = this.globe.addPoint(
          periodCoords.lat,
          periodCoords.lon,
          { ...item, title: item.name + " (paleo)" },
        );
        this.setMarkerColor(marker, 0xfdcb6e);
      }
    } else {
      // Back to modern view
      await this.globe.loadContinentsOnly(0);
      btn.textContent = "Preview Paleo (P)";
      btn.classList.remove("active-paleo");
      hint.textContent =
        "Click on the globe to propose new MODERN coordinates";
      globeCanvas.style.cursor = "crosshair";

      // Show modern position marker
      this.showModernMarker(item);

      // Re-show proposed marker if any
      if (this.proposedCoords) {
        this.showProposedMarker();
      }
    }
  }

  getModernCoords(item) {
    const hasFix = this.fixes[item.slug] != null;
    return {
      lat: hasFix ? this.fixes[item.slug].lat : item.modernLat,
      lon: hasFix ? this.fixes[item.slug].lon : item.modernLon,
      hasFix,
    };
  }

  showModernMarker(item) {
    const { lat, lon, hasFix } = this.getModernCoords(item);
    if (lat == null || lon == null) return;

    this.currentMarker = this.globe.addPoint(lat, lon, {
      ...item,
      title: item.name,
    });

    this.setMarkerColor(
      this.currentMarker,
      hasFix
        ? 0x58a6ff
        : item.paleoValidation === "on_land"
          ? 0x00b894
          : 0xff6b35,
    );
  }

  async showCurrentItem() {
    if (this.filteredItems.length === 0) {
      document.getElementById("itemName").textContent =
        "No items match this filter";
      document.getElementById("itemMeta").innerHTML = "";
      document.getElementById("currentLatLon").textContent = "--";
      document.getElementById("paleoLatLon").textContent = "--";
      return;
    }

    const item = this.filteredItems[this.currentIndex];
    this.updateCounter();

    const period = item.geologicalPeriod || "unknown";
    const age = this.PERIOD_MAPPING[period] || 0;
    const { lat: modernLat, lon: modernLon, hasFix } = this.getModernCoords(item);

    document.getElementById("itemName").textContent = item.name;

    let statusHtml = "";
    if (hasFix) {
      statusHtml = '<span class="status-badge fixed">FIXED</span>';
    } else if (item.paleoValidation === "ocean_no_correction") {
      statusHtml = '<span class="status-badge ocean">IN OCEAN</span>';
    } else if (item.paleoValidation === "corrected_to_land") {
      statusHtml = '<span class="status-badge corrected">CORRECTED</span>';
    } else if (item.paleoValidation === "on_land") {
      statusHtml = '<span class="status-badge on-land">ON LAND</span>';
    }

    document.getElementById("itemMeta").innerHTML = `
      <p><strong>Slug:</strong> ${item.slug}</p>
      <p><strong>Period:</strong> ${period} (${age} Ma)</p>
      <p><strong>Category:</strong> ${item.category}</p>
      <p><strong>Confidence:</strong> ${item.confidence || "unknown"}</p>
      <p><strong>Location:</strong> ${item.location || "unknown"}</p>
      <p><strong>Free-tags:</strong> ${item.freeTags || "none"}</p>
      <p>${statusHtml}</p>
      ${hasFix ? `<p style="color:#58a6ff;"><strong>Fix:</strong> ${this.fixes[item.slug].reason}</p>` : ""}
    `;

    // Modern coords display
    document.getElementById("currentLatLon").textContent =
      `${modernLat?.toFixed(2) || "--"}, ${modernLon?.toFixed(2) || "--"}`;

    // Paleo coords display
    const periodKey = String(age);
    const periodCoords = item.periods?.[periodKey];
    if (periodCoords) {
      document.getElementById("paleoLatLon").textContent =
        `${periodCoords.lat?.toFixed(2) || "--"}, ${periodCoords.lon?.toFixed(2) || "--"} (${periodCoords.validationStatus || "unknown"})`;
    } else {
      document.getElementById("paleoLatLon").textContent = "not reconstructed";
    }

    // Load MODERN globe (age=0) — fixes are modern coordinates
    this.isPaleoView = false;
    this.globe.clearPoints();
    await this.globe.loadContinentsOnly(0);

    // Reset view toggle button
    const btn = document.getElementById("btnToggleView");
    btn.textContent = "Preview Paleo (P)";
    btn.classList.remove("active-paleo");
    document.getElementById("clickHint").textContent =
      "Click on the globe to propose new MODERN coordinates";
    document.getElementById("globe-canvas").style.cursor = "crosshair";

    // Show the current modern position marker
    this.showModernMarker(item);
  }

  setMarkerColor(sprite, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d", { alpha: true });

    const hex = "#" + color.toString(16).padStart(6, "0");

    // Outer ring
    ctx.strokeStyle = hex;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(32, 32, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Filled circle
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.arc(32, 32, 14, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(27, 27, 5, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    sprite.material.map = texture;
    sprite.material.needsUpdate = true;
  }

  showProposedMarker() {
    // Remove old proposed marker
    if (this.proposedMarker) {
      this.globe.globe.remove(this.proposedMarker);
      const idx = this.globe.points.indexOf(this.proposedMarker);
      if (idx !== -1) this.globe.points.splice(idx, 1);
      this.proposedMarker = null;
    }

    if (!this.proposedCoords) return;

    this.proposedMarker = this.globe.addPoint(
      this.proposedCoords.lat,
      this.proposedCoords.lon,
      { title: "Proposed", type: "proposed" },
    );
    this.setMarkerColor(this.proposedMarker, 0x58a6ff);
  }

  updateProposedDisplay() {
    const el = document.getElementById("proposedCoords");
    const span = document.getElementById("proposedLatLon");

    if (this.proposedCoords) {
      el.style.display = "block";
      span.textContent = `${this.proposedCoords.lat.toFixed(2)}, ${this.proposedCoords.lon.toFixed(2)}`;
    } else {
      el.style.display = "none";
    }
  }

  updateCounter() {
    document.getElementById("itemCounter").textContent = `Item ${
      this.filteredItems.length > 0 ? this.currentIndex + 1 : 0
    } / ${this.filteredItems.length}`;
  }

  resetProposed() {
    this.proposedCoords = null;
    if (this.proposedMarker) {
      this.globe.globe.remove(this.proposedMarker);
      const idx = this.globe.points.indexOf(this.proposedMarker);
      if (idx !== -1) this.globe.points.splice(idx, 1);
      this.proposedMarker = null;
    }
    this.updateProposedDisplay();
    document.getElementById("btnSaveFix").disabled = true;
    document.getElementById("fixReason").value = "";
  }

  async saveFix() {
    if (!this.proposedCoords) return;
    const item = this.filteredItems[this.currentIndex];
    if (!item) return;

    const reason =
      document.getElementById("fixReason").value.trim() ||
      "Manual fix via placement tool";

    try {
      const response = await fetch("/api/save-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: item.slug,
          lat: this.proposedCoords.lat,
          lon: this.proposedCoords.lon,
          reason,
        }),
      });

      const result = await response.json();
      if (result.ok) {
        this.fixes[item.slug] = {
          lat: this.proposedCoords.lat,
          lon: this.proposedCoords.lon,
          reason,
        };
        console.log(`Fix saved for "${item.slug}"`);
        this.resetProposed();
        this.showCurrentItem();
      } else {
        alert("Error: " + (result.error || "unknown"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PlacementController();
});
