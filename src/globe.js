/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Gestion du globe 3D avec Three.js
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
            1000
        );
        this.camera.position.z = 5;
        
        // Créer le renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Ajouter les lumières
        this.addLights();
        
        // Créer le globe
        this.createGlobe();
        
        // Ajouter les contrôles
        this.addControls();
        
        // Gérer le redimensionnement
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Gérer les clics
        this.container.addEventListener('click', (e) => this.onMouseClick(e));
        
        // Démarrer l'animation
        this.animate();
    }

    addLights() {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0xe6dac7, 0.6);
        this.scene.add(ambientLight);
        
        // Lumière directionnelle
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 3, 5);
        this.scene.add(directionalLight);
    }

    createGlobe() {
        const geometry = new THREE.SphereGeometry(2, 64, 64);
        
        // Matériau de base pour le globe
        const material = new THREE.MeshPhongMaterial({
            color: 0x2a3f5f,
            emissive: 0x1a2332,
            shininess: 10,
            transparent: true,
            opacity: 0.9
        });
        
        this.globe = new THREE.Mesh(geometry, material);
        this.scene.add(this.globe);
        
        // Ajouter une atmosphère
        this.addAtmosphere();
    }

    addAtmosphere() {
        const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a6fa5,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(atmosphere);
    }

    addControls() {
        // Contrôles manuels simples (rotation avec la souris)
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        
        this.container.addEventListener('mousedown', (e) => {
            isDragging = true;
        });
        
        this.container.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - previousMousePosition.x;
                const deltaY = e.clientY - previousMousePosition.y;
                
                this.globe.rotation.y += deltaX * 0.005;
                this.globe.rotation.x += deltaY * 0.005;
            }
            
            previousMousePosition = {
                x: e.clientX,
                y: e.clientY
            };
        });
        
        this.container.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Zoom avec la molette
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY * 0.001;
            this.camera.position.z += delta;
            this.camera.position.z = Math.max(3, Math.min(10, this.camera.position.z));
        });
    }

    async loadCoastlines(time) {
        const apiKey = 'mchin-e494599c-c81b-4972-acbb-c167728c9fb2';
        const url = `https://gws.gplates.org/reconstruct/coastlines_low/?time=${time}&apikey=${apiKey}&avoid_map_boundary`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            // Supprimer les anciennes côtes
            if (this.coastlines) {
                this.globe.remove(this.coastlines);
            }
            
            // Créer les nouvelles côtes
            this.coastlines = this.createCoastlinesFromData(data);
            this.globe.add(this.coastlines);
            
            return true;
        } catch (error) {
            console.error('Erreur lors du chargement des côtes:', error);
            return false;
        }
    }

    createCoastlinesFromData(data) {
        const group = new THREE.Group();
        
        if (data.features) {
            data.features.forEach(feature => {
                if (feature.geometry && feature.geometry.coordinates) {
                    const coords = feature.geometry.coordinates;
                    
                    if (feature.geometry.type === 'LineString') {
                        const line = this.createLine(coords);
                        if (line) group.add(line);
                    } else if (feature.geometry.type === 'MultiLineString') {
                        coords.forEach(lineCoords => {
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
            color: 0xe6dac7,
            opacity: 0.4,
            transparent: true
        });
        
        return new THREE.Line(geometry, material);
    }

    latLonToVector3(lat, lon, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        
        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = (radius * Math.sin(phi) * Math.sin(theta));
        const y = (radius * Math.cos(phi));
        
        return new THREE.Vector3(x, y, z);
    }

    addPoint(lat, lon, data) {
        const position = this.latLonToVector3(lat, lon, 2.05);
        
        // Créer un point lumineux
        const geometry = new THREE.SphereGeometry(0.03, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xd4af37,
            emissive: 0xd4af37,
            emissiveIntensity: 0.5
        });
        
        const point = new THREE.Mesh(geometry, material);
        point.position.copy(position);
        point.userData = data;
        
        this.globe.add(point);
        this.points.push(point);
        
        return point;
    }

    clearPoints() {
        this.points.forEach(point => {
            this.globe.remove(point);
        });
        this.points = [];
    }

    onMouseClick(event) {
        // Calculer la position de la souris en coordonnées normalisées
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
        // Cette méthode sera appelée depuis app.js
        if (window.appController) {
            window.appController.showContentPopup(data);
        }
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Rotation automatique lente
        this.globe.rotation.y += 0.001;
        
        // Animation des points
        this.points.forEach((point, index) => {
            const scale = 1 + Math.sin(Date.now() * 0.003 + index) * 0.2;
            point.scale.set(scale, scale, scale);
        });
        
        this.renderer.render(this.scene, this.camera);
    }
}
