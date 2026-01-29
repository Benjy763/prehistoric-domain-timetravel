/\*\*

- GUIDE RAPIDE DE DÉMARRAGE
-
- Suivez ces étapes pour configurer l'application.
  \*/

# 🚀 DÉMARRAGE RAPIDE

## Option 1 : Utiliser les données de test (pour tester rapidement)

L'application fonctionne directement avec des données de test. Lancez simplement :

```bash
python3 -m http.server 8000
```

Ouvrez : http://localhost:8000

Vous verrez :

- ✅ Le globe 3D avec 6 contenus de test
- ✅ Les côtes préhistoriques (si l'API GPlates répond)
- ✅ Les filtres et périodes fonctionnels
- ✅ La popup au clic sur un point

---

## Option 2 : Utiliser vos vraies données Webflow

### Étape 1 : Configuration

1. Copiez `config.js` vers un nouvel emplacement sécurisé
2. Éditez `config.js` et remplissez :
   - `apiToken` : votre clé API Webflow
   - `siteId` : l'ID de votre site
   - `collectionId` : l'ID de votre collection CMS

### Étape 2 : Récupérer les données

```bash
# Installer Node.js si nécessaire (vérifier avec: node --version)
# Puis lancer :
node data/fetch-webflow-data.js
```

Cela va créer le fichier `assets/data/contents.json` avec vos vrais contenus.

### Étape 3 : Lancer l'application

```bash
python3 -m http.server 8000
```

L'application chargera automatiquement vos données !

---

## 🎨 Que vérifier dans la console

Ouvrez la console du navigateur (F12) et vérifiez :

✅ **Chargement des données**

```
📦 Chargement des données depuis assets/data/contents.json...
✅ 15 contenus chargés depuis le fichier local
```

✅ **Chargement des côtes**

```
🌍 Chargement des côtes pour 160 Ma...
✅ Côtes chargées: 450 features
```

✅ **Affichage des points**

```
Affichage de 6 contenus pour la période jurassic
```

❌ **Si vous voyez des erreurs** :

- Consultez [CONFIGURATION.md](CONFIGURATION.md) pour le guide complet
- Vérifiez que toutes les dépendances sont chargées
- Regardez les messages d'erreur spécifiques

---

## 📤 Déploiement sur Hostinger

Une fois que tout fonctionne localement :

1. **Uploadez ces fichiers sur votre serveur** :
   - `index.html`
   - Dossier `src/`
   - Dossier `assets/`
   - `config.js` (avec vos clés API)

2. **Dans Webflow, ajoutez une iframe** :
   ```html
   <iframe
     src="https://votre-domaine.com/chemin-vers-app/"
     width="100%"
     height="800px"
     frameborder="0"
   >
   </iframe>
   ```

---

## 🐛 Problèmes courants

### Le globe est noir/invisible

- Rafraîchissez la page (F5)
- Vérifiez la console pour des erreurs JavaScript
- Assurez-vous que Three.js est bien chargé

### Les côtes ne s'affichent pas

- C'est normal si l'API GPlates est lente ou ne répond pas
- Le globe fonctionnera quand même, juste sans les côtes
- Les points de contenu s'afficheront normalement

### Aucun point n'apparaît

- Vérifiez que vos contenus ont des coordonnées (latitude/longitude)
- Vérifiez que la période correspond (permian, triassic, jurassic, cretaceous)
- Regardez la console pour les logs

### Erreur CORS

- Utilisez TOUJOURS un serveur local (python, npx serve, etc.)
- N'ouvrez JAMAIS index.html directement dans le navigateur

---

## 📚 Documentation complète

Pour plus de détails : [CONFIGURATION.md](CONFIGURATION.md)
