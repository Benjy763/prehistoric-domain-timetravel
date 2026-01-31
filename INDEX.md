# 📖 Index Documentation

**Navigation rapide dans la documentation Prehistoric Domain Time Travel Globe.**

---

## 🎯 Par Besoin

### Je veux démarrer rapidement

👉 **[QUICKSTART.md](./QUICKSTART.md)** (2 min de lecture)

- Premier lancement
- Ajouter du contenu
- Vérifications
- Dépannage

### Je veux comprendre les commandes

👉 **[scripts/README.md](./scripts/README.md)** (5 min)

- Architecture scripts
- Commandes disponibles
- Règles algorithmiques
- Module centralisé

### Je veux comprendre le code et les règles

👉 **[README.md](./README.md)** (10 min)

- Vue d'ensemble projet
- Règles géocodage
- Performance
- Architecture flux données

### Je veux comprendre les modèles géologiques

👉 **[TECHNICAL_STRATEGY.md](./TECHNICAL_STRATEGY.md)** (15 min)

- Modèles paléogéographiques (Merdith 2021, Cao 2017)
- Optimisations performance
- Choix de design
- Métriques

---

## 📚 Par Document

| Document                                             | Taille | Objectif                | Public      |
| ---------------------------------------------------- | ------ | ----------------------- | ----------- |
| **[QUICKSTART.md](./QUICKSTART.md)**                 | 1.5 KB | Démarrage 5 min         | Débutant    |
| **[README.md](./README.md)**                         | 5.7 KB | Vue d'ensemble + règles | Développeur |
| **[scripts/README.md](./scripts/README.md)**         | 6.6 KB | Architecture scripts    | Mainteneur  |
| **[TECHNICAL_STRATEGY.md](./TECHNICAL_STRATEGY.md)** | 6.4 KB | Stratégie technique     | Architecte  |
| **[CHANGELOG.md](./CHANGELOG.md)**                   | 7.7 KB | Historique versions     | Tous        |

---

## 🔑 Concepts Clés

### Géocodage

**Format free-tags** : `Continent, Période, Espèce`

**Hiérarchie** :

1. Formations célèbres → coordonnées précises
2. Placement continental → aléatoire avec anti-collision
3. Fallback → zones prédéfinies

**Items océaniques** : Sans continent → positions prédéfinies (Panthalassa, Tethys, etc.)

Voir : [README.md#règles-de-géocodage](./README.md#-règles-de-géocodage)

### Reconstruction Paléogéographique

**Principe** : 1 période par item (mapping avec `geological-period`)

**Modèle** : GPlates API MERDITH2021

**Économie** : 92% d'appels API vs ancien système (13 périodes/item)

Voir : [TECHNICAL_STRATEGY.md#optimisations-de-performance](./TECHNICAL_STRATEGY.md#-optimisations-de-performance)

### Performance

**Mode incrémental** : Détection auto nouveaux/modifiés (comparaison timestamps)

**Seuil** : > 50% changés → mode complet

**Exemple** : 5 items modifiés sur 200 = 97.5% économie API

Voir : [TECHNICAL_STRATEGY.md#2-mode-incrémental-automatique](./TECHNICAL_STRATEGY.md#2-mode-incrémental-automatique)

---

## ⚡ Commandes Fréquentes

```bash
# Ajouter 1 item (rapide)
node scripts/sync-contents.js --slugs= <slug>

# Synchroniser changements
node scripts/sync-contents.js

# Init complète
node scripts/sync-contents.js --all

# Valider données
node scripts/validate-content-data.js

# Serveur local
python3 -m http.server 8000
```

---

## 🏗️ Architecture Simplifiée

```
Webflow CMS
    ↓
auto-geocode (coordonnées modernes)
    ↓
paleo-reconstruction.js (module central)
    ↓
API GPlates MERDITH2021
    ↓
content-data.json
    ↓
Globe 3D (Three.js)
```

---

## 🆘 Support

### Problèmes courants

**Aucun point affiché** :

```bash
node scripts/sync-contents.js --all
```

**Module manquant** :

```bash
node --version  # Doit être v18+
```

**API timeout** : Relancer le script

### Validation

```bash
node scripts/validate-content-data.js
node scripts/validate-free-tags.js
node --check scripts/*.js
```

---

**Organisation** : 4 docs principales + 1 changelog
**Principe** : Zéro duplication, tout centralisé
**Dernière MAJ** : 31 janvier 2026
