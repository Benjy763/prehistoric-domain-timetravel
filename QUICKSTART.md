# ⚡ Démarrage Rapide

**Globe 3D fonctionnel en 5 minutes.**

---

## 🚀 Premier lancement

```bash
# 1. Lancer serveur local
python3 -m http.server 8000

# 2. Ouvrir navigateur
open http://localhost:8000
```

Le globe charge automatiquement `assets/data/content-data.json`.

---

## 📥 Ajouter du contenu

### Prérequis

- Node.js v18+
- Token Webflow API dans `.vscode/mcp.json` ou env `WEBFLOW_TOKEN`

### Ajouter 1 item (rapide ~5 sec)

```bash
node scripts/add-content-by-slug.js experience-the-meg
```

### Synchroniser changements (auto-détection)

```bash
node scripts/import-new-contents.js
```

Détecte : nouveaux, modifiés, supprimés

### Init complète (~15 min)

```bash
node scripts/import-new-contents.js --all
```

---

## ✅ Vérifications

**Navigateur** : Globe 3D + points + filtres + popup
**Console (F12)** : `✅ 50 contenus chargés`

**CLI** :

```bash
node scripts/validate-content-data.json
```

---

## 🔧 Format Webflow requis

```
name: "T-Rex"
free-tags: "North America, Late Cretaceous, Tyrannosaurus"
geological-period: "cretaceous"
display-on-app: true
```

**Sans continent** → item océanique
**Sans geological-period** → ignoré

---

## ⚠️ Dépannage

**Aucun point** : `node scripts/import-new-contents.js --all`
**Module manquant** : Vérifier `node --version` (v18+)
**API timeout** : Relancer le script

---

**Docs** : [README.md](README.md) | [scripts/README.md](scripts/README.md) | [TECHNICAL_STRATEGY.md](TECHNICAL_STRATEGY.md)
