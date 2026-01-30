#!/usr/bin/env python3
"""
Script pour télécharger les coastlines Merdith 2021 depuis l'API GPlates
et les sauvegarder localement en GeoJSON
"""
import json
import urllib.request
import os
import time

# Périodes à télécharger (en Ma)
periods = [2, 6, 14, 22, 33, 45, 53, 76, 90, 100, 105, 126, 140, 152, 160, 169, 195, 218, 220, 232, 255, 277, 280, 287, 302, 320, 328, 348, 368, 380, 396, 410, 450, 500]

# Dossier de sortie
output_dir = "../assets/merdith2021-coastlines"
os.makedirs(output_dir, exist_ok=True)

print("🌍 Téléchargement des coastlines Merdith 2021...\n")

for period in periods:
    url = f"https://gws.gplates.org/reconstruct/coastlines/?time={period}&model=MERDITH2021"
    output_file = os.path.join(output_dir, f"{period}Ma.json")

    # Skip si déjà téléchargé
    if os.path.exists(output_file):
        print(f"  ⏭️  {period} Ma - déjà téléchargé")
        continue

    try:
        print(f"  📥 {period} Ma - téléchargement...", end=" ")

        with urllib.request.urlopen(url, timeout=30) as response:
            data = json.loads(response.read().decode())

            # Sauvegarder
            with open(output_file, 'w') as f:
                json.dump(data, f)

            features = len(data.get('features', []))
            print(f"✅ {features} features")

        # Pause pour ne pas surcharger l'API
        time.sleep(0.5)

    except Exception as e:
        print(f"❌ Erreur: {e}")

print(f"\n✅ Téléchargement terminé! Fichiers dans: {output_dir}")
