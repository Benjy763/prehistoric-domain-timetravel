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
      const size = sizeRandom < 0.9 ? 0.5 + Math.random() * 1 : 1.5 + Math.random() * 2;
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
    // Using muller2019 model (recommended)
    const url = `https://gws.gplates.org/reconstruct/coastlines/?time=${time}&model=muller2019`;

    console.log(`🌍 Loading coastlines for ${time} Ma...`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Coastlines loaded: ${data.features?.length || 0} features`);

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
      console.warn("⚠️  Globe will be displayed without prehistoric coastlines");
      return false;
    }
  }

  async loadContinents(time) {
    // Load coastlines (coastlines_low) with avoid_map_boundary
    const url = `https://gws.gplates.org/reconstruct/coastlines_low/?time=${time}&avoid_map_boundary`;

    console.log(`🗺️  Loading continents for ${time} Ma...`);
    console.log(`URL: ${url}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Data received: ${data.features?.length || 0} features`);

      // Generate texture with continents
      const texture = this.generateContinentTexture(data);

      // Apply texture to globe
      this.applyTextureToGlobe(texture);

      return true;
    } catch (error) {
      console.error("❌ Error loading continents:", error);
      console.warn("⚠️  Globe will be displayed without continents");
      return false;
    }
  }

  generateContinentTexture(data) {
    // Create canvas to draw equirectangular texture
    const width = 4096;
    const height = 2048;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Dark blue ocean background
    ctx.fillStyle = "#0a1929";
    ctx.fillRect(0, 0, width, height);

    if (data.features) {
      data.features.forEach((feature) => {
        if (feature.geometry && feature.geometry.coordinates) {
          const coords = feature.geometry.coordinates;
          const type = feature.geometry.type;

          if (type === "Polygon") {
            this.drawPolygonOnCanvas(ctx, coords[0], width, height);
          } else if (type === "MultiPolygon") {
            coords.forEach((polygonRings) => {
              this.drawPolygonOnCanvas(ctx, polygonRings[0], width, height);
            });
          }
        }
      });
    }

    console.log("✅ Continent texture generated");

    // Create Three.js texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  drawPolygonOnCanvas(ctx, coordinates, width, height) {
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

    // Fill in pure white
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Add dark outline for better definition
    ctx.strokeStyle = "#1a2838";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  applyTextureToGlobe(texture) {
    // Update globe material with texture - Phong for realistic reflections
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff, // White to not alter texture colors
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

    // Create glowing point
    const geometry = new THREE.SphereGeometry(0.03, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      emissive: 0xd4af37,
      emissiveIntensity: 0.5,
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
