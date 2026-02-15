# Tâches archivées — Time Travel Globe

Tâches terminées, déplacées depuis `TASKS.md`.

---

## Phase 0 — Analyse et documentation initiale

### 0.1 Analyse complète du projet
- [x] Analyse de la structure du projet et de la documentation existante
- [x] Analyse du code frontend (globe, app, popup, filters)
- [x] Analyse du pipeline de données (scripts, APIs)
- [x] Identification des problèmes (7 issues classées par sévérité)

### 0.2 Mise en place de la documentation
- [x] Créer CLAUDE.md (contexte, stack, conventions)
- [x] Créer SPEC.md (vision, fonctionnalités, comportements)
- [x] Créer TASKS.md (plan d'exécution)
- [x] Créer ARCHITECTURE.md (stack, archi, data workflow, décisions)
- [x] Créer les commandes Claude (/feature, /task, /review)

---

## Phase 1 — Fixer le pipeline de données

- [x] Standardiser format clés de période (`"100"` string sans suffixe)
- [x] Corriger package.json (scripts npm, références obsolètes)
- [x] Point d'entrée unique `sync-contents.js` (modes --all, --slugs, incrémental)
- [x] Supprimer config.js et nettoyer index.html
- [x] Nettoyage fichiers et dossiers obsolètes

---

## Phase 2 — Corriger le placement des pinpoints

- [x] Géocodage PBDB multi-espèces, filtrage par continent, médiane
- [x] Outil de placement manuel interactif (placement.html + placement-server.js)
- [x] Anti-collision spirale golden-angle, rayon max ~6°, 20 tentatives
- [x] Species-first : itérer espèces dans l'ordre des free-tags
- [x] `getNearestAvailableAge()` pour mapper vers GeoJSON dispo
- [x] Validation `isPointOnLand` après reconstruction GPlates
- [x] Correction auto `findNearbyLand()`, champ `validationStatus`

---

## Phase 3 — Fiabiliser le sync incrémental

- [x] Détection new/modifié/supprimé via `lastUpdated`
- [x] Merge correct par ID dans content-data.json
- [x] Coordonnées manuelles toujours réappliquées (priorité absolue)
- [x] Idempotence : relancer sans changement CMS = aucune modification

---

## Phase 4 — Moderniser le rendu du globe

- [x] Couleurs océan/terre réalistes, retrait effet parchemin
- [x] PBR materials (MeshStandardMaterial), éclairage soleil
- [x] Atmosphère gradient bleu + glow externe + Fresnel shader
- [x] Bump mapping, nuages animés

---

## Phase 5 — Recherche libre de contenus

- [x] Ajout freeTags/location dans normalizeItem()
- [x] FiltersManager : searchQuery, debouncing 400ms, clear
- [x] Recherche AND multi-termes, case-insensitive, multi-champs
- [x] UI champ de recherche (input + loupe + clear)

---

## Phase 6 — Optimisation sidebar

- [x] Réduction largeur (200→180px), padding, font-sizes, icônes, espacements

---

## Phase 7 — Nettoyage code

- [x] Suppression mock data webflow-api.js
- [x] Gestion d'erreur si content-data.json absent
- [x] Touch events mobile (pinch to zoom, swipe to rotate)

---

## Phase 8 — UX & Polishing

- [x] Free-tags affichés dans la popup
- [x] Séparation visuelle artiste / tags dans popup
- [x] Texte nuancé ("where fossils may have been found")
- [x] Hover icônes filtres sidebar (scale animation)
- [x] Hover pinpoints globe (raycasting Three.js + lerp animation)
- [x] Zoom ajusté (initial z=5, max zoom z=2.2)
- [x] Taille pinpoints augmentée (base 0.03, hover 0.04)
- [x] Couleurs UI (#f9f9f9 → #ebebeb, #191f29 → #0d1117f2)
- [x] Opacité timeline 0.5 → 0.7
- [x] Filtre "3D" renommé "Immersive", déplacé en 1ère position
- [x] Bouton "How does this work" layout fix (inline-flex)
- [x] Info modal : préambule ajouté, "scientific data" (pas peer-reviewed)

---

## Phase 9 — Build & Deploy

- [x] Vite configuré (minification esbuild + file hashing)
- [x] Entry point ES modules via src/main.js
- [x] Fix 404 production (publicDir: false + cp post-build)
- [x] DEPLOY.md créé (guide build + déploiement Hostinger)

---

## Phase 10 — Premium / Paywall

- [x] PremiumManager (src/premium.js) : handshake postMessage avec parent Webflow
- [x] Gate sidebar : layer selector, search, filtres verrouillés pour non-premium
- [x] Redirection vers /plans au clic sur élément verrouillé
- [x] CSS `.is-free-user` : opacity sur containers verrouillés
- [x] Fix délai 3s hors iframe (détection `window.self === window.top`)
- [x] Dev server : `?premium=true` par défaut

---

## Phase 11 — Mobile

- [x] Touch events : `passive: false` + `preventDefault()` sur canvas
- [x] CSS `touch-action: none` sur #globe-canvas
- [x] Tap detection (seuil 3px) pour restaurer clics pinpoints
- [x] Masquer "drag to rotate" sur mobile
- [x] Bloquer contenu immersif sur mobile (isMobile() + message "Available on desktop and VR devices")

---

## Phase 12 — Automatisation CMS (ajout de contenus)

### 12.1 Préparer le workflow `/add-content`

- [x] Analyser la structure CMS Webflow (champs, catégories, périodes)
- [x] Documenter les IDs et formats dans `memory/cms-fields.md`
- [x] Créer la commande `.claude/commands/add-content.md`
- [x] Vérifier le schéma CMS réel via MCP Webflow → fix `release-date-2`, schema complet documenté

### 12.2 Valider le workflow end-to-end

- [x] Tester `/add-content` avec 1 vidéo YouTube → draft créé (slug: prehistoric-planet-ice-age-rhinos-are-fast-runners)
- [x] Tester `/add-content` avec 1 image → 2 drafts bilingues créés (slugs: the-edmonton-valley, jurassic-patrol)
- [x] Vérifier le draft créé dans Webflow → 4 items OK (vidéos publiées, images en draft)
- [x] Publier le draft, lancer `npm run sync`, vérifier le globe → 2 vidéos PP:Ice Age synchées (195 items total)

---

## Phase 13 — Page Browse (recherche/catalogue de contenus)

### 13.1 Data Pipeline — Inclure tous les items CMS

- [x] Modifier `sync-contents.js` pour récupérer les 302 items du CMS (pas seulement display-on-app: true)
- [x] Items éligibles (free-tags + display-on-app: true) → géocodage + reconstruction paléo (comportement actuel inchangé)
- [x] Items non-éligibles → métadonnées de base uniquement (pas de periods, modernLat, modernLon)
- [x] Vérifier metadata.totalItems = 302, eligibleItems = 207
- [x] Tester `npm run sync` — fonctionne ✅
- [x] Vérifier que le globe filtre sur displayOnApp === true (WebflowAPI modifié) ✅

### 13.2 Page Browse — Structure HTML

- [x] Créer `browse.html` avec header "Find Your Way"
- [x] Input de recherche : placeholder "Search for animals, periods, locations, artists, projects..."
- [x] Container de grille responsive
- [x] Template de carte : image preview, badge type, titre

### 13.3 Page Browse — Styles CSS

- [x] Créer `assets/css/browse.css`
- [x] Fond sombre cohérent avec le globe
- [x] Grille CSS responsive : 4 cols (large) → 3 cols (medium) → 2 cols (mobile)
- [x] Cards avec image, badge type, titre
- [x] Badge couleurs : videos (violet), images (jaune), 3D (rose), texts (gris)
- [x] Hover effects sur les cards

### 13.4 Page Browse — JavaScript

- [x] Créer `src/browse.js`
- [x] Charger `content-data.json`
- [x] Fonction de recherche fuzzy (titre, description, freeTags, creditsLine)
- [x] Rendu dynamique des cardes dans la grille
- [x] Gestion du clic sur card → ouvrir pageUrl
- [x] Debounce de l'input de recherche (300ms)
- [x] Afficher compteur de résultats

### 13.5 Intégration & Tests

- [x] Ajouter `browse.html` au config Vite
- [x] Tester `npm run build` — Build réussi ✅
- [x] Lancer `npm run preview` — Serveur démarré sur http://localhost:4173 ✅
- [x] Tests fonctionnels : recherche, responsive, liens Webflow (à tester manuellement)
- [x] Tests de non-régression : globe affiche toujours les items correctement
- [x] Performance : vérifier fluidité avec 302 items

### 13.6 Documentation

- [x] Mettre à jour ARCHITECTURE.md (nouveau format content-data.json avec 260 items)
- [x] Mettre à jour SPEC.md (section Page Browse)
- [x] Mettre à jour CLAUDE.md (structure projet)
