#!/bin/bash

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                    PREHISTORIC DOMAIN - AIDE RAPIDE                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

SYNCHRONISATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  npm run sync                Sync incremental (defaut)
  npm run sync:all            Rebuild complet
  npm run sync:dry            Simulation sans modifications

  Options directes :
  node scripts/sync-contents.js --slugs=item1,item2   Import cible
  node scripts/sync-contents.js --limit=20             Limiter a N items

VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  npm run validate            Valider la structure du JSON
  npm run validate:tags       Rapport complet des free-tags
  npm run validate:tags:errors  Erreurs free-tags seulement

PLACEMENT MANUEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  npm run placement           Outil de placement (http://localhost:8080/placement.html)

DEVELOPPEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  npm run dev                 Serveur local (http://localhost:8000)

EXEMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Importer un item specifique :
     node scripts/sync-contents.js --slugs=pteranodon

  2. Importer plusieurs items :
     node scripts/sync-contents.js --slugs=pteranodon,spinosaurus

  3. Tester avec 20 items :
     node scripts/sync-contents.js --all --limit=20

  4. Sync incremental (nouveaux/modifies) :
     node scripts/sync-contents.js

DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  CLAUDE.md           Contexte projet, stack, conventions
  SPEC.md             Specification produit
  ARCHITECTURE.md     Architecture technique et data workflow
  TASKS.md            Plan d'execution actif

EOF
