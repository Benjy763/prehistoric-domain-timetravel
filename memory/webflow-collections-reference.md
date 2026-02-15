# Webflow Collections - Structure de Référence

Documentation complète de la structure des collections Webflow pour le workflow `/add-content`.

Généré le: 2026-02-15

## IDs des Collections

| Collection | ID | Slug CMS |
|------------|----|----|
| **Contents** (principale) | `679d148479ad083f33c518a1` | `content` |
| **Artists** | `67fbcb77cad347c39362ef1b` | `artist` |
| **Projects** (séries) | `6828cef91872740b3f3c76ce` | `projects` |

**Note importante**: Il n'existe PAS de collection "Portfolio" séparée. Le champ `test-artist` (affiché "Portfolio" dans Webflow UI) est en réalité une **Reference** vers la collection **Artists**.

## Schema de la Collection Contents

### Champs de Référence (Relations)

| Champ CMS | Display Name | Type | Cible | Collection ID |
|-----------|--------------|------|-------|---------------|
| `tags` | Artists | **MultiReference** | Artists | `67fbcb77cad347c39362ef1b` |
| `test-artist` | Portfolio | **Reference** | Artists | `67fbcb77cad347c39362ef1b` |
| `filter-featured` | Projects | **MultiReference** | Projects | `6828cef91872740b3f3c76ce` |

### Format des Valeurs

**MultiReference** (tableau d'IDs):
```json
["694432d963af71ecc183196f", "68e6a18ee77a4925c65f299d"]
```

**Reference** (ID unique string):
```json
"694432d963af71ecc183196f"
```

### Exemple d'Item Contents Complet

```json
{
  "id": "6944334f5e32bf3aa89461a5",
  "fieldData": {
    "name": "ANTEDILUVIAN - Animation Short Film",
    "slug": "antediluvian---animation-short-film",
    "tags": ["694432d963af71ecc183196f"],           // MultiRef Artists
    "test-artist": "694432d963af71ecc183196f",      // Ref Artists (Portfolio)
    "filter-featured": ["692744c0926e0c14ccef0e01"] // MultiRef Projects
  }
}
```

## Schema de la Collection Artists

### Champs

| Champ CMS | Display Name | Type | Required | Description |
|-----------|--------------|------|----------|-------------|
| `name` | Name | PlainText | **OUI** | Nom de l'artiste |
| `slug` | Slug | PlainText | **OUI** | Slug unique (auto-généré) |
| `description-2` | Description | PlainText | Non | Bio/description |
| `background` | Background | Image | Non | Image de fond |
| `portfolio` | Portfolio | Link | Non | URL vers portfolio/Instagram |
| `activated` | Activated | Switch | Non | Activation (boolean) |

### Exemple d'Item Artists

```json
{
  "id": "694432d963af71ecc183196f",
  "fieldData": {
    "name": "Mario Lanzas",
    "slug": "mario-lanzas",
    "portfolio": "https://www.instagram.com/mariolanzaspeciosus/",
    "activated": true,
    "background": {
      "fileId": "69443401bbebc7520b0a518d",
      "url": "https://cdn.prod.website-files.com/62f3cb73f8a08a633ff016e9/69443401bbebc7520b0a518d_...",
      "alt": null
    }
  }
}
```

## Schema de la Collection Projects

### Champs

| Champ CMS | Display Name | Type | Required | Description |
|-----------|--------------|------|----------|-------------|
| `name` | Name | PlainText | **OUI** | Nom du projet/série |
| `slug` | Slug | PlainText | **OUI** | Slug unique (auto-généré) |

### Exemples de Projects

```json
[
  {
    "id": "6937295a920c57da52289f5b",
    "fieldData": {
      "name": "Planet Dinosaur",
      "slug": "planet-dinosaur"
    }
  },
  {
    "id": "69372815cad732a6cd393b08",
    "fieldData": {
      "name": "When Dinosaur Roamed America",
      "slug": "when-dinosaur-roamed-america"
    }
  }
]
```

## Workflow de Création (pour /add-content)

### 1. Créer un Artist (si nouveau)

```javascript
POST /collections/67fbcb77cad347c39362ef1b/items

Body:
{
  "fieldData": {
    "name": "Artist Name",              // REQUIRED
    "slug": "artist-name",              // REQUIRED (auto ou manuel)
    "portfolio": "https://...",         // OPTIONAL
    "activated": true,                  // OPTIONAL
    "description-2": "Bio text..."      // OPTIONAL
  }
}

Response:
{
  "id": "new-artist-id-here"
}
```

### 2. Créer un Project (si nouveau)

```javascript
POST /collections/6828cef91872740b3f3c76ce/items

Body:
{
  "fieldData": {
    "name": "Series Name",    // REQUIRED
    "slug": "series-name"     // REQUIRED (auto ou manuel)
  }
}

Response:
{
  "id": "new-project-id-here"
}
```

### 3. Créer le Content Item avec Relations

```javascript
POST /collections/679d148479ad083f33c518a1/items

Body:
{
  "fieldData": {
    "name": "Video Title",
    "slug": "video-title",
    // ... autres champs (category, geological-period, free-tags, etc.)

    // RELATIONS:
    "tags": ["artist-id-1", "artist-id-2"],        // MultiRef (array)
    "test-artist": "artist-id-1",                   // Ref (string)
    "filter-featured": ["project-id-1"]            // MultiRef (array)
  }
}
```

## Notes Importantes

1. **Portfolio vs Artists**: Le champ "Portfolio" (slug: `test-artist`) pointe vers la collection **Artists**, pas vers une collection "Portfolio" séparée.

2. **MultiReference = Array**: Les champs `tags` et `filter-featured` acceptent des tableaux d'IDs.

3. **Reference = String**: Le champ `test-artist` accepte un seul ID en string.

4. **Slug auto-généré**: Webflow peut auto-générer le slug si vous ne le fournissez pas, mais c'est recommandé de le spécifier explicitement.

5. **Activated**: Pour les Artists, le switch `activated` n'a pas d'impact sur la visibilité dans Contents (c'est un champ custom, pas utilisé par le système).

6. **Image Upload**: Pour le champ `background` des Artists, il faut d'abord uploader l'image via l'API Assets, puis utiliser le `fileId` retourné.

## API Reference

- **List Collections**: `GET /v2/sites/{siteId}/collections`
- **Get Collection Schema**: `GET /v2/collections/{collectionId}`
- **List Items**: `GET /v2/collections/{collectionId}/items`
- **Create Item**: `POST /v2/collections/{collectionId}/items`
- **Get Item**: `GET /v2/collections/{collectionId}/items/{itemId}`
- **Update Item**: `PATCH /v2/collections/{collectionId}/items/{itemId}`

Documentation officielle: https://developers.webflow.com/data/reference
