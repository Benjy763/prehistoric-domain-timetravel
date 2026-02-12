# Guide de Déploiement

Ce guide explique comment builder et déployer le globe sur Hostinger.

## Prérequis

- Node.js 18+ installé
- npm installé
- Accès FTP/SFTP à Hostinger

## Préparation du Build

### 1. Synchroniser les données Webflow

Avant de builder, assurez-vous que `content-data.json` est à jour :

```bash
npm run sync:all
```

Cette commande :
- Récupère tous les contenus du CMS Webflow
- Géocode les positions via PBDB
- Reconstruit les coordonnées paléo via GPlates
- Génère `assets/data/content-data.json`

### 2. Builder pour la production

```bash
npm run build
```

Cette commande :
- Minifie le code JavaScript
- Minifie le CSS
- Ajoute des hash aux fichiers (ex: `app.abc123.js`, `styles.def456.css`)
- Optimise les assets
- Génère un dossier `dist/` prêt pour le déploiement

**OU** en une seule commande :

```bash
npm run deploy:prep
```

Cela synchronise les données ET build en une seule commande.

## Structure du Build

Le dossier `dist/` contient :

```
dist/
├── index.html                  # Point d'entrée (références hashées automatiques)
├── assets/
│   ├── js/
│   │   ├── app.[hash].js      # Code applicatif minifié
│   │   └── ...
│   ├── css/
│   │   └── styles.[hash].css  # Styles minifiés
│   ├── data/
│   │   └── content-data.json  # Données CMS
│   ├── geojson/               # Fichiers GeoJSON (13 périodes)
│   ├── sound/
│   │   └── ambiant1.mp3       # Audio ambiant
│   └── ...
```

## Déploiement sur Hostinger

### Via FTP/SFTP (FileZilla, Cyberduck, etc.)

1. **Connectez-vous** à votre compte Hostinger
2. **Naviguez** vers `public_html/` (ou le sous-dossier de votre choix)
3. **Supprimez** les anciens fichiers (SAUF si vous avez d'autres contenus)
4. **Uploadez** tout le contenu du dossier `dist/` vers le serveur
5. **Vérifiez** que l'URL fonctionne

### Via File Manager Hostinger

1. Accédez au **File Manager** dans votre panneau Hostinger
2. Naviguez vers `public_html/`
3. Supprimez les anciens fichiers du globe
4. Uploadez le contenu de `dist/`

### Structure finale sur le serveur

```
public_html/
├── index.html
├── assets/
│   ├── js/
│   ├── css/
│   ├── data/
│   └── ...
```

## URLs d'accès

- Globe principal : `https://votredomaine.com/`
- Ou si dans un sous-dossier : `https://votredomaine.com/globe/`

## Cache-Busting

Grâce aux hash dans les noms de fichiers :
- Les navigateurs téléchargent automatiquement les nouvelles versions
- Pas besoin de vider le cache manuellement
- Les anciennes versions sont immédiatement invalidées

## Mises à jour

Pour mettre à jour le globe après des modifications :

1. **Synchronisez les données** (si le CMS a changé) :
   ```bash
   npm run sync:all
   ```

2. **Rebuilder** :
   ```bash
   npm run build
   ```

3. **Redéployez** le contenu de `dist/` sur Hostinger

## Développement Local

Pour tester en local avant le déploiement :

```bash
# Serveur de développement avec hot-reload
npm run dev

# Preview du build production en local
npm run preview
```

## Checklist de Déploiement

- [ ] `npm run sync:all` exécuté avec succès
- [ ] `content-data.json` contient les dernières données
- [ ] `npm run build` exécuté sans erreur
- [ ] Dossier `dist/` généré
- [ ] Backup des anciens fichiers sur le serveur (optionnel)
- [ ] Upload du contenu de `dist/` sur Hostinger
- [ ] Vérification de l'URL en production
- [ ] Test des fonctionnalités (filtres, recherche, popup, favoris)

## Troubleshooting

### Erreur "content-data.json not found"
- Exécutez `npm run sync:all` avant le build

### Les assets ne se chargent pas
- Vérifiez que tous les fichiers du dossier `assets/` ont été uploadés
- Vérifiez les permissions des fichiers (755 pour dossiers, 644 pour fichiers)

### Le globe ne s'affiche pas
- Ouvrez la console du navigateur (F12)
- Vérifiez les erreurs réseau ou JavaScript
- Assurez-vous que Three.js se charge correctement

### Cache du navigateur
- Si vous ne voyez pas les changements, videz le cache (Ctrl+Shift+R / Cmd+Shift+R)
- Les hash devraient normalement gérer ça automatiquement
