#!/bin/bash

# 🧪 PREHISTORIC DOMAIN - Tests de Performance
# Valide que le système fait le minimum d'appels API nécessaires

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          🧪 TESTS DE PERFORMANCE - SYNC CONTENTS              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fonction test
test_case() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}Test #${TOTAL_TESTS}: $1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

pass() {
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "  ${GREEN}✓ PASS${NC} - $1"
}

fail() {
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "  ${RED}✗ FAIL${NC} - $1"
}

warn() {
    echo -e "  ${YELLOW}⚠ WARNING${NC} - $1"
}

# Sauvegarde content-data.json
BACKUP_FILE="assets/data/content-data.backup.json"
if [ -f "assets/data/content-data.json" ]; then
    cp assets/data/content-data.json "$BACKUP_FILE"
    echo "💾 Sauvegarde créée: $BACKUP_FILE"
fi

# ============================================
# TEST 1: Import 1 item par slug (performance optimale)
# ============================================
test_case "Import 1 item (--slugs=pteranodon) - Doit faire minimal API calls"

echo '{"items":[]}' > assets/data/content-data.json

echo ""
echo "▶️  Exécution: node scripts/sync-contents.js --slugs=pteranodon"
OUTPUT=$(node scripts/sync-contents.js --slugs=pteranodon 2>&1)

# Vérifier temps d'exécution
TIME=$(echo "$OUTPUT" | grep "Temps total:" | grep -o '[0-9.]*s' | head -1)
echo "$OUTPUT" | grep "Temps total:"

if [[ ! -z "$TIME" ]]; then
    TIME_NUM=$(echo "$TIME" | sed 's/s//')
    if (( $(echo "$TIME_NUM < 5.0" | bc -l) )); then
        pass "Temps < 5s (${TIME})"
    else
        fail "Temps > 5s (${TIME})"
    fi
fi

# Vérifier nombre d'items importés
ITEM_COUNT=$(jq '.items | length' assets/data/content-data.json)
if [ "$ITEM_COUNT" -eq 1 ]; then
    pass "Exactement 1 item importé (pas de duplication)"
else
    fail "Attendu 1 item, trouvé $ITEM_COUNT"
fi

# Vérifier appels API GPlates
API_CALLS=$(echo "$OUTPUT" | grep "Appels API:" | grep -o '[0-9]*' | head -1)
if [ "$API_CALLS" -eq 1 ]; then
    pass "Exactement 1 appel GPlates API (optimal)"
else
    fail "Attendu 1 appel GPlates, trouvé $API_CALLS"
fi

# Vérifier fichier temporaire supprimé
if [ ! -f "geocoded-items.json" ]; then
    pass "Fichier temporaire supprimé"
else
    fail "geocoded-items.json existe encore"
fi

# ============================================
# TEST 2: Import multiple slugs
# ============================================
test_case "Import 3 items (--slugs=pteranodon,spinosaurus,tyrannosaurus-rex)"

echo '{"items":[]}' > assets/data/content-data.json

echo ""
echo "▶️  Exécution: node scripts/sync-contents.js --slugs=pteranodon,spinosaurus,tyrannosaurus-rex"
OUTPUT=$(node scripts/sync-contents.js --slugs=pteranodon,spinosaurus,tyrannosaurus-rex 2>&1)

# Vérifier nombre d'items
ITEM_COUNT=$(jq '.items | length' assets/data/content-data.json)
if [ "$ITEM_COUNT" -eq 3 ]; then
    pass "Exactement 3 items importés"
else
    fail "Attendu 3 items, trouvé $ITEM_COUNT"
fi

# Vérifier appels API
API_CALLS=$(echo "$OUTPUT" | grep "Appels API:" | grep -o '[0-9]*' | head -1)
if [ "$API_CALLS" -eq 3 ]; then
    pass "Exactement 3 appels GPlates API"
else
    fail "Attendu 3 appels, trouvé $API_CALLS"
fi

# ============================================
# TEST 3: Cache PBDB (2 runs successifs)
# ============================================
test_case "Cache PBDB - Vérifier réutilisation entre 2 imports"

echo '{"items":[]}' > assets/data/content-data.json

echo ""
echo "▶️  Run 1: Cache froid"
OUTPUT1=$(node scripts/sync-contents.js --all --limit=10 2>&1)
CACHE_HITS_1=$(echo "$OUTPUT1" | grep -c "Cache PBDB:" | head -1 || echo 0)

echo ""
echo "▶️  Run 2: Cache chaud (même commande)"
echo '{"items":[]}' > assets/data/content-data.json
OUTPUT2=$(node scripts/sync-contents.js --all --limit=10 2>&1)
CACHE_HITS_2=$(echo "$OUTPUT2" | grep -c "Cache PBDB:" | head -1 || echo 0)

