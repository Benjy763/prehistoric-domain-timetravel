# Prehistoric Domain - Time Travel Globe

Application web interactive présentant un globe 3D avec les contenus préhistoriques de PrehistoricDomain.com.

## 🌍 Fonctionnalités

- Globe 3D interactif manipulable
- Sélecteur de périodes géologiques (Permien, Trias, Jurassique, Crétacé)
- Filtres par type de contenu (Images, Vidéos, Immersion 3D, Textes)
- Points de contenu géolocalisés
- Popup d'aperçu avec preview, description, artiste
- Reconstruction des côtes préhistoriques via API GPlates

## 🛠 Technologies

- **Three.js** - Rendu 3D du globe
- **Vanilla JavaScript** - Logique applicative
- **CSS3** - Styles minimalistes
- **Webflow CMS API** - Récupération des contenus
- **GPlates API** - Données géologiques

## 📦 Structure du projet

```
prehistoric-domain-timetravel/
├── index.html              # Page principale
├── src/
│   ├── app.js             # Logique principale
│   ├── globe.js           # Gestion du globe 3D
│   ├── filters.js         # Gestion des filtres
│   ├── popup.js           # Gestion de la popup
│   └── webflow-api.js     # Intégration Webflow
├── assets/
│   ├── css/
│   │   └── styles.css     # Styles globaux
│   ├── images/            # Images et textures
│   └── data/
│       └── contents.json  # Données des contenus
└── data/                  # Scripts de récupération de données
```

## 🚀 Développement local

1. Cloner le repository
2. Ouvrir `index.html` dans un navigateur moderne
3. Pour le développement, utiliser un serveur local :
   ```bash
   python3 -m http.server 8000
   ```
   ou
   ```bash
   npx serve
   ```

## 📤 Déploiement sur Hostinger

1. Build du projet (si nécessaire)
2. Uploader les fichiers suivants :
   - `index.html`
   - `src/` (tous les fichiers JS)
   - `assets/` (CSS, images, données)
3. Intégrer dans une iframe sur le site Webflow

## 🎨 Design

- **Couleur de fond** : `#171c25`
- **Couleur de texte** : `#e6dac7`
- **Style** : Minimaliste, clean, futuriste

## 🔑 Configuration API

### Webflow CMS API
- Obtenir une clé API depuis le dashboard Webflow
- Configurer dans `src/webflow-api.js`

### GPlates API
- Utiliser l'endpoint : `https://gws.gplates.org/reconstruct/coastlines_low/`
- Clé API fournie : `mchin-e494599c-c81b-4972-acbb-c167728c9fb2`

## 📝 TODO

- [ ] Implémenter le globe 3D avec Three.js
- [ ] Créer le sélecteur de périodes
- [ ] Créer les filtres de contenu
- [ ] Intégrer l'API GPlates
- [ ] Intégrer l'API Webflow CMS
- [ ] Créer le système de points interactifs
- [ ] Créer la popup d'aperçu
- [ ] Optimiser les performances
- [ ] Tester sur différents navigateurs
- [ ] Préparer le déploiement

## 📄 Licence

Propriété de PrehistoricDomain.com
