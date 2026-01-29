/\*\*

- GUIDE DE CONFIGURATION - PREHISTORIC DOMAIN TIME TRAVEL
-
- Ce guide vous explique comment configurer l'application pour récupérer
- les données de votre CMS Webflow.
  \*/

# 🚀 GUIDE DE CONFIGURATION

## 📋 Étape 1 : Obtenir la clé API Webflow

1. Connectez-vous à votre compte Webflow
2. Allez sur : https://webflow.com/dashboard/account/integrations
3. Dans la section "API Access", cliquez sur **"Generate API Token"**
4. Donnez un nom à votre token (ex: "Time Travel Globe")
5. **Copiez la clé** (elle ne sera affichée qu'une seule fois !)
6. Collez-la dans `config.js` à la ligne `apiToken`

## 🔍 Étape 2 : Trouver l'ID de votre site

1. Dans le dashboard Webflow, cliquez sur votre site
2. L'URL sera : `https://webflow.com/dashboard/sites/XXXXX`
3. Copiez la partie `XXXXX` (c'est votre Site ID)
4. Collez-la dans `config.js` à la ligne `siteId`

## 📦 Étape 3 : Trouver l'ID de votre collection CMS

1. Dans votre site Webflow, allez dans le **CMS** (icône base de données)
2. Ouvrez votre collection de contenus (ex: "Contents" ou "Artistes")
3. L'URL sera : `https://webflow.com/design/SITE/cms/COLLECTION_ID`
4. Copiez `COLLECTION_ID`
5. Collez-la dans `config.js` à la ligne `collectionId`

## 🗺️ Étape 4 : Mapper les champs de votre CMS

Dans `config.js`, section `webflowFields`, adaptez les noms de champs selon votre structure CMS :

```javascript
webflowFields: {
    title: 'name',              // Le nom de votre champ "titre"
    description: 'description',  // Le nom de votre champ "description"
    artist: 'artist',           // Le nom de votre champ "artiste"
    period: 'period',           // Le nom de votre champ "période"
    contentType: 'content-type', // Le nom de votre champ "type"
    latitude: 'latitude',       // Le nom de votre champ "latitude"
    longitude: 'longitude',     // Le nom de votre champ "longitude"
    previewImage: 'preview-image', // Le nom de votre champ "image"
    youtubeUrl: 'youtube-url',  // Le nom de votre champ "URL YouTube"
    pageUrl: 'slug'             // Le slug pour créer l'URL
}
```

## 🔧 Étape 5 : Récupérer les données du CMS

Une fois la configuration terminée, lancez le script de récupération :

```bash
node data/fetch-webflow-data.js
```

Ce script va :

- Se connecter à votre CMS Webflow
- Récupérer tous les contenus de la collection
- Les transformer au bon format
- Les sauvegarder dans `assets/data/contents.json`

## ✅ Étape 6 : Vérifier les données

Ouvrez le fichier `assets/data/contents.json` pour vérifier que les données sont correctes.

Chaque contenu doit avoir cette structure :

```json
{
  "id": "xxx",
  "title": "T-REX HUNT - Gobi Desert",
  "description": "...",
  "artist": "John Doe",
  "period": "jurassic",
  "periodLabel": "Jurassique",
  "type": "videos",
  "latitude": 43.5,
  "longitude": 104.0,
  "preview": "https://...",
  "youtubeUrl": "https://youtube.com/watch?v=...",
  "pageUrl": "https://prehistoricdomain.com/content/..."
}
```

## 🌍 Étape 7 : Tester l'application

1. Lancez un serveur local :

   ```bash
   python3 -m http.server 8000
   ```

2. Ouvrez : http://localhost:8000

3. Vérifiez que :
   - Le globe s'affiche correctement
   - Les côtes préhistoriques apparaissent quand vous changez de période
   - Les points de contenu sont visibles sur le globe
   - La popup s'ouvre au clic sur un point

## 🚨 Troubleshooting

### Le globe est vide

- Vérifiez la console du navigateur (F12)
- Assurez-vous que l'API GPlates répond (testez l'URL directement)
- Vérifiez que les données sont dans `assets/data/contents.json`

### Erreur CORS avec Webflow API

- L'API Webflow doit être appelée depuis un serveur (pas directement depuis le navigateur)
- Utilisez le script Node.js `fetch-webflow-data.js` pour récupérer les données

### Les points ne s'affichent pas

- Vérifiez que vos contenus ont bien des coordonnées (latitude/longitude)
- Vérifiez que la période correspond bien à celle sélectionnée
- Vérifiez la console pour des erreurs JavaScript

## 📤 Étape 8 : Déployer sur Hostinger

1. Uploadez tous les fichiers sur votre serveur Hostinger :
   - `index.html`
   - Dossier `src/`
   - Dossier `assets/`
   - `config.js`

2. Dans Webflow, ajoutez un élément **Embed** ou **Custom Code** :
   ```html
   <iframe
     src="https://votre-domaine.com/globe/"
     width="100%"
     height="800px"
     frameborder="0"
     style="border: none;"
   >
   </iframe>
   ```

## 🔒 Sécurité

⚠️ **IMPORTANT** : Ne commitez JAMAIS vos clés API sur Git !

Le fichier `config.js` est déjà dans `.gitignore`, mais vérifiez toujours avant de pousser votre code.

---

**Besoin d'aide ?** Consultez la documentation officielle :

- Webflow API v2 : https://developers.webflow.com/data/reference
- GPlates API : https://portal.gplates.org/service/api_ref/
