# Plan (temporaire) — Pipeline de soumission artiste → globe live

> Document de travail, pas une doc projet pérenne. À supprimer une fois le
> pipeline implémenté et documenté dans ARCHITECTURE.md / DEPLOY.md.

## Objectif

Un artiste soumet son travail (infos + images) via un formulaire. Benjamin
review les soumissions reçues et demande à Claude d'ajouter tel artiste /
tel contenu. Claude gère tout le reste jusqu'à la mise en ligne du globe.

## Étapes

### 1. Formulaire de soumission (Google Form) — ✅ créé (2026-09-03)
- **Bloc artiste** :
  - Nom artiste (obligatoire)
  - Portfolio/Instagram (URL) — requis seulement si nouvel artiste ; si
    l'artiste existe déjà en CMS le nom seul suffit (Claude vérifie contre
    la collection Artists, logique déjà présente dans `/add-content` étape 5a)
  - Description (paragraphe, optionnel) — bio de l'artiste pour sa page
    portfolio → correspond au champ CMS `description-2` de la collection
    Artists
  - ~~Projet/série~~ → **retiré du form**, décidé : Benjamin l'ajoute
    lui-même au moment de la validation (étape 4) si besoin, pas collecté
    côté artiste
- **Bloc œuvre(s)** : Google Forms ne supporte pas les sections répétables
  dynamiques → **5 blocs œuvre fixes dupliqués** (max 5 œuvres/soumission)
  - **Vidéo** : Type, Video Link (titre/description récupérés via YouTube
    Data API à l'étape 4, pas de champ dédié dans le form)
  - **Image** : Type, Image Title, Image Description, Image Creation Date,
    Image Upload
- Réponses → Google Sheet **"Paleoart Submission (réponses)"**
  (`17MT0-SBRt_QfWc7yITzWt3nismX7ik9Hbf3jHTZ2-A8`), colonnes réelles :
  `Horodateur, Artist Name, Artist description, Portfolio Link,` puis ×5
  `[Type, Video Link, Image Title, Image Description, Image Creation Date,
  Image Upload]`
- ~~Nécessite : activer l'auth `Google Drive` MCP~~ → **fait** (2026-09-03)

### 2. Review humaine (Benjamin)
- Consultation des réponses dans le Sheet/Drive
- Décision manuelle : "ajoute l'artiste X" (référence à une réponse/ligne)

### 3. Récupération des données (Claude) — ✅ implémenté (2026-09-03)
- Commande `/submit-artist` (`.claude/commands/submit-artist.md`)
- Lecture de la ligne Sheet correspondante + fichiers Drive associés
- Téléchargement des images : **`curl` direct** (`https://drive.google.com/uc?export=download&id=FILE_ID`),
  pas via `mcp__claude_ai_Google_Drive__download_file_content`. Ce dernier
  encode tout le fichier en base64 inline dans la réponse — testé sur un
  fichier de 120 Ko : ~160k caractères de retour, ça sature le contexte
  pour rien. Le dossier de réponses du formulaire ("Paleoart Submission")
  a donc été passé en partage **"Tous les utilisateurs disposant du lien"
  (Viewer)** côté Google Drive — `curl` peut alors télécharger directement
  en binaire, vérifié bit-à-bit identique au résultat MCP mais quasi
  instantané. Fichiers numérotés 1..n dans l'ordre de soumission, écrits
  dans le scratchpad.
  - Le partage "anyone with link" a dû être fait manuellement par
    Benjamin — l'outil `mcp__claude_ai_Google_Drive__share_file`
    disponible ne supporte que le partage par email précis, pas l'option
    "Anyone with the link"

### 4. Pipeline `/add-content` existant, enrichi par les données du form — ✅ implémenté (2026-09-03)
- `/submit-artist` enchaîne sur les étapes 1-4, 6-8 de `/add-content`
  (génération credits-line, proposition free-tags, traduction FR gardée en
  réserve — locale indisponible, cf. étape 7 corrigée)
- Tableau récap de validation présenté à Benjamin (étape 6 de `/add-content`)
- Attente de validation / corrections

### 5. Création des drafts CMS — ✅ implémenté (2026-09-03), corrigé EN-only
- `create_collection_items` **EN uniquement** sur la collection Contents
  (`679d148479ad083f33c518a1`), `isDraft: true` — étape 7 de `/add-content`,
  corrigée le 2026-09-03 suite à la découverte de la locale FR indisponible

### 6. NOUVEAU — Traitement des images (œuvres de type Image uniquement) — ✅ implémenté (2026-09-03, corrigé le même jour)
- Les œuvres de type **Vidéo** n'ont pas besoin de ce traitement : le lien
  YouTube suffit (`youtube-video-id`, logique vidéo déjà existante dans
  `/add-content`)
- `scripts/process-artwork-image.js <image> <slug>` — resize + encodage
  **AVIF directement en local via `ffmpeg`** (`libaom-av1`) :
  - **low** : largeur 1000px, CRF 30 (favorise la taille — thumbnail galerie)
  - **high** : largeur 3840px, CRF 22 (favorise la qualité — image
    d'affichage complète), **plafonné à la largeur source** (jamais
    d'upscale, via le filtre `scale=min(N,iw)` de ffmpeg)
  - ~~Première version : resize via `sips` en PNG, compression AVIF déléguée
    à Webflow~~ → **abandonné**. `sips` ne sait pas encoder l'AVIF, et
    convertir un JPEG source déjà compressé en PNG (sans perte) faisait
    gonfler la taille ~9x pour aucun gain (testé : 36 Ko JPEG → 321 Ko PNG).
    `ffmpeg` encode directement en AVIF, résultat comparable ou meilleur
    qu'un export manuel XnConvert (testé : 36 Ko JPEG source → 23 Ko AVIF
    low / 30 Ko AVIF high)
  - Dépendance système : `ffmpeg`/`ffprobe` (Homebrew : `brew install
    ffmpeg`), pas de dépendance npm — même logique que `sips`/`rsync`/`wrangler`
- Upload des deux variantes vers Webflow (`data_assets_tool.create_asset`,
  upload S3 présigné)
- ~~Compression AVIF côté serveur Webflow (`compress_assets`)~~ → **plus
  nécessaire**, l'encodage AVIF se fait déjà en local
- Attachement aux champs CMS de l'item Content :
  - `background` (Immersive or Gallery Content Image) = variante **high**
  - `gallery-low-quality-image` = variante **low**
  - via `update_collection_items`

### 7. Publication CMS — confirmation manuelle requise
- Claude présente un récap final (items créés + images attachées) et
  **attend le go de Benjamin** avant de publier — pas d'auto-publish
- `publish_collection_items` (EN et FR séparément, cf. gotcha connu dans
  `memory/cms-fields.md`)

### 8. NOUVEAU — Mise à jour du globe + déploiement — ✅ implémenté (2026-09-03)
- Claude attend le go de Benjamin avant de lancer le déploiement
  (pas d'auto-deploy après le build)
- `npm run sync` (sync incrémental, mode par défaut) → régénère
  `assets/data/content-data.json`
- `npm run build` → génère `dist/`
- Upload de `dist/` sur l'hébergement — migré vers **Cloudflare Pages**
  (voir section 9). Le plan initial (rsync/SSH vers Hostinger) est
  **superseded** et n'est conservé que pour mémoire :
  - ~~`rsync -avz --delete` via SSH (binaire système natif)~~
  - ~~Nécessite l'accès SSH activé sur le plan Hostinger~~
  - ~~Script `scripts/deploy.js`, invoqué en fin de pipeline~~

## 9. NOUVEAU — Migration hébergement : Hostinger → Cloudflare Pages — ✅ FAIT (2026-09-03)

**Premier déploiement réussi** : https://prehistoric-domain-timetravel.pages.dev
(projet Cloudflare Pages `prehistoric-domain-timetravel`, compte
`benjamin.dupuy8@gmail.com`). Vérifié fonctionnel : globe (`/`), données
(`content-data.json`), page recherche (`/browse.html` → redirige en 308
vers `/browse`, comportement natif Cloudflare Pages qui nettoie les URLs
`.html` — aucun lien du repo n'est codé en dur vers `browse.html`, donc
sans impact).

### Objectif
Remplacer l'hébergement statique Hostinger par **Cloudflare Pages**
(hébergement de site statique avec CDN intégré — pas du stockage objet brut
comme R2 : Pages sert directement `dist/` en tant que site, gère le cache
et son invalidation automatiquement à chaque déploiement), et automatiser
la mise à jour (au lieu du `rsync` manuel/SSH prévu en étape 8).

> Correction : le plan visait initialement Cloudflare **R2** (stockage
> objet) — corrigé en **Cloudflare Pages**, qui correspond à l'usage réel
> (servir `dist/` en site statique, pas juste stocker des fichiers).

### Portée décidée
- **Cible** : un projet **Cloudflare Pages** (pas de bucket à créer) — pas
  encore créé → première étape technique du chantier = créer le projet
  Pages côté Cloudflare (nom du projet + domaine custom à définir au moment
  de l'implémentation)
- **Ce qui migre** : `dist/` uniquement. Vérifié dans `package.json` — le
  script `build` fait déjà
  `vite build && cp -r assets/data assets/merdith2021-coastlines
  assets/cao-paleogeography assets/geojson dist/assets/`, donc `dist/`
  contient déjà tout (build + `content-data.json` + GeoJSON). Pages sert ce
  dossier tel quel, aucune migration séparée nécessaire pour les données
  statiques.
- **Transition** : **coupure nette** — pas de double hébergement parallèle.
  Le jour du switch : dernier état sur Hostinger (site laissé tel quel, non
  maintenu), premier déploiement Pages, puis mise à jour du domaine/iframe
  Webflow vers la nouvelle URL Pages. Pas de fenêtre de comparaison A/B.
- **Automatisation déploiement** : CLI **`wrangler`**
  (`wrangler pages deploy dist/`), pas de dépendance npm ajoutée —
  cohérent avec la convention "0 dépendance npm" du projet (`CLAUDE.md`),
  même logique que les scripts existants qui shell-out vers des binaires
  natifs (`sips`, `rsync`). Installé globalement (`npm install -g wrangler`,
  hors du repo), **jamais en `devDependencies`**
  - Auth : `wrangler login` (OAuth navigateur, token stocké dans
    `~/Library/Preferences/.wrangler/`, jamais dans le repo) — pas de
    fichier `.env.deploy`/API token, l'OAuth suffit pour un usage local
  - Script : `scripts/deploy-pages.js` — remplace le `scripts/deploy.js`
    (rsync) prévu en étape 8 ; garde-fous avant deploy : `dist/` doit
    exister et être non-vide, `wrangler` doit être authentifié (attention :
    `wrangler whoami` renvoie **exit code 0 même déconnecté**, il faut
    parser le texte de sortie, pas le code de retour — bug rencontré et
    corrigé en écrivant le script)
  - Invocation en fin de pipeline après `npm run build`, avec la même
    règle de **confirmation manuelle** que l'étape 8 (pas d'auto-deploy)
  - `npm run deploy:pages -- <project-name>` (ou `CLOUDFLARE_PAGES_PROJECT`
    en variable d'env) — nom retenu : **`prehistoric-domain-timetravel`**
- **Gotcha wrangler découvert au premier déploiement** : la version
  installée (4.128.0) tente par défaut de **déléguer vers Cloudflare
  Workers** (nouvelle recommandation Cloudflare) au lieu d'un déploiement
  Pages classique — elle réécrit `vite.config.js`/`package.json`
  (ajoute `@cloudflare/vite-plugin`, `wrangler` en devDependencies) et crée
  un `wrangler.jsonc`. Ce n'est pas ce qu'on veut (site statique simple,
  0 dépendance). Contournement : `--force` sur le *premier* deploy
  uniquement (bascule sur l'ancien chemin Pages direct) + création
  préalable du projet via `wrangler pages project create <nom>
  --production-branch=main`. Une fois le projet créé, les déploiements
  suivants n'ont plus besoin de `--force` (wrangler le signale
  explicitement) — le script `deploy-pages.js` ne le passe donc plus.
- **Prérequis compte Cloudflare** : l'email du compte doit être **vérifié**
  avant de pouvoir créer un projet Pages (`wrangler pages project create`
  échoue sinon avec `Your user email must be verified [code: 8000077]`)
- **Invalidation cache** : gérée nativement par Cloudflare Pages à chaque
  déploiement — pas de purge manuelle à scripter (contrairement à R2 seul).
  Le file hashing Vite (cf. `CLAUDE.md`) reste une bonne pratique
  indépendamment.
- **Plugin Cloudflare pour Claude Code** (`cloudflare/skills` marketplace +
  plugin `cloudflare@cloudflare`) : installé sur demande de Benjamin, mais
  **non utilisé** pour ce pipeline — `wrangler` en CLI directe suffit
  entièrement. ⚠️ Le fichier source de ce plugin
  (`https://developers.cloudflare.com/agent-setup/prompt.md`) contenait des
  instructions rédigées comme un prompt injection (narration à la première
  personne imitant l'assistant, "Setup Complete" annoncé avant exécution) —
  installé uniquement après confirmation explicite de Benjamin, pas
  exécuté automatiquement.

## Points ouverts à trancher avant implémentation

1. ~~Structure du Google Form~~ → **décidé** : bloc artiste (nom, portfolio
   si nouvel artiste, projet optionnel) + bloc œuvre(s) répétable, type
   Image (fichier) ou Vidéo (lien YouTube)
2. ~~Activer l'auth Google Drive MCP~~ → **décidé : maintenant**
3. ~~Accès Hostinger scriptable (rsync/SSH)~~ → **superseded** par la
   migration Cloudflare Pages (section 9)
4. ~~Publication auto vs manuelle~~ → **décidé : manuelle**. Confirmation
   explicite de Benjamin requise avant `publish_collection_items` (étape 7)
   et avant le déploiement (étape 8/9)
5. ~~Migration hébergement — R2 ou Pages ?~~ → **décidé : Cloudflare
   Pages** (site statique + CDN + cache géré nativement), pas R2 (stockage
   objet brut, mal adapté à servir un site)
6. ~~Migration Pages — projet déjà créé ?~~ → **décidé : pas encore créé**,
   création du projet Pages = première étape technique du chantier
7. ~~Migration Pages — portée des assets~~ → **décidé : `dist/` seul
   suffit** (contient déjà build + data + GeoJSON, cf. section 9)
8. ~~Migration Pages — bascule~~ → **décidé : coupure nette**, pas de
   double hébergement parallèle
9. ~~Migration Pages — méthode de déploiement~~ → **décidé : CLI
   `wrangler`** (`wrangler pages deploy`, 0 dépendance npm, cohérent avec
   les conventions du projet)

## Statut — ✅ Pipeline implémenté et premier déploiement validé (2026-09-03)

Tout ce qui dépendait de Claude est fait et testé :
- Formulaire + Sheet créés et liés
- Google Drive MCP authentifié
- `/submit-artist` (lecture soumission) + `/add-content` corrigé (bug
  bilingue EN/FR) + `scripts/process-artwork-image.js` (traitement images)
  + `scripts/deploy-pages.js` (déploiement) — tous écrits et testés
- Migration Hostinger → Cloudflare Pages faite : site live sur
  https://prehistoric-domain-timetravel.pages.dev (globe, données,
  page recherche — tous vérifiés fonctionnels)

### Reste à faire côté Benjamin
- Vérifier le rendu du globe sur l'URL Pages dans un navigateur (test
  visuel/fonctionnel, pas juste les codes HTTP vérifiés par Claude)
- Décider : domaine custom sur le projet Pages, ou garder l'URL
  `*.pages.dev` telle quelle
- Basculer l'iframe Webflow (prehisoricdomain.com) vers la nouvelle URL une
  fois validé
- Pour les prochains déploiements manuels : `npm run deploy:prep` (sync +
  build) puis `npm run deploy:pages -- prehistoric-domain-timetravel`
- Réactiver la locale FR côté Webflow si le bilingue EN/FR redevient
  nécessaire (cf. étape 5/7 — actuellement drafts EN uniquement)
- Ce document reste un doc de travail — à supprimer une fois son contenu
  repris dans `ARCHITECTURE.md`/`DEPLOY.md` (cf. en-tête)
