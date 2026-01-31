#!/bin/bash

# 🦕 PREHISTORIC DOMAIN - Helper Script
# Affiche l'aide pour toutes les commandes disponibles

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                    🦕 PREHISTORIC DOMAIN - AIDE RAPIDE                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

📋 COMMANDES PRINCIPALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 PIPELINE AUTOMATIQUE
  npm run sync-contents       Pipeline complet (sync CMS → globe)
  npm run sync-contents:all   Réimporter tous les items
  npm run sync-contents:dry   Simulation sans modifications

🎯 MODES D'IMPORT
  --slugs=item1,item2        Importer items spécifiques (rapide)
  --all                      Réimporter tout (complet)
  --limit=N                  Limiter à N items (test)
  --dry-run                  Simulation seulement

➕ UTILITAIRES
  npm run sync                Synchroniser display-on-app
  npm run geocode             Générer coordonnées modernes
  npm run reconstruct         Calculer positions paléogéographiques

✅ VALIDATION ET RECHERCHE
  npm run validate            Valider tous les free-tags
  npm run validate:errors     Afficher uniquement les erreurs
  npm run validate:export     Exporter rapport en JSON
  npm run find-formation <espèce>  Rechercher une formation

🚀 DÉVELOPPEMENT
  npm run dev                 Serveur local (http://localhost:8000)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 EXEMPLES D'UTILISATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  IMPORTER UN ITEM SPÉCIFIQUE (RAPIDE)
   node scripts/sync-contents.js --slugs=pteranodon

2️⃣  IMPORTER PLUSIEURS ITEMS
   node scripts/sync-contents.js --slugs=pteranodon,spinosaurus,tyrannosaurus-rex

3️⃣  TESTER AVEC 20 ITEMS
   node scripts/sync-contents.js --all --limit=20

4️⃣  RECHERCHER UNE FORMATION
   npm run find-formation "Tyrannosaurus rex"

5️⃣  SYNCHRONISATION COMPLÈTE
   node scripts/sync-contents.js

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 FORMAT DES FREE-TAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Structure:  Continent, Période, Espèce1, Espèce2, ...

✅ Valides:
   North America, Late Cretaceous, Tyrannosaurus rex, Triceratops
   Asia, Early Cretaceous, Yutyrannus
   Europe, Late Jurassic, Archaeopteryx

❌ Invalides:
   Tyrannosaurus rex                          (manque continent)
   T.rex, Giganotosaurus                      (manque continent)
   Brachiosaurus                              (manque continent)

Continents reconnus:
   North America, South America, Asia, Europe, Africa, Australia, India

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 FICHIERS IMPORTANTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  assets/data/content-data.json          Données consolidées (NE PAS ÉDITER)
  assets/data/famous-formations.json     Formations célèbres (ÉDITABLE)
  WORKFLOW.md                            Guide complet
  CHANGELOG.md                           Nouvelles fonctionnalités
  README.md                              Démarrage rapide

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆘 BESOIN D'AIDE ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Documentation:  cat WORKFLOW.md
  Nouveautés:     cat CHANGELOG.md
  Problèmes:      npm run validate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
