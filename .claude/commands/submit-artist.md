Lis `memory/cms-fields.md` pour les IDs CMS, et `.claude/commands/add-content.md`
pour la logique reutilisee (etapes 2 a 8 : credits-line, free-tags,
traduction, tableau recap, creation des drafts).

## Traitement d'une soumission artiste — $ARGUMENTS

$ARGUMENTS identifie la soumission a traiter (nom d'artiste et/ou horodateur
mentionne par Benjamin, ex: "ajoute la soumission de Jane Doe").

### Etape 1 — Localiser la ligne de soumission

Sheet de reponses : `17MT0-SBRt_QfWc7yITzWt3nismX7ik9Hbf3jHTZ2-A8`
("Paleoart Submission (reponses)"). Lire son contenu via
`mcp__claude_ai_Google_Drive__read_file_content` (Sheet exporte en CSV).

Colonnes fixes : `Horodateur, Artist Name, Artist description, Portfolio Link,`
puis **5 blocs identiques** (Google Forms n'a pas de section repetable) :
`Type, Video Link, Image Title, Image Description, Image Creation Date, Image Upload`
→ max 5 oeuvres par soumission.

Trouver la ligne correspondant a $ARGUMENTS. Si plusieurs lignes matchent
(meme artiste, plusieurs soumissions), demander a Benjamin de preciser via
l'horodateur.

### Etape 2 — Parser les oeuvres

Pour chacun des 5 blocs, si `Type` est vide → ignorer (slot inutilise).
Sinon collecter selon le type :
- **Video** : `Video Link` (URL YouTube, extraire l'ID)
- **Image** : `Image Title`, `Image Description`, `Image Creation Date`,
  `Image Upload` (lien/fichier Drive)

### Etape 3 — Telecharger les images

Pour chaque oeuvre de type Image, extraire l'ID du fichier Drive depuis la
valeur de `Image Upload` (URL du type
`https://drive.google.com/open?id=FILE_ID` ou equivalent) et le
telecharger **directement via `curl`**, sans passer par le MCP Drive :

```bash
curl -sL "https://drive.google.com/uc?export=download&id=FILE_ID" -o <chemin-scratchpad>
```

⚠️ Ceci ne fonctionne QUE parce que le dossier de reponses du formulaire
("Paleoart Submission" sur Google Forms) a ete configure en partage
**"Tous les utilisateurs disposant du lien" (Viewer)** — decision actee le
2026-09-03 (cf. `PLAN_artist-submission-pipeline.md`) pour eviter le
detour par `mcp__claude_ai_Google_Drive__download_file_content`, qui
encode tout le fichier en base64 inline et sature le contexte pour rien
(teste : un fichier de 120 Ko genere ~160k caracteres de reponse). Si ce
partage a ete revoque, `curl` renverra une page HTML "Sign in" au lieu de
l'image (verifier avec `file <chemin>` : doit dire `JPEG`/`PNG`, pas
`HTML`) → dans ce cas, prevenir Benjamin plutot que de retomber
silencieusement sur le MCP.

Numeroter les fichiers 1..n dans l'ordre des blocs rencontres (1 =
premiere oeuvre image, 2 = deuxieme, etc.), a ecrire dans le repertoire
scratchpad courant.

### Etape 4 — Artiste

- `name` = `Artist Name`
- `portfolio` = `Portfolio Link`
- `description-2` = `Artist description` **si fournie, utiliser telle
  quelle sans reformulation** (texte ecrit par l'artiste lui-meme) ; si
  vide, appliquer la regle de generation courte existante (etape 5a de
  `add-content.md`)

Appliquer la logique de verification/creation de l'etape 5a de
`add-content.md` (chercher dans la collection Artists `67fbcb77cad347c39362ef1b`
avant de creer).

**Projet/serie** : pas de champ dans le formulaire (decision actee dans
`PLAN_artist-submission-pipeline.md`). Demander a Benjamin en une question
rapide (`AskUserQuestion`) s'il veut associer un projet existant, sinon
laisser vide.

### Etape 5 — Enchainer sur le pipeline add-content (etapes 1 a 8)

A partir d'ici, suivre `.claude/commands/add-content.md` **etapes 1, 2, 3,
4, 6, 7, 8** (l'etape 5 — Artists/Projects — est deja geree ci-dessus a
l'etape 4), avec les donnees de la soumission au lieu de les redemander a
Benjamin :
- Type Video → `youtube-video-id` (etape 1 de add-content.md pour les
  metadonnees), `Video Link`
- Type Image → `Image Title`/`Image Description`/`Image Creation Date` +
  fichier local telecharge a l'etape 3 ci-dessus
- Ne PAS reposer la question `AskUserQuestion` de collecte initiale
  (etape "Collecte des infos" de add-content.md) — toutes les infos
  viennent du formulaire

### Etape 6 — NOUVEAU — Traitement des images (avant creation des assets Webflow)

Pour chaque image telechargee a l'etape 3 :
```
node scripts/process-artwork-image.js <chemin-image-locale> <slug-item>
```
Genere deux variantes **AVIF** directement (via `ffmpeg`/libaom-av1, pas
`sips` qui ne sait pas encoder l'AVIF) : `low` = 1000px CRF 30, `high` =
3840px CRF 22, plafonne a la largeur source (jamais d'upscale). Dans le
meme repertoire que l'image source. Aucune compression cote serveur
Webflow necessaire ensuite — voir PLAN_artist-submission-pipeline.md
etape 6. Necessite `ffmpeg`/`ffprobe` installes (`brew install ffmpeg`).

Puis uploader les deux variantes vers Webflow
(`mcp__webflow__data_assets_tool > create_asset`, upload S3 presigne) et
les attacher a l'item Content correspondant via
`mcp__webflow__data_cms_tool > update_collection_items` :
- `background` (Immersive or Gallery Content Image) = variante **high**
- `gallery-low-quality-image` = variante **low**

### Etape 7 — Publication et deploiement

Suivre les etapes 7 et 8 du `PLAN_artist-submission-pipeline.md` :
confirmation manuelle explicite de Benjamin avant `publish_collection_items`,
puis avant `npm run sync` + `npm run build` + deploiement (Cloudflare
Pages, `scripts/deploy-pages.js` une fois disponible — sinon signaler que
le deploiement doit encore etre fait manuellement).
