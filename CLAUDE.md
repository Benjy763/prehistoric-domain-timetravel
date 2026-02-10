# Prehistoric Domain — Time Travel Globe

Globe 3D interactif (Three.js) intégré en iframe dans prehistoricdomain.com.
Les contenus du CMS Webflow sont projetés comme pinpoints sur un globe navigable dans le temps.

## Stack

- **Frontend** : HTML/CSS/JS vanilla, Three.js r128, aucun bundler
- **CMS** : Webflow API v2 (site ID: `609e6b701730a329c6f67850`, collection "Contents": `679d148479ad083f33c518a1`)
- **Scripts** : Node.js natif (0 dépendances npm), `fetch` natif (Node 18+)
- **APIs** : PBDB (géocodage fossiles), GPlates MERDITH2021 (reconstruction paléo, limite 410 Ma)
- **Hébergement** : statique sur Hostinger, intégré via iframe dans Webflow
- **MCP** : Webflow MCP configuré dans `.vscode/mcp.json`

## Structure

```
src/           → Frontend (app.js, globe.js, popup.js, filters.js, webflow-api.js)
scripts/       → Pipeline données :
                   sync-contents.js              — Orchestrateur (point d'entrée unique)
                   import-cms-items.js           — Géocodage moderne (PBDB + free-tags)
                   paleo-reconstruction.js       — Module GPlates partagé + isPointOnLand
                   reconstruct-paleogeography.js — Reconstruction (full ou --incremental)
                   validate-content-data.js      — Validation structure JSON
                   validate-free-tags.js         — Validation qualité free-tags
                   manual-coordinate-fixes.json  — Corrections manuelles (priorité absolue)
assets/data/   → content-data.json (généré)
assets/        → GeoJSON : merdith2021-coastlines/ (34), cao-paleogeography/ (24), geojson/ (13)
index.html     → Point d'entrée
```

## Conventions

- **Langue** : code et commentaires en anglais, docs en français
- **Pas de bundler** : tout est chargé via `<script>` dans index.html
- **Données** : le frontend charge `assets/data/content-data.json` (statique), jamais l'API Webflow directement
- **Format des clés de période** : `"100"` (nombre en string, jamais `"100Ma"`)
- **Éligibilité globe** : `display-on-app = true` ET `free-tags` non vide
- **Modèle géologique** : MERDITH2021 partout (pas MATTHEWS2016)
- **13 périodes** : Today(0), Quaternary(2), Neogene(15), Paleogene(50), Cretaceous(100), Jurassic(160), Triassic(220), Permian(280), Carboniferous(320), Devonian(380), Silurian(410), Ordovician(450), Cambrian(500)

## Règles importantes

- Les corrections manuelles (`manual-coordinate-fixes.json`) priment toujours sur PBDB/GPlates
- **Géocodage species-first** : itérer les espèces des `free-tags` dans l'ordre, prendre la première avec des résultats PBDB dans le continent attendu (pas de recherche multi-espèces mélangée)
- **Validation terre** : les items terrestres doivent être sur terre (vérification via `isPointOnLand` + GeoJSON polygones)
- **Anti-collision** : spirale golden-angle, rayon max ~6°, 20 tentatives max — préfère collision à mauvais placement
- Mode "Real Land" (Cao 2017) = observation seule, pas de pinpoints (décision actée)
- Le sync incrémental est le mode par défaut, le rebuild complet (`--all`) est réservé aux cas exceptionnels
- Volume cible : 1000-2000 items, mises à jour plusieurs fois par semaine

## Commandes custom (Claude Code)

| Commande | Rôle |
|----------|------|
| `/feature` | Plan → Dev → Review → Doc → Clôture (cycle complet) |
| `/task` | Reprendre la tâche en cours depuis TASKS.md |
| `/review` | Revue de code des changements récents |
| `/doc` | Mettre à jour la documentation projet |

## Documentation

| Fichier | Contenu |
|---------|---------|
| `CLAUDE.md` | Ce fichier — contexte, stack, conventions |
| `SPEC.md` | Vision produit, fonctionnalités, comportements |
| `TASKS.md` | Plan d'exécution actif |
| `TASKS_ARCHIVE.md` | Tâches terminées |
| `ARCHITECTURE.md` | Architecture technique, data workflow, décisions |
