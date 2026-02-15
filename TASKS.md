# Tâches — Time Travel Globe

Légende : `[ ]` à faire · `[~]` en cours · `[x]` fait

Phases 0–11 terminées → voir `TASKS_ARCHIVE.md`

---

## Phase 12 — Automatisation CMS (ajout de contenus)

**Objectif** : automatiser l'ajout de vidéos et images au CMS Webflow via la commande `/add-content`, réduire le travail manuel à un minimum (fournir IDs YouTube / URLs images).

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
