#!/bin/bash
cd assets/geojson
for time in 0 2 15 50 100 160 220 280 320 380 410; do
  echo "Downloading ${time} Ma..."
  curl -s "https://gws.gplates.org/reconstruct/coastlines_low/?time=${time}&avoid_map_boundary" -o "${time}Ma.json"
  sleep 1
done
echo "✅ All periods downloaded!"
ls -lh
