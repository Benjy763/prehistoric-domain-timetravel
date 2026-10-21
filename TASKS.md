# Tâches — Time Travel Globe

Légende : `[ ]` à faire · `[~]` en cours · `[x]` fait

Phases 0–13 terminées → voir `TASKS_ARCHIVE.md`

---

## Phase 14 — Filtre "Recent" (50 derniers items par période)

**Objectif** : remplacer le filtre "New" par "Recent" qui affiche les 50 derniers items publiés de la période géologique en cours, sans couleur turquoise dédiée.

### 14.1 Ajouter `createdOn` au sync

- [x] Modifier `scripts/sync-contents.js` pour récupérer `cmsItem.createdOn` de l'API Webflow
- [x] Ajouter le champ `createdOn` dans le JSON normalisé (normalizeBasicMetadata)
- [x] Tester avec `npm run sync` pour vérifier que `createdOn` apparaît dans content-data.json

### 14.2 Calcul des 50 derniers par période (runtime)

- [x] `src/app.js` : créer méthode `getRecentItemsForPeriod(period, limit=50)`
- [x] Trier les items de la période par `createdOn` descendant
- [x] Retourner les IDs des 50 premiers items
- [x] Dans `applyFilters()`, utiliser `getRecentItemsForPeriod()` pour filtrer les récents

### 14.3 Modifier le filtre UI

- [x] `index.html` : remplacer le label "New" par "Recent" dans le switch
- [x] Garder `data-filter="new"` en interne (pas de renommage)
- [x] Vérifier les styles CSS associés

### 14.4 Logique de filtrage

- [x] `src/app.js` : dans `applyFilters()`, calculer les items récents de la période courante
- [x] Filtrer sur `recentIds` au lieu de `isNew` quand le filtre "new" est actif
- [x] Garder le champ `isNew` du CMS intact (ne pas toucher)
- [x] Nettoyer `webflow-api.js` : retirer le code mort pour `isNew` dans `filterByPeriodAndType()`

### 14.5 Retrait de la couleur turquoise

- [x] `src/globe.js` : retirer la condition `else if (data.isNew)` et la couleur `#02d8cb`
- [x] Garder seulement : jaune (#ffaa00) pour favoris, blanc (#ebebeb) par défaut
- [x] Mettre à jour le commentaire pour refléter le changement

### 14.6 Tests et documentation

- [x] Serveur de dev lancé pour tests manuels (http://localhost:8000/)
- [ ] Tester manuellement avec différentes périodes (Cretaceous, Quaternary, Today)
- [ ] Vérifier que max 50 items "recent" sont affichés par période
- [ ] Vérifier que les pinpoints n'ont plus de couleur turquoise
- [x] Mettre à jour SPEC.md (sections 2.3 et 2.4)
- [x] Mettre à jour ARCHITECTURE.md (documenter le champ `createdOn`)

---

## Phase 15 — Academy : globe des apprentis (2026-10-21)

- [x] Sélecteur « Artists · Apprentices » en haut du globe, remplace l'interrupteur Apprentices
- [x] Bouton « ? » qui explique les deux globes
- [x] Interrupteurs des filtres utilisables au clavier
- [x] Pagination des points : 50 (ou 100) à la fois, les plus récents d'abord, barre pour passer aux plus anciens
- [x] Téléphone : sélecteur et pagination en bas à gauche, barre latérale réduite aux icônes compréhensibles
- [ ] Essai avec de vraies pièces d'élèves (quand le site en enverra dans `/api/globe`)

## Phase 16 — Unifier le design du globe avec le site

**Objectif** (demande de Benjamin, 2026-10-21) : le globe a gardé son style d'origine ; revoir tout son visuel (couleurs, typographie, boutons, filtres, popup, frise des périodes) pour qu'il suive le design system du site (`DESIGN.md` du dépôt `pd-web-dinodeck`), sans casser la mise en page et en restant adapté au téléphone.

- [x] Relire le `DESIGN.md` du site et lister les écarts avec `assets/css/styles.css`
- [x] Reprendre les jetons (couleurs, rayons, ombres) en variables CSS, et Quicksand
- [x] Garder le verre dépoli des commandes flottantes et l'étendre à tout ce qui flotte sur le globe
- [x] Vérifier ordinateur et téléphone, sans régression de mise en page
- [ ] Validation visuelle de Benjamin
- Page Browse non reprise : le site a sa propre recherche (`/global-search`, natif depuis le 2026-10-20) et n'utilise plus `browse.html`, à retirer plus tard avec l'accord de Benjamin
