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
  npm run update-contents     Pipeline complet (sync + geocode + reconstruct)
  npm run sync                Synchroniser display-on-app
  npm run geocode             Générer coordonnées modernes
  npm run reconstruct         Calculer positions paléogéographiques

➕ GESTION DES CONTENUS
  npm run add <slug>          Ajouter un item par slug
  npm run import              Importer nouveaux items
  npm run import:all          Réimporter tous les items
  npm run import:dry          Simulation sans modifications

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

1️⃣  AJOUTER UN NOUVEAU CONTENU
   npm run add experience-giants-of-the-ice-age

2️⃣  IMPORTER TOUS LES NOUVEAUX CONTENUS
   npm run import

3️⃣  RECHERCHER UNE FORMATION
   npm run find-formation "Tyrannosaurus rex"

4️⃣  VALIDER LES FREE-TAGS
   npm run validate

5️⃣  PIPELINE COMPLET APRÈS MODIFICATIONS DANS WEBFLOW
   npm run update-contents

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