echo "  Cache hits run 1: $CACHE_HITS_1"
echo "  Cache hits run 2: $CACHE_HITS_2"

if [ "$CACHE_HITS_2" -gt "$CACHE_HITS_1" ]; then
    pass "Cache PBDB fonctionne (plus de hits au 2ème run)"
else
    warn "Cache PBDB ne semble pas persister entre runs"
fi

# ============================================
# TEST 4: Pas de duplication d'items
# ============================================
test_case "Duplication - Vérifier qu'aucun item n'est dupliqué"

echo '{"items":[]}' > assets/data/content-data.json

echo ""
echo "▶️  Import 5 items"
node scripts/sync-contents.js --all --limit=5 > /dev/null 2>&1

# Vérifier unicité des IDs
TOTAL_ITEMS=$(jq '.items | length' assets/data/content-data.json)
UNIQUE_IDS=$(jq '.items | map(.id) | unique | length' assets/data/content-data.json)

if [ "$TOTAL_ITEMS" -eq "$UNIQUE_IDS" ]; then
    pass "Aucun ID dupliqué ($TOTAL_ITEMS items, $UNIQUE_IDS IDs uniques)"
else
    fail "Duplication détectée: $TOTAL_ITEMS items mais seulement $UNIQUE_IDS IDs uniques"
fi

# Vérifier unicité des slugs
UNIQUE_SLUGS=$(jq '.items | map(.slug) | unique | length' assets/data/content-data.json)

if [ "$TOTAL_ITEMS" -eq "$UNIQUE_SLUGS" ]; then
    pass "Aucun slug dupliqué"
else
    fail "Duplication slugs: $TOTAL_ITEMS items mais $UNIQUE_SLUGS slugs uniques"
fi

# ============================================
# TEST 5: Mode incrémental ne re-reconstruit pas
# ============================================
test_case "Mode incrémental - Ne reconstruit que les nouveaux"

echo '{"items":[]}' > assets/data/content-data.json

echo ""
echo "▶️  Import initial de 5 items"
node scripts/sync-contents.js --all --limit=5 > /dev/null 2>&1

echo "▶️  Re-sync sans changement (doit détecter 0 changements)"
OUTPUT=$(node scripts/sync-contents.js 2>&1)

NEW_ITEMS=$(echo "$OUTPUT" | grep "Nouveaux items" | grep -o '[0-9]*' | head -1)
if [ "$NEW_ITEMS" -eq 0 ]; then
    pass "Aucun nouvel item détecté (mode incrémental fonctionne)"
else
    fail "Détecté $NEW_ITEMS nouveaux items (devrait être 0)"
fi

# Vérifier qu'aucun pipeline n'a été lancé
if echo "$OUTPUT" | grep -q "LANCEMENT DU PIPELINE"; then
    fail "Pipeline lancé alors qu'aucun changement"
else
    pass "Pipeline non lancé (skip intelligent)"
fi

# ============================================
# TEST 6: Structure du fichier final
# ============================================
test_case "Structure content-data.json - Vérifier format correct"

# Vérifier que tous les items ont les champs requis
MISSING_FIELDS=$(jq '.items[] | select(.id == null or .name == null or .slug == null or .periods == null) | .slug' assets/data/content-data.json)

if [ -z "$MISSING_FIELDS" ]; then
    pass "Tous les items ont les champs requis"
else
    fail "Items avec champs manquants: $MISSING_FIELDS"
fi

# Vérifier que periods contient au moins la clé "0" (moderne)
MISSING_MODERN=$(jq '.items[] | select(.periods["0"] == null) | .slug' assets/data/content-data.json)

if [ -z "$MISSING_MODERN" ]; then
    pass "Tous les items ont des coordonnées modernes (période 0)"
else
    fail "Items sans coords modernes: $MISSING_MODERN"
fi

# Vérifier metadata
HAS_METADATA=$(jq 'has("metadata")' assets/data/content-data.json)
if [ "$HAS_METADATA" = "true" ]; then
    pass "Fichier contient metadata"
else
    fail "Metadata manquante"
fi

# ============================================
# RAPPORT FINAL
# ============================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                       📊 RÉSULTATS                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Total tests:  $TOTAL_TESTS"
echo -e "  ${GREEN}Passed:       $PASSED_TESTS${NC}"
echo -e "  ${RED}Failed:       $FAILED_TESTS${NC}"
echo ""

# Restaurer backup
if [ -f "$BACKUP_FILE" ]; then
    mv "$BACKUP_FILE" assets/data/content-data.json
    echo "♻️  content-data.json restauré"
fi

# Exit code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ TOUS LES TESTS PASSENT${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAILED_TESTS TEST(S) ÉCHOUÉ(S)${NC}"
    exit 1
fi
