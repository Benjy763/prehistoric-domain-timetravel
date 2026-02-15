Lis le fichier `memory/cms-fields.md` dans le dossier mémoire Claude pour les IDs de catégories et périodes Webflow.

## Ajout de contenu CMS — $ARGUMENTS

### Collecte des infos

Poser UNE SEULE question via AskUserQuestion avec les 3 infos necessaires en parallele :

```
questions: [
  { question: "Type de contenu ?", header: "Type", options: [Video YouTube, Image, Immersion, Behind The Scenes] },
  { question: "Artiste ou producteur ?", header: "Artiste", options: [(artistes frequents du CMS)] },
  { question: "IDs YouTube ou titres d'images ? (pour images: Titre | description | YYYY optionnels)", header: "Contenus", options: [(placeholder pour forcer Other/texte libre)] }
]
```

Si l'utilisateur a deja fourni des infos dans $ARGUMENTS, ne PAS reposer les questions correspondantes. Parser directement.

### Traitement automatique

#### Etape 1 — Recuperation des metadonnees videos

**Methode testee et validee — YouTube Data API v3 via curl :**

La cle API est stockee dans `.vscode/mcp.json` (champ `YOUTUBE_API_KEY`).
La lire avec : `cat .vscode/mcp.json` puis extraire la valeur.

WebFetch ne peut pas acceder a googleapis.com → utiliser **Bash + curl** :
```bash
curl -s "https://www.googleapis.com/youtube/v3/videos?id={ID}&part=snippet,contentDetails&key={API_KEY}"
```

Pour plusieurs videos, les IDs peuvent etre comma-separated dans un seul appel :
```bash
curl -s "https://www.googleapis.com/youtube/v3/videos?id={ID1},{ID2},{ID3}&part=snippet,contentDetails&key={API_KEY}"
```

**Champs extraits du JSON de reponse :**
- `name` : `items[].snippet.title` (retirer "| Apple TV", "| Channel Name" etc. du titre si present)
- `description` : `items[].snippet.description` → resumer en 1-2 phrases pertinentes (ignorer les liens promo)
- `release-date-2` : `items[].snippet.publishedAt`
- `duration` : `items[].contentDetails.duration` (format ISO PT1H2M3S → convertir en "MM:SS" ou "H:MM:SS", sans suffixe "min")
- `channelTitle` : `items[].snippet.channelTitle` (pour credits-line)

**Pour les images :** utiliser les titres fournis. Si pas de description → en generer une courte (1 phrase) selon le pattern existant de l'artiste.

#### Etape 2 — Generation du credits-line
Ne PAS demander le format a l'utilisateur. Le generer automatiquement :
1. **D'abord** : chercher si l'artiste/producteur a deja des items dans le CMS (via list_collection_items) → reprendre exactement le meme format
2. **Sinon** : appliquer ces regles :
   - Artiste individuel (paleoartiste, animateur) : `Created by {Nom}.`
   - Chaine YouTube / studio independant : `Created by {Nom}`
   - Production TV/streaming (BBC, Apple, Netflix, etc.) : `Produced by {Nom}.`
   - Original Prehistoric Domain : `A Prehistoric Domain original project.`

#### Etape 3 — Proposition des free-tags
Pour chaque item, analyser titre + description + resultats web pour proposer :
- **Continent** : un parmi (North America, South America, Asia, Europe, Africa, Australia, India, Eurasia, Central Asia, North Africa, Global Oceans)
- **Periode geologique** : (Late Cretaceous, Early Jurassic, Permian, Pleistocene, etc.)
- **Especes** : noms latins binomiaux si possible (Coelodonta antiquitatis, Tyrannosaurus rex, etc.)

Format : `Continent, Period, Species1, Species2`

#### Etape 4 — Traduction FR
Pour chaque item, traduire en francais :
- `name` : titre traduit (garder les noms propres, traduire le reste)
- `description` : description traduite
- `credits-line` : version francaise (ex: "Created by X." → "Cree par X.", "Produced by X." → "Produit par X.")

#### Etape 5 — Tableau recap pour validation
Presenter un tableau COMPLET avec tous les champs EN + FR qui seront envoyes :

| Champ | EN | FR |
|-------|----|----|
| name | ... | ... |
| slug | ... | (meme slug) |
| top-category | Video/Image/... | (meme) |
| youtube-video-id | ... (videos) | (meme) |
| description | ... | ... |
| free-tags | ... | (meme) |
| credits-line | ... | ... |
| release-date-2 | ... (si dispo) | (meme) |
| duration | ... (format "MM:SS") | (meme) |
| new | true | (meme) |
| display-on-app | true | (meme) |

Attendre validation. L'utilisateur peut :
- Valider en bloc ("ok" / "go")
- Corriger des champs specifiques ("free-tags: changer X en Y", "FR name: corriger Z")
- Supprimer un item ("retirer 2")

#### Etape 6 — Creation des drafts bilingues via MCP Webflow

Appeler `create_collection_items` sur la collection `679d148479ad083f33c518a1`.

**Etape 6a — Creer l'item EN + FR en un seul appel :**

Creer en mode **isDraft: true, isArchived: false**.
Ajouter **les deux locales** : `cmsLocaleIds: ["653ad75ae882f528b344a8f1", "680fa104090846c25c1b32c9"]`
Cela cree l'item avec les deux versions (EN et FR, meme contenu initial).

Ne PAS remplir `geological-period` (infere automatiquement par le pipeline sync).

**Videos :**
```json
{
  "name": "titre EN",
  "slug": "titre-slugifie",
  "top-category": "417c5eb49ea7a0509255526b460af1e6",
  "free-tags": "tags valides",
  "credits-line": "credits EN",
  "youtube-video-id": "ID",
  "description": "description EN",
  "duration": "MM:SS",
  "release-date-2": "date ISO",
  "new": true,
  "display-on-app": true
}
```

**Images :**
```json
{
  "name": "titre EN",
  "slug": "titre-slugifie",
  "top-category": "224a8ccce14158309d6df3052fa7f1e1",
  "free-tags": "tags valides",
  "credits-line": "credits EN",
  "description": "description EN",
  "release-date-2": "date ISO (si fournie)",
  "new": true,
  "display-on-app": true
}
```

**Etape 6b — Mettre a jour la version FR :**

Appeler `update_collection_items` avec le `cmsLocaleId` FR pour chaque item cree :
```json
{
  "id": "ITEM_ID (retourne par l'etape 6a)",
  "cmsLocaleId": "680fa104090846c25c1b32c9",
  "fieldData": {
    "name": "titre FR",
    "description": "description FR",
    "credits-line": "credits FR"
  }
}
```

Seuls `name`, `description` et `credits-line` sont traduits. Les autres champs (slug, free-tags, duration, etc.) restent identiques.

#### Etape 7 — Recap final
Tableau des items crees avec leur slug Webflow et statut EN/FR.

Message de cloture :
> Drafts crees (EN + FR). Prochaines etapes :
> 1. Review dans Webflow CMS (ajouter images HD/LQ si type image, completer duration si manquante)
> 2. Publier les drafts (EN et FR separement)
> 3. `npm run sync` pour mettre a jour le globe
