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
    this.loadingProgress = 0; // 0 to 1 for holographic loading effect
    this.isLoading = false;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.coastlines = null;
    this.continents = null; // Continent polygons
    this.caoLands = null; // Cao emerged lands overlay
    this.clouds = null; // Animated clouds layer
    this.atmosphere = null; // Glow atmosphere (for dynamic scaling)

    // Hover state for pinpoints
    this.hoveredPoint = null;
    this.basePointScale = 0.03;
    this.hoverPointScale = 0.04;

    // Texture cache for periods
    this.textureCache = new Map();
    this.textureCache_muller = new Map();
    this.textureCache_cao = new Map();
    this.isPreloading = false;

    // Track last loaded time to avoid unnecessary loading animations
    this.lastLoadedContinentsTime = null;

    // Loading ID to cancel outdated loading operations
    this.currentLoadingId = 0;

    // Cao period mapping (loaded from period-mapping.json)
    this.caoMapping = null;

    // Current layer: 'cao2017' or 'muller2022'
    this.currentLayer = "cao2017";

    // External click handler (used by placement tool)
    this.clickHandler = null;

    // Auto-rotation
    this.autoRotate = true;

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
    // Moderate ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    this.scene.add(ambientLight);

    // Strong directional from top-right corner
    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    const lightPosition = new THREE.Vector3(5, 2, 3);
    directionalLight.position.copy(lightPosition);
    this.scene.add(directionalLight);
  }

  createGlobe() {
    const geometry = new THREE.SphereGeometry(2, 128, 128);

    // Transparent globe with subtle glow
    const material = new THREE.MeshLambertMaterial({
      color: 0x0a1929, // Dark navy blue
      transparent: true,
      opacity: 0.7, // Translucent
    });

    this.globe = new THREE.Mesh(geometry, material);
    this.scene.add(this.globe);

    // Add subtle external glow
    this.addAtmosphere();
  }

  addClouds() {
    // Generate procedural cloud texture with seamless wrapping
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Generate random cloud patches with better distribution
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 15 + Math.random() * 60;
      const opacity = 0.15 + Math.random() * 0.25; // More subtle

      // Create gradient for soft clouds
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.5})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const cloudTexture = new THREE.CanvasTexture(canvas);
    cloudTexture.wrapS = THREE.RepeatWrapping;
    cloudTexture.wrapT = THREE.ClampToEdgeWrapping;
    cloudTexture.needsUpdate = true;

    // Create cloud sphere slightly above globe
    const cloudGeometry = new THREE.SphereGeometry(2.03, 64, 64);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.25, // More subtle
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    this.scene.add(this.clouds);
  }

  addAtmosphere() {
    // Subtle glow halo around globe
    const atmosphereGeometry = new THREE.SphereGeometry(2.165, 64, 64);

    // Fresnel shader material for visible hologram glow
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.9 }, // Stronger glow for visibility
        p: { value: 3.5 }, // Broader falloff
        glowColor: { value: new THREE.Color(0x4488ff) }, // Brighter blue for visibility
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float c;
        uniform float p;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
          gl_FragColor = vec4(glowColor, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });

    this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(this.atmosphere);
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

      // Hover detection on pinpoints
      if (!isDragging && this.points.length > 0) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.points);

        const newHovered = intersects.length > 0 ? intersects[0].object : null;
        if (newHovered !== this.hoveredPoint) {
          this.hoveredPoint = newHovered;
          this.container.style.cursor = newHovered ? "pointer" : "grab";
        }
      }
    });

    this.container.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Touch events for mobile — passive: false to allow preventDefault
    let touchStartPos = null;
    let touchMoved = false;

    this.container.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          isDragging = true;
          touchMoved = false;
          touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          previousMousePosition = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        }
        this._lastTouchDistance = null;
      },
      { passive: false },
    );

    this.container.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (e.touches.length === 2) {
          // Pinch to zoom
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (this._lastTouchDistance != null) {
            const delta = (this._lastTouchDistance - dist) * 0.01;
            this.camera.position.z = Math.max(
              2.2,
              Math.min(10, this.camera.position.z + delta),
            );
          }
          this._lastTouchDistance = dist;
          isDragging = false;
          touchMoved = true;
        } else if (e.touches.length === 1 && isDragging) {
          const deltaX = e.touches[0].clientX - previousMousePosition.x;
          const deltaY = e.touches[0].clientY - previousMousePosition.y;
          if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) touchMoved = true;
          this.globe.rotation.y += deltaX * 0.005;
          this.globe.rotation.x += deltaY * 0.005;
          previousMousePosition = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        }
      },
      { passive: false },
    );

    this.container.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        // Detect tap (no significant movement) → trigger pinpoint click
        if (!touchMoved && touchStartPos) {
          this.onMouseClick({
            clientX: touchStartPos.x,
            clientY: touchStartPos.y,
          });
        }
        isDragging = false;
        touchMoved = false;
        touchStartPos = null;
        this._lastTouchDistance = null;
      },
      { passive: false },
    );

    // Zoom with mouse wheel
    this.container.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.001;
      this.camera.position.z += delta;
      this.camera.position.z = Math.max(
        2.2,
        Math.min(10, this.camera.position.z),
      );
    });
  }

  async loadCoastlines(time) {
    // GPlates API doesn't require an API key
    // Using MERDITH2021 model (aligné avec la reconstruction des points)
    const url = `https://gws.gplates.org/reconstruct/coastlines/?time=${time}&model=MERDITH2021`;

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

    // Increment loading ID to cancel outdated operations
    this.currentLoadingId++;
    const myLoadingId = this.currentLoadingId;

    // Start shader animation
    this.isLoading = false;
    this.loadingProgress = 0;
    this.startLoadingEffect();

    const delay = new Promise(resolve => setTimeout(resolve, 500));

    const loadTex = async () => {
      if (this.textureCache_cao.has(projectTime)) return this.textureCache_cao.get(projectTime);
      const url = `assets/cao-paleogeography/${caoFile}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const texture = this.generateCaoTexture(data);
      this.textureCache_cao.set(projectTime, texture);
      return texture;
    };

    try {
      const [_, caoTexture] = await Promise.all([delay, loadTex()]);

      if (myLoadingId !== this.currentLoadingId) return false;

      this.applyCaoOverlay(caoTexture);
      this.lastLoadedContinentsTime = projectTime;
      this.isLoading = false;
      return true;
    } catch (error) {
      console.error("❌ Error loading Cao lands:", error);
      this.isLoading = false;
      return false;
    }
  }

  async loadContinents(time) {
    console.log(`🔵 CLICK ${time} - progress AVANT reset: ${this.loadingProgress}`);

    // Increment loading ID and store it locally - this cancels all previous loading operations
    this.currentLoadingId++;
    const myLoadingId = this.currentLoadingId;
    console.log(`   🆔 Loading ID: ${myLoadingId}`);

    // FORCE complete reset
    this.isLoading = false;
    this.loadingProgress = 0;
    this.startLoadingEffect();

    console.log(`   APRÈS reset: progress=${this.loadingProgress}, isLoading=${this.isLoading}`);
    console.log(`   ⏱️ Timer 500ms START`);

    // 0.5s delay and texture load in PARALLEL
    const delay = new Promise(resolve => {
      setTimeout(() => {
        console.log(`   ✅ Timer 500ms DONE (ID ${myLoadingId})`);
        resolve();
      }, 500);
    });

    const loadTex = async () => {
      if (this.textureCache.has(time)) return this.textureCache.get(time);
      const url = `assets/geojson/${time}Ma.json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const texture = this.generateContinentTexture(data);
      this.textureCache.set(time, texture);
      return texture;
    };

    try {
      const [_, texture] = await Promise.all([delay, loadTex()]);

      // Only apply if this is still the current loading operation
      if (myLoadingId !== this.currentLoadingId) {
        console.log(`   🚫 CANCELLED (ID ${myLoadingId}, current is ${this.currentLoadingId})`);
        return false;
      }

      console.log(`   🎯 Applying texture (ID ${myLoadingId})`);
      this.applyTextureToGlobe(texture);
      this.isLoading = false;
      return true;
    } catch (error) {
      console.error("❌ Error:", error);
      this.isLoading = false;
      return false;
    }
  }

  async loadContinentsOnly(time) {
    console.log(`🔵 CLICK CONTINENTS ONLY ${time} - progress AVANT reset: ${this.loadingProgress}`);

    const availableTimes = [
      2, 6, 14, 22, 33, 45, 53, 76, 90, 100, 105, 126, 140, 152, 160, 169, 195,
      218, 220, 232, 255, 277, 280, 287, 302, 320, 328, 348, 368, 380, 396, 410,
      450, 500,
    ];
    let closestTime = availableTimes.reduce((prev, curr) =>
      Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev,
    );

    this.lastLoadedContinentsTime = time;

    // Increment loading ID and store it locally - this cancels all previous loading operations
    this.currentLoadingId++;
    const myLoadingId = this.currentLoadingId;
    console.log(`   🆔 Loading ID: ${myLoadingId}`);

    // FORCE complete reset
    this.isLoading = false;
    this.loadingProgress = 0;
    this.startLoadingEffect();

    console.log(`   APRÈS reset: progress=${this.loadingProgress}, isLoading=${this.isLoading}`);
    console.log(`   ⏱️ Timer 500ms START`);

    // 0.5s delay and texture load in PARALLEL
    const delay = new Promise(resolve => {
      setTimeout(() => {
        console.log(`   ✅ Timer 500ms DONE (ID ${myLoadingId})`);
        resolve();
      }, 500);
    });

    const loadTex = async () => {
      if (this.textureCache_muller.has(closestTime)) return this.textureCache_muller.get(closestTime);
      const url = `assets/merdith2021-coastlines/${closestTime}Ma.json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const texture = this.generateMullerTexture(data);
      this.textureCache_muller.set(closestTime, texture);
      return texture;
    };

    try {
      const [_, texture] = await Promise.all([delay, loadTex()]);

      // Only apply if this is still the current loading operation
      if (myLoadingId !== this.currentLoadingId) {
        console.log(`   🚫 CANCELLED (ID ${myLoadingId}, current is ${this.currentLoadingId})`);
        return false;
      }

      console.log(`   🎯 Applying texture (ID ${myLoadingId})`);
      this.applyTextureToGlobe(texture);
      this.isLoading = false;
      return true;
    } catch (error) {
      console.error("❌ Error:", error);
      this.isLoading = false;
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

    // Very dark navy ocean background
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

    // Dessiner coastlines en beige (moins blanc)
    ctx.fillStyle = "#c8c8c0";
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

    // Fond océan navy très foncé
    ctx.fillStyle = "#0a1929";
    ctx.fillRect(0, 0, width, height);

    // Dessiner coastlines en beige (moins blanc)
    ctx.fillStyle = "#c8c8c0";
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

    console.log("✅ Muller 2022 texture avec coastlines");

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

    // Dessiner terres émergées en beige (moins blanc) avec léger débordement pour fusion
    ctx.fillStyle = "#c8c8c0";
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

    // Binariser pour éliminer semi-transparence (utiliser beige pour cohérence)
    const imageData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] > 0) {
        // Use same beige color as Muller coastlines (#c8c8c0)
        imageData.data[i] = 200; // R: 0xc8 = 200
        imageData.data[i + 1] = 200; // G: 0xc8 = 200
        imageData.data[i + 2] = 192; // B: 0xc0 = 192
        imageData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    console.log("✅ Cao texture with merged zones and sharp contours");

    // Stocker pour extraction coastlines (after parchment)
    this.caoImageData = ctx.getImageData(0, 0, width, height);

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
      // Use applyTextureToGlobe for consistent rendering with bump mapping
      this.applyTextureToGlobe(texture);
      return;
    }

    // Créer canvas combiné
    const canvas = document.createElement("canvas");
    canvas.width = 4096;
    canvas.height = 2048;
    const ctx = canvas.getContext("2d");

    // 1. Fond océan navy très foncé
    ctx.fillStyle = "#0a1929";
    ctx.fillRect(0, 0, 4096, 2048);

    // 2. Terres Cao en blanc
    ctx.drawImage(caoTexture.image, 0, 0);

    // Appliquer texture combinée avec bump mapping pour le relief
    const combinedTexture = new THREE.CanvasTexture(canvas);
    this.applyTextureToGlobe(combinedTexture);

    console.log("✅ Cao landmasses displayed with bump mapping and relief");
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

  startLoadingEffect() {
    this.isLoading = true;
    this.loadingProgress = 0;

    // Apply static/noise loading shader
    const loadingMaterial = new THREE.ShaderMaterial({
      uniforms: {
        progress: { value: 0 },
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0x0a1929) },
        glowColor: { value: new THREE.Color(0x4488ff) }, // Blue instead of cyan
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float progress;
        uniform float time;
        uniform vec3 baseColor;
        uniform vec3 glowColor;
        varying vec2 vUv;
        varying vec3 vPosition;

        // Simple noise function
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
          // Keep noise full until very end of loading (95%), then quick fade
          float clarity = smoothstep(0.95, 1.0, progress);

          // TV static/noise that diminishes
          float noise = random(vUv * 100.0 + time * 5.0);
          noise *= (1.0 - clarity);

          // Horizontal scan lines interference
          float scanLines = sin(vUv.y * 800.0 + time * 10.0) * 0.5 + 0.5;
          scanLines = smoothstep(0.7, 1.0, scanLines) * (1.0 - clarity) * 0.3;

          // Vertical interference bands
          float bands = sin(vUv.x * 30.0 + time * 2.0) * 0.5 + 0.5;
          bands = smoothstep(0.8, 1.0, bands) * (1.0 - clarity) * 0.2;

          // Color shift (chromatic aberration)
          vec3 color = baseColor;
          color += glowColor * (noise * 0.4 + scanLines + bands);

          // Subtle glow on edges during loading
          float edgeGlow = (1.0 - clarity) * 0.3;

          gl_FragColor = vec4(color, 0.7 + edgeGlow);
        }
      `,
      transparent: true,
    });

    this.globe.material = loadingMaterial;
    this.globe.material.needsUpdate = true;
  }

  applyTextureToGlobe(texture) {
    // Stop loading effect
    this.isLoading = false;

    // Transparent material with subtle glow
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff, // Pure white to preserve texture colors
      map: texture, // Apply continent texture
      transparent: true,
      opacity: 0.7, // Translucent
    });

    this.globe.material = material;
    this.globe.material.needsUpdate = true;

    console.log("✅ Texture applied to globe with transparent effect");
  }

  generateBumpMap(sourceTexture) {
    // Create grayscale version of texture for bump mapping
    const canvas = document.createElement("canvas");
    canvas.width = sourceTexture.image.width;
    canvas.height = sourceTexture.image.height;
    const ctx = canvas.getContext("2d");

    // Draw source texture
    ctx.drawImage(sourceTexture.image, 0, 0);

    // Convert to grayscale (land = white/high, ocean = black/low)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Calculate grayscale based on color
      // Lands (yellow/beige) → bright, Ocean (blue) → dark
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Check if it's land (more yellow/beige) or ocean (more blue)
      const isLand = r + g > b * 2;
      const gray = isLand ? 220 : 30; // High for land, low for ocean

      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      // Keep alpha
    }

    ctx.putImageData(imageData, 0, 0);

    const bumpTexture = new THREE.CanvasTexture(canvas);
    bumpTexture.needsUpdate = true;
    return bumpTexture;
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

  // Helper: Draw circular background with subtle glow
  drawRoundedBorder(ctx, cx, cy, size, radius, borderColor = "#ebebeb") {
    const circleRadius = size / 2;

    // Save context state
    ctx.save();

    // Subtle glow effect (reduced from 12 to 4)
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Dark fill circle with opacity
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0d1117";
    ctx.fill();

    // Border with subtle glow
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Restore context state
    ctx.restore();
  }

  // Large white icon helpers with rounded border
  // fillColor param for favorite highlight (default white, or green for favorites)
  // borderColor param for outline (default white, or green for favorites)
  drawVideoIcon(ctx, cx, cy, fillColor = "#ebebeb", borderColor = "#ebebeb") {
    // Rounded border
    this.drawRoundedBorder(ctx, cx, cy, 44, 8, borderColor);
    // Play triangle (white or green if favorite)
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 12);
    ctx.lineTo(cx - 10, cy + 12);
    ctx.lineTo(cx + 12, cy);
    ctx.closePath();
    ctx.fill();
  }

  drawImageIcon(ctx, cx, cy, fillColor = "#ebebeb", borderColor = "#ebebeb") {
    // Rounded border
    this.drawRoundedBorder(ctx, cx, cy, 44, 8, borderColor);
    // Picture frame icon (white or green if favorite)
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 12, cy - 9, 24, 18);
    // Mountain peak
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 7);
    ctx.lineTo(cx - 3, cy - 4);
    ctx.lineTo(cx + 4, cy + 7);
    ctx.closePath();
    ctx.fill();
    // Sun
    ctx.beginPath();
    ctx.arc(cx + 6, cy - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  draw3DIcon(ctx, cx, cy, fillColor = "#ebebeb", borderColor = "#ebebeb") {
    // Rounded border
    this.drawRoundedBorder(ctx, cx, cy, 44, 8, borderColor);
    // Cube icon (white or green if favorite)
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 3;
    // Front face
    ctx.strokeRect(cx - 10, cy - 4, 14, 14);
    // Back face offset
    ctx.strokeRect(cx - 4, cy - 10, 14, 14);
    // Connect corners
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 4);
    ctx.lineTo(cx - 4, cy - 10);
    ctx.moveTo(cx + 4, cy - 4);
    ctx.lineTo(cx + 10, cy - 10);
    ctx.moveTo(cx - 10, cy + 10);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.stroke();
  }

  drawNewIcon(ctx, cx, cy, fillColor = "#ebebeb", borderColor = "#ebebeb") {
    // Rounded border
    this.drawRoundedBorder(ctx, cx, cy, 44, 8, borderColor);
    // Star icon (white or green if favorite)
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? 14 : 6;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  addPoint(lat, lon, data, isFavorite = false) {
    const position = this.latLonToVector3(lat, lon, 2.05);

    // Couleur selon le type de contenu (vérifier type ou category)
    const contentType = data.type || data.category;

    let pointColor;
    // Color based on content type
    switch (contentType) {
      case "videos":
      case "video":
        pointColor = 0x6c5ce7; // Violet pour vidéos
        break;
      case "images":
      case "image":
        pointColor = 0xfdcb6e; // Jaune pour images
        break;
      case "3d":
        pointColor = 0xfd79a8; // Rose pour 3D
        break;
      case "texts":
      case "text":
        pointColor = 0x58a6ff; // Bleu pour textes/articles
        break;
      default:
        pointColor = 0xf9f9f9; // Blanc par défaut
        break;
    }

    // Créer texture pinpoint avec ring + highlight
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d", { alpha: true });

    const hexColor = "#" + pointColor.toString(16).padStart(6, "0");

    // Clear background (transparent)
    ctx.clearRect(0, 0, 64, 64);

    // Icon fill color: yellow (#ffaa00) if favorite, white otherwise
    let iconFillColor = "#ebebeb";
    let iconBorderColor = "#ebebeb";

    if (isFavorite) {
      iconFillColor = "#ffaa00"; // Yellow for favorites
      iconBorderColor = "#ffaa00";
    }

    // Draw icon based on content type (not isNew state)
    switch (contentType) {
      case "videos":
      case "video":
        this.drawVideoIcon(ctx, 32, 32, iconFillColor, iconBorderColor);
        break;
      case "images":
      case "image":
        this.drawImageIcon(ctx, 32, 32, iconFillColor, iconBorderColor);
        break;
      case "3d":
        this.draw3DIcon(ctx, 32, 32, iconFillColor, iconBorderColor);
        break;
      default:
        // Fallback: simple circle with highlight color
        ctx.fillStyle = iconFillColor;
        ctx.beginPath();
        ctx.arc(32, 32, 10, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Sprite - facilement cliquable et toujours face caméra
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(0.025, 0.025, 1);
    sprite.userData = data;
    sprite.userData._initialScale = 0.1;
    sprite.userData.type = contentType;

    this.globe.add(sprite);
    this.points.push(sprite);

    return sprite;
  }

  clearPoints() {
    console.log(`🗑️ Nettoyage de ${this.points.length} points`);
    this.points.forEach((point) => {
      this.globe.remove(point);
    });
    this.points = [];
  }

  onMouseClick(event) {
    // Delegate to external handler if set (placement tool)
    if (this.clickHandler) {
      this.clickHandler(event);
      return;
    }

    // Calculate mouse position in normalized coordinates
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.points);

    if (intersects.length > 0) {
      this.onPointClick(intersects[0].object.userData);
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
    // DISABLED: Coastlines are loaded from local assets, no API calls needed
    // This function previously made unnecessary requests to gws.gplates.org
    console.log("ℹ️ Preload skipped - using local coastline data");
    return;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Holographic loading effect
    if (this.isLoading && this.globe.material.uniforms) {
      // Cap at 0.94 so the shader never visually "completes" before the fetch finishes.
      // applyTextureToGlobe() will replace the material once the texture is ready.
      this.loadingProgress = Math.min(this.loadingProgress + 0.0333, 0.94);
      this.globe.material.uniforms.progress.value = this.loadingProgress;
      this.globe.material.uniforms.time.value += 0.016; // ~60fps
    }

    // Slow automatic rotation
    if (this.autoRotate && this.globe) {
      this.globe.rotation.y += 0.0003; // Even slower rotation speed
    }

    // Dynamic atmosphere thickness compensation for perspective
    if (this.atmosphere) {
      const distance = this.camera.position.length();
      const baseDistance = 5;
      const distanceRatio = distance / baseDistance;

      // Inverse proportional scaling to compensate perspective
      // Closer = thicker glow, Further = thinner glow
      const globeRadius = 2;
      const baseThickness = 0.165;
      const adjustedThickness = baseThickness / distanceRatio;
      const newRadius = globeRadius + adjustedThickness;
      const scale = newRadius / 2.165;

      this.atmosphere.scale.set(scale, scale, scale);
    }

    // Smooth scale animation for hovered pinpoint
    for (const point of this.points) {
      // Hide all icons during loading transition
      if (this.isLoading) {
        if (point.material) {
          point.material.opacity = 0;
        }
        continue;
      }

      const target =
        point === this.hoveredPoint
          ? this.hoverPointScale
          : this.basePointScale;
      const current = point.scale.x;
      if (Math.abs(current - target) > 0.0005) {
        const newScale = current + (target - current) * 0.15;
        point.scale.set(newScale, newScale, 1);
      }

      // Adjust sprite opacity based on position relative to camera
      // Get world position of sprite
      const spriteWorldPos = new THREE.Vector3();
      point.getWorldPosition(spriteWorldPos);

      // Calculate if sprite is facing the camera
      const spriteDir = spriteWorldPos.clone().normalize();
      const cameraDir = this.camera.position.clone().normalize();
      const dotProduct = spriteDir.dot(cameraDir);

      // Map dot product to opacity
      // dotProduct = 1 (facing camera) → opacity = 1
      // dotProduct = 0 (edge) → opacity = 0.3
      // dotProduct = -1 (behind) → opacity = 0.1
      const opacity = dotProduct > 0
        ? 1.0
        : 0.1 + (dotProduct + 1) * 0.2; // 0.1 to 0.3 range

      if (point.material) {
        point.material.opacity = opacity;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.GlobeManager = GlobeManager;
