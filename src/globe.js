/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * 3D Globe management with Three.js
 */

class GlobeManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.globe = null;
    this.controls = null;
    this.points = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.coastlines = null;
    this.continents = null; // Continent polygons
    this.caoLands = null; // Cao emerged lands overlay

    // Texture cache for periods
    this.textureCache = new Map();
    this.textureCache_muller = new Map();
    this.isPreloading = false;

    // Cao period mapping (loaded from period-mapping.json)
    this.caoMapping = null;

    // Current layer: 'cao2017' or 'muller2022'
    this.currentLayer = "cao2017";

    this.init();
  }

  init() {
    // Créer la scène
    this.scene = new THREE.Scene();

    // Créer la caméra
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000,
    );
    this.camera.position.z = 5;

    // Créer le renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight,
    );
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Ajouter le fond étoilé
    this.addStarfield();

    // Ajouter les lumières
    this.addLights();

    // Créer le globe
    this.createGlobe();

    // Add controls
    this.addControls();

    // Handle resize
    window.addEventListener("resize", () => this.onWindowResize());

    // Handle clicks
    this.container.addEventListener("click", (e) => this.onMouseClick(e));

    // Start animation
    this.animate();
  }

  addStarfield() {
    // Create realistic starfield with size and color variations
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    const starColors = [];
    const starSizes = [];

    // Generate 5000 stars with realistic distribution
    for (let i = 0; i < 5000; i++) {
      // Random position on distant sphere
      const radius = 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      starPositions.push(x, y, z);

      // Realistic star colors: white, blue-white, yellow-white
      const starType = Math.random();
      let r, g, b;

      if (starType < 0.7) {
        // Most stars: white to blue-white
        const brightness = 0.8 + Math.random() * 0.2;
        r = brightness;
        g = brightness;
        b = Math.min(1, brightness + Math.random() * 0.2);
      } else if (starType < 0.9) {
        // Some stars: yellow-white
        r = 1;
        g = 0.95 + Math.random() * 0.05;
        b = 0.7 + Math.random() * 0.2;
      } else {
        // Few stars: pure white (bright)
        r = g = b = 1;
      }

      starColors.push(r, g, b);

      // Varied sizes (most small, few large)
      const sizeRandom = Math.random();
      const size =
        sizeRandom < 0.9 ? 0.5 + Math.random() * 1 : 1.5 + Math.random() * 2;
      starSizes.push(size);
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3),
    );
    starsGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(starColors, 3),
    );
    starsGeometry.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(starSizes, 1),
    );

    const starsMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }

  addLights() {
    // Ambient light - stronger to see the globe better
    const ambientLight = new THREE.AmbientLight(0xe6dac7, 0.8);
    this.scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 3, 5);
    this.scene.add(directionalLight);

    // Back light to see coastlines better
    const backLight = new THREE.DirectionalLight(0xe6dac7, 0.4);
    backLight.position.set(-5, -3, -5);
    this.scene.add(backLight);
  }

  createGlobe() {
    const geometry = new THREE.SphereGeometry(2, 128, 128);

    // Base material for globe - very dark ocean blue
    const material = new THREE.MeshPhongMaterial({
      color: 0x0a1929, // Very dark ocean blue
      emissive: 0x050d15,
      shininess: 30,
      transparent: false,
      opacity: 1.0,
    });

    this.globe = new THREE.Mesh(geometry, material);
    this.scene.add(this.globe);

    // Add atmosphere
    this.addAtmosphere();
  }

  addAtmosphere() {
    // Subtle blue atmosphere halo
    const atmosphereGeometry = new THREE.SphereGeometry(2.08, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(atmosphere);

    // Very subtle outer glow
    const glowGeometry = new THREE.SphereGeometry(2.12, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x6699ff,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(glow);
  }

  addControls() {
    // Simple manual controls (rotation with mouse)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    this.container.addEventListener("mousedown", (e) => {
      isDragging = true;
    });

    this.container.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        this.globe.rotation.y += deltaX * 0.005;
        this.globe.rotation.x += deltaY * 0.005;
      }

      previousMousePosition = {
        x: e.clientX,
        y: e.clientY,
      };
    });

    this.container.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Zoom with mouse wheel
    this.container.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.001;
      this.camera.position.z += delta;
      this.camera.position.z = Math.max(
        3,
        Math.min(10, this.camera.position.z),
      );
    });
  }

  async loadCoastlines(time) {
    // GPlates API doesn't require an API key
    // Using MATTHEWS2016 model (same base as Cao 2017)
    const url = `https://gws.gplates.org/reconstruct/coastlines/?time=${time}&model=MATTHEWS2016`;

    console.log(`🌍 Loading coastlines for ${time} Ma...`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(
        `✅ Coastlines loaded: ${data.features?.length || 0} features`,
      );

      // Remove old coastlines
      if (this.coastlines) {
        this.globe.remove(this.coastlines);
      }

      // Create new coastlines
      this.coastlines = this.createCoastlinesFromData(data);
      this.globe.add(this.coastlines);

      return true;
    } catch (error) {
      console.error("❌ Error loading coastlines:", error);
      console.warn(
        "⚠️  Globe will be displayed without prehistoric coastlines",
      );
      return false;
    }
  }

  async loadCaoLands(projectTime) {
    // Load period mapping if not already loaded
    if (!this.caoMapping) {
      try {
        const mappingResponse = await fetch(
          "assets/cao-paleogeography/period-mapping.json",
        );
        this.caoMapping = await mappingResponse.json();
      } catch (error) {
        console.error("❌ Error loading Cao period mapping:", error);
        return false;
      }
    }

    // Find corresponding Cao file for this project time
    const periodKey = Object.keys(this.caoMapping).find(
      (key) => this.caoMapping[key].project_age === projectTime,
    );

    if (!periodKey) {
      console.warn(`⚠️  No Cao data for ${projectTime} Ma`);
      return false;
    }

    const caoFile = this.caoMapping[periodKey].cao_file;
    const url = `assets/cao-paleogeography/${caoFile}`;

    console.log(
      `🌱 Loading Cao emerged lands for ${projectTime} Ma (using ${caoFile})...`,
    );

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(
        `✅ Cao lands loaded: ${data.features?.length || 0} polygons, ${data.metadata?.land_percent || "?"}% land`,
      );

      // Generate Cao texture overlay
      const caoTexture = this.generateCaoTexture(data);

      // Apply as overlay on globe material
      if (this.globe.material.map) {
        // Combine base texture with Cao overlay
        this.applyCaoOverlay(caoTexture);
      }

      return true;
    } catch (error) {
      console.error("❌ Error loading Cao lands:", error);
      return false;
    }
  }

  async loadContinents(time) {
    // Check cache first
    if (this.textureCache.has(time)) {
      console.log(`📦 Using cached texture for ${time} Ma`);
      this.applyTextureToGlobe(this.textureCache.get(time));
      return true;
    }

    // Load from local GeoJSON files instead of API
    const url = `assets/geojson/${time}Ma.json`;

    console.log(`🗺️  Loading continents for ${time} Ma from local file...`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Data loaded: ${data.features?.length || 0} features`);

      // Generate texture with continents
      const texture = this.generateContinentTexture(data);

      // Cache the texture
      this.textureCache.set(time, texture);

      // Apply texture to globe
      this.applyTextureToGlobe(texture);

      return true;
    } catch (error) {
      console.error("❌ Error loading continents:", error);
      console.warn("⚠️  Globe will be displayed without continents");
      return false;
    }
  }

  async loadContinentsOnly(time) {
    // Couche Merdith 2021 : charger depuis fichiers locaux
    // Trouver le fichier le plus proche disponible
    const availableTimes = [
      2, 6, 14, 22, 33, 45, 53, 76, 90, 100, 105, 126, 140, 152, 160, 169, 195,
      218, 220, 232, 255, 277, 280, 287, 302, 320, 328, 348, 368, 380, 396, 410,
      450, 500,
    ];

    // Trouver le temps le plus proche
    let closestTime = availableTimes.reduce((prev, curr) =>
      Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev,
    );

    console.log(
      `🔍 Requested ${time} Ma, using closest available: ${closestTime} Ma`,
    );

    if (this.textureCache_muller.has(closestTime)) {
      console.log(`📦 Using cached Merdith texture for ${closestTime} Ma`);
      this.applyTextureToGlobe(this.textureCache_muller.get(closestTime));
      return true;
    }

    const url = `assets/merdith2021-coastlines/${closestTime}Ma.json`;
    console.log(
      `🗺️  Loading Merdith 2021 coastlines for ${closestTime} Ma from local file...`,
    );

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(
        `✅ Merdith coastlines loaded: ${data.features?.length || 0} features`,
      );

      // Generate texture avec coastlines blanches pleines
      const texture = this.generateMullerTexture(data);

      // Cache
      this.textureCache_muller.set(closestTime, texture);

      // Apply
      this.applyTextureToGlobe(texture);

      return true;
    } catch (error) {
      console.error("❌ Error loading Merdith coastlines:", error);
      return false;
    }
  }

  generateEmptyTexture() {
    // Create canvas with just ocean color
    const width = 2048;
    const height = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Dark blue ocean background
    ctx.fillStyle = "#0a1929";
    ctx.fillRect(0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  generateContinentTexture(data) {
    // Si on a les données Cao, extraire coastlines depuis Cao directement
    if (this.caoImageData) {
      return this.generateCoastlinesFromCao(this.caoImageData);
    }

    // Sinon utiliser les données GPlates (mode fallback)
    // Create canvas to draw equirectangular texture
    const width = 4096;
    const height = 2048;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Fond TRANSPARENT pour que les terres Cao soient visibles en dessous
    ctx.clearRect(0, 0, width, height);

    // Dessiner coastlines en blanc temporairement pour la dilatation
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2; // Trait fin pour précision

    if (data.features) {
      data.features.forEach((feature) => {
        if (feature.geometry && feature.geometry.coordinates) {
          const coords = feature.geometry.coordinates;
          const type = feature.geometry.type;

          if (type === "Polygon") {
            // Dessiner avec trait fin
            this.drawPolygonOnCanvas(ctx, coords[0], width, height, false);
          } else if (type === "MultiPolygon") {
            coords.forEach((polygonRings) => {
              this.drawPolygonOnCanvas(
                ctx,
                polygonRings[0],
                width,
                height,
                false,
              );
            });
          } else if (type === "LineString") {
            // Convertir lignes en zones pour fusion
            this.drawThickLineOnCanvas(ctx, coords, width, height);
          } else if (type === "MultiLineString") {
            coords.forEach((lineCoords) => {
              this.drawThickLineOnCanvas(ctx, lineCoords, width, height);
            });
          }
        }
      });
    }

    // Appliquer dilatation MINIMALE pour fusionner zones très proches sans dégrader précision (rayon 2)
    const imageData = ctx.getImageData(0, 0, width, height);
    const dilated = this.morphologicalDilation(imageData, 2);
    ctx.putImageData(dilated, 0, 0);

    // Maintenant dessiner uniquement les contours en orange
    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(dilated, 0, 0);

    // Extraire et dessiner contours uniquement
    const contourData = this.extractContours(dilated, width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(contourData, 0, 0);

    console.log("✅ Continent texture with merged coastlines");

    // Create Three.js texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  generateMullerTexture(data) {
    // Générer texture avec coastlines Muller 2022 en blanc plein
    const width = 4096;
    const height = 2048;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Fond océan bleu foncé
    ctx.fillStyle = "#0a1929";
    ctx.fillRect(0, 0, width, height);

    // Dessiner coastlines en blanc plein
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (data.features) {
      data.features.forEach((feature) => {
        if (feature.geometry && feature.geometry.coordinates) {
          const coords = feature.geometry.coordinates;
          const type = feature.geometry.type;

          if (type === "Polygon") {
            this.drawPolygonOnCanvas(ctx, coords[0], width, height, true);
          } else if (type === "MultiPolygon") {
            coords.forEach((polygonRings) => {
              this.drawPolygonOnCanvas(
                ctx,
                polygonRings[0],
                width,
                height,
                true,
              );
            });
          }
        }
      });
    }

    console.log("✅ Muller 2022 texture avec coastlines blanches");

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  generateCaoTexture(data) {
    const width = 4096;
    const height = 2048;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Désactiver antialiasing pour contours nets
    ctx.imageSmoothingEnabled = false;

    // Transparent background
    ctx.clearRect(0, 0, width, height);

    // Dessiner terres émergées en blanc avec léger débordement pour fusion
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 6; // Débordement pour fusionner zones proches
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (data.features) {
      data.features.forEach((feature) => {
        if (feature.geometry && feature.geometry.type === "Polygon") {
          const coords = feature.geometry.coordinates[0];
          this.drawPolygonWithStroke(ctx, coords, width, height);
        }
      });
    }

    // Binariser pour éliminer semi-transparence
    const imageData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] > 0) {
        imageData.data[i] = 255;
        imageData.data[i + 1] = 255;
        imageData.data[i + 2] = 255;
        imageData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    console.log("✅ Cao texture with merged zones and sharp contours");

    // Stocker pour extraction coastlines
    this.caoImageData = imageData;

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  drawPolygonWithStroke(ctx, coordinates, width, height) {
    if (!coordinates || coordinates.length < 3) return;

    ctx.beginPath();
    coordinates.forEach(([lon, lat], index) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();

    // Remplir ET tracer le contour pour fusion
    ctx.fill();
    ctx.stroke();
  }

  applyCaoOverlay(caoTexture) {
    // Combiner texture coastlines + terres Cao
    const baseTexture = this.globe.material.map;

    if (!baseTexture) {
      console.warn("⚠️ Pas de texture coastlines, utilisation Cao seul");
      // Juste Cao avec fond océan
      const canvas = document.createElement("canvas");
      canvas.width = 4096;
      canvas.height = 2048;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#0a1929";
      ctx.fillRect(0, 0, 4096, 2048);
      ctx.drawImage(caoTexture.image, 0, 0);

      const texture = new THREE.CanvasTexture(canvas);
      this.globe.material.map = texture;
      this.globe.material.needsUpdate = true;
      return;
    }

    // Créer canvas combiné
    const canvas = document.createElement("canvas");
    canvas.width = 4096;
    canvas.height = 2048;
    const ctx = canvas.getContext("2d");

    // 1. Fond océan bleu
    ctx.fillStyle = "#0a1929";
    ctx.fillRect(0, 0, 4096, 2048);

    // 2. Terres Cao en blanc
    ctx.drawImage(caoTexture.image, 0, 0);

    // Appliquer texture combinée
    const combinedTexture = new THREE.CanvasTexture(canvas);
    this.globe.material.map = combinedTexture;
    this.globe.material.needsUpdate = true;

    console.log("✅ Terres Cao affichées en blanc");
  }

  drawLineOnCanvas(ctx, coordinates, width, height) {
    if (!coordinates || coordinates.length < 2) return;

    ctx.beginPath();

    coordinates.forEach(([lon, lat], index) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = "#FF6B35";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawThickLineOnCanvas(ctx, coordinates, width, height) {
    // Dessiner ligne épaisse pour permettre fusion
    if (!coordinates || coordinates.length < 2) return;

    ctx.beginPath();

    coordinates.forEach(([lon, lat], index) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineWidth = 6; // Épaisse pour fusion
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();
  }

  extractContours(imageData, width, height) {
    // Extraire contours (pixels adjacents à transparent)
    const { data } = imageData;
    const output = new ImageData(width, height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];

        if (alpha > 0) {
          // Vérifier si pixel de contour (au moins 1 voisin transparent)
          let isEdge = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nidx = ((y + dy) * width + (x + dx)) * 4;
              if (data[nidx + 3] === 0) {
                isEdge = true;
                break;
              }
            }
            if (isEdge) break;
          }

          if (isEdge) {
            output.data[idx] = 255; // R - Orange
            output.data[idx + 1] = 107; // G
            output.data[idx + 2] = 53; // B
            output.data[idx + 3] = 255; // A
          }
        }
      }
    }

    return output;
  }

  generateCoastlinesFromCao(caoImageData) {
    // Générer coastlines directement depuis terres Cao pour alignement parfait
    const width = 4096;
    const height = 2048;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);

    // Extraire contours des terres Cao
    const contours = this.extractContours(caoImageData, width, height);
    ctx.putImageData(contours, 0, 0);

    console.log("✅ Coastlines extracted from Cao data (perfect alignment)");

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  drawPolygonOnCanvas(ctx, coordinates, width, height, fillOnly = false) {
    if (!coordinates || coordinates.length < 3) return;

    ctx.beginPath();

    coordinates.forEach(([lon, lat], index) => {
      // Convert lon/lat to canvas coordinates
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.closePath();

    if (fillOnly) {
      // Remplissage plein uniquement (pour Cao)
      ctx.fill();
    } else {
      // Remplissage ET contour épais pour compenser décalage modèles
      ctx.fill();
      ctx.stroke();
    }
  }

  applyTextureToGlobe(texture) {
    // Update globe material with texture - Phong for realistic reflections
    const material = new THREE.MeshPhongMaterial({
      color: 0xf9f9f9, // Off-white to not alter texture colors
      emissive: 0x000000,
      shininess: 10,
      map: texture, // Apply continent texture
      transparent: false,
    });

    this.globe.material = material;
    this.globe.material.needsUpdate = true;

    console.log("✅ Texture applied to globe");
  }

  simplifyCoordinates(coordinates, tolerance = 5) {
    // Simplification: keep 1 point every N
    if (!coordinates || coordinates.length < 3) return coordinates;

    const simplified = [];
    for (let i = 0; i < coordinates.length; i += tolerance) {
      simplified.push(coordinates[i]);
    }

    // Always include last point to close polygon
    if (
      simplified[simplified.length - 1] !== coordinates[coordinates.length - 1]
    ) {
      simplified.push(coordinates[coordinates.length - 1]);
    }

    return simplified;
  }

  createCoastlinesFromData(data) {
    const group = new THREE.Group();

    if (data.features) {
      data.features.forEach((feature) => {
        if (feature.geometry && feature.geometry.coordinates) {
          const coords = feature.geometry.coordinates;

          if (feature.geometry.type === "LineString") {
            const line = this.createLine(coords);
            if (line) group.add(line);
          } else if (feature.geometry.type === "MultiLineString") {
            coords.forEach((lineCoords) => {
              const line = this.createLine(lineCoords);
              if (line) group.add(line);
            });
          }
        }
      });
    }

    return group;
  }

  createLine(coordinates) {
    if (!coordinates || coordinates.length < 2) return null;

    const points = [];
    coordinates.forEach(([lon, lat]) => {
      const point = this.latLonToVector3(lat, lon, 2.01);
      points.push(point);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x6b8e23, // Greenish color for coastlines
      opacity: 0.7,
      transparent: true,
      linewidth: 1,
    });

    return new THREE.Line(geometry, material);
  }

  morphologicalDilation(imageData, radius) {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxAlpha = 0;

        // Vérifier voisinage circulaire
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            // Vérifier si dans le cercle
            if (dx * dx + dy * dy <= radius * radius) {
              const nx = x + dx;
              const ny = y + dy;

              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = (ny * width + nx) * 4;
                const alpha = data[idx + 3];
                if (alpha > maxAlpha) maxAlpha = alpha;
              }
            }
          }
        }

        const idx = (y * width + x) * 4;
        output.data[idx] = 255; // R
        output.data[idx + 1] = 255; // G
        output.data[idx + 2] = 255; // B
        output.data[idx + 3] = maxAlpha; // A
      }
    }

    return output;
  }

  morphologicalErosion(imageData, radius) {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minAlpha = 255;

        // Vérifier voisinage circulaire
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            // Vérifier si dans le cercle
            if (dx * dx + dy * dy <= radius * radius) {
              const nx = x + dx;
              const ny = y + dy;

              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = (ny * width + nx) * 4;
                const alpha = data[idx + 3];
                if (alpha < minAlpha) minAlpha = alpha;
              } else {
                minAlpha = 0; // Bord = transparent
              }
            }
          }
        }

        const idx = (y * width + x) * 4;
        output.data[idx] = 255; // R
        output.data[idx + 1] = 255; // G
        output.data[idx + 2] = 255; // B
        output.data[idx + 3] = minAlpha; // A
      }
    }

    return output;
  }

  morphologicalClosing(imageData, radius) {
    // Fermeture = dilatation puis érosion
    // Fusionne zones proches sans dégrader contours extérieurs
    const dilated = this.morphologicalDilation(imageData, radius);
    const closed = this.morphologicalErosion(dilated, radius);
    return closed;
  }

  latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }

  addPoint(lat, lon, data) {
    const position = this.latLonToVector3(lat, lon, 2.05);

    // Couleur selon le type de contenu
    let pointColor;
    switch (data.type) {
      case "videos":
      case "video":
        pointColor = 0x6c5ce7; // Violet pour vidéos
        break;
      case "images":
      case "image":
        pointColor = 0xfd79a8; // Rose pour images
        break;
      case "3d":
        pointColor = 0xfdcb6e; // Jaune pour 3D
        break;
      case "new":
        pointColor = 0x00b894; // Vert turquoise pour nouveautés
        break;
      default:
        pointColor = 0xf9f9f9; // Blanc par défaut
        break;
    }

    // Create glowing point
    const geometry = new THREE.SphereGeometry(0.03, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: pointColor,
      emissive: pointColor,
      emissiveIntensity: 0.8,
    });

    const point = new THREE.Mesh(geometry, material);
    point.position.copy(position);
    point.userData = data;

    this.globe.add(point);
    this.points.push(point);

    return point;
  }

  clearPoints() {
    this.points.forEach((point) => {
      this.globe.remove(point);
    });
    this.points = [];
  }

  onMouseClick(event) {
    // Calculate mouse position in normalized coordinates
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycasting
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.points);

    if (intersects.length > 0) {
      const clickedPoint = intersects[0].object;
      this.onPointClick(clickedPoint.userData);
    }
  }

  onPointClick(data) {
    // This method will be called from app.js
    if (window.appController) {
      window.appController.showContentPopup(data);
    }
  }

  onWindowResize() {
    this.camera.aspect =
      this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight,
    );
  }

  async preloadAllPeriods() {
    if (this.isPreloading) return;
    this.isPreloading = true;

    // All period times to preload
    const times = [0, 2, 15, 50, 100, 160, 220, 280, 320, 380, 410];

    console.log("🔄 Starting background preload of all periods...");

    // Preload one at a time with delay to not block the UI
    for (const time of times) {
      // Skip if already cached
      if (this.textureCache.has(time)) continue;

      // Use requestIdleCallback if available, otherwise setTimeout
      await new Promise((resolve) => {
        const preload = async () => {
          try {
            const url = `https://gws.gplates.org/reconstruct/coastlines_low/?time=${time}&avoid_map_boundary`;
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              const texture = this.generateContinentTexture(data);
              this.textureCache.set(time, texture);
              console.log(`✅ Preloaded ${time} Ma`);
            }
          } catch (error) {
            console.warn(`⚠️  Failed to preload ${time} Ma:`, error);
          }
          resolve();
        };

        if (window.requestIdleCallback) {
          requestIdleCallback(preload);
        } else {
          setTimeout(preload, 100);
        }
      });
    }

    console.log("✅ All periods preloaded!");
    this.isPreloading = false;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Slow automatic rotation
    this.globe.rotation.y += 0.001;

    // Animate points
    this.points.forEach((point, index) => {
      const scale = 1 + Math.sin(Date.now() * 0.003 + index) * 0.2;
      point.scale.set(scale, scale, scale);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
