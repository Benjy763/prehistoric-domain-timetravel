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
