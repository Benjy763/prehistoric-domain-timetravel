# Prehistoric Domain — Spécification Produit

## 1. Vision

**Time Travel Globe** est une application web 3D intégrable en iframe dans [prehistoricdomain.com](https://prehistoricdomain.com), qui permet aux visiteurs d'explorer la vie préhistorique sur un globe interactif à travers les âges géologiques.

Le site Webflow contient un CMS de "Contents" : des vidéos, images et expériences immersives 3D créées par différents artistes, chacune représentant la vie à un endroit et une époque donnée. Ces contenus sont projetés sur un globe 3D navigable dans le temps.

---

## 2. Fonctionnalités

### 2.1 Globe 3D interactif
- Sphère Three.js avec fond étoilé et atmosphère
- Rotation manuelle (drag), zoom (scroll)
- Affichage des contours continentaux selon la période sélectionnée
- 2 couches de visualisation :
  - **"Our Continents"** (Merdith 2021) : continents modernes repositionnés dans le passé — mode principal avec pinpoints
  - **"Real Land"** (Cao 2017) : terres émergées réelles de l'époque — mode d'observation sans pinpoints

### 2.2 Sélecteur de périodes
- Barre horizontale en haut : 13 périodes du Cambrien (500 Ma) à Aujourd'hui
- Au changement de période : rechargement de la texture du globe + repositionnement des pinpoints
- Périodes : Today, Quaternary, Neogene, Paleogene, Cretaceous, Jurassic, Triassic, Permian, Carboniferous, Devonian, Silurian, Ordovician, Cambrian

### 2.3 Filtres par type de contenu
- Sidebar gauche avec 4 filtres : Videos, Images, 3D, New
- Chaque filtre a un badge coloré correspondant à la couleur du pinpoint
- Toggle on/off pour masquer/afficher les types
- Désactivés en mode "Real Land"

### 2.4 Pinpoints (marqueurs)
- Sprites Three.js positionnés sur le globe selon les coordonnées paléogéographiques
- Code couleur : violet (videos), jaune (images), rose (3D), turquoise (new)
- Animation de pulsation
- Taille proportionnelle au zoom
- Cliquables via raycasting

### 2.5 Popup de contenu
- Au clic sur un pinpoint : popup centrée avec backdrop flou
- Contenu affiché :
  - **Video** : iframe YouTube embedded
  - **Image/3D** : image de preview cliquable (avec icône play pour 3D)
  - Titre, description (tronquée), crédit artiste
  - **Free tags** : affichés sous forme de badges dorés (chips)
  - Bouton "VIEW MORE" → page content du site Webflow
- Texte indicatif : "The locations show where fossils may have been found" (nuance intentionnelle)
- Fermeture : clic backdrop, bouton X, touche Escape

### 2.6 Favoris
- Stockage local (localStorage) des items favoris par utilisateur
- Icône cœur dans la popup pour ajouter/retirer des favoris
- Filtre "Favorites" dans la sidebar pour afficher uniquement les favoris
- Persistance entre sessions

### 2.7 Page Browse — Catalogue de recherche
- Page dédiée (`browse.html`) affichant TOUS les contenus CMS (éligibles + non-éligibles)
- Interface de recherche centrée initialement :
  - Titre "Find Your Way" centré verticalement
  - Input de recherche + bouton
  - Au premier clic ou Enter : animation fluide vers le haut de la page (500ms)
  - Pour les recherches suivantes : header reste en haut
- Recherche sur Enter ou clic bouton (pas de temps réel) :
  - Nom, description, free-tags, crédits, catégorie, période géologique
- Grille responsive de cards :
  - 4 colonnes (desktop large ≥1400px)
  - 3 colonnes (desktop ≥1024px)
  - 2 colonnes (tablette ≥768px)
  - Adaptatif (mobile)
- Cards avec :
  - Image preview (16:9) avec hover scale + border
  - Badge de type (Video, Image, 3D Immersion, Behind The Scenes)
  - Titre du contenu
  - Clic → ouvre la page Webflow du content
- Auto-détection de catégorie pour les items "unknown" (basée sur présence de youtubeId ou images)
- Affichage de tous les résultats d'un coup (pas de pagination)

### 2.8 Outil de placement manuel (à implémenter)
- Page web dédiée (`placement.html`) réutilisant le globe existant
- Affiche le globe à la période de l'item avec la carte Merdith
- Montre le pinpoint actuel (position calculée) en surbrillance
- Cliquer sur le globe → récupère les coordonnées lat/lon du clic
- Bouton "Valider" → enregistre dans `manual-coordinate-fixes.json`
- Navigation : item précédent/suivant, filtre "items sans coordonnées" ou "items à corriger"

---

## 3. Données CMS

### Source : Webflow CMS
Collection "Contents" (~288 items actuellement, cible 1000-2000) avec les champs clés :
- `name`, `slug`, `description`, `credits-line`
- `category` : video / image / 3D / text
- `geological-period` : période géologique (ex: cretaceous)
- `free-tags` : texte libre "Continent, Période, Espèce1, Espèce2..." — **optionnel** : si vide, l'item n'est pas affiché sur le globe
- `youtube-id`, `background-image`, `gallery-image`
- `display-on-app` : toggle de visibilité sur le globe
- `content-link` : lien vers le contenu (immersion 3D, etc.)

### Règle d'éligibilité
Un item est affiché sur le globe si `free-tags` non vide ET catégorie ≠ Behind The Scenes (texts). Le pipeline sync auto-active `display-on-app` pour les items éligibles.

---

## 4. Limites connues

### 4.1 GPlates API — limite 410 Ma
Les périodes Cambrien (500 Ma) et Ordovicien (450 Ma) utilisent les données du Silurien (410 Ma) car l'API GPlates MERDITH2021 ne reconstruit pas au-delà.

### 4.2 Précision du placement
PBDB donne des coordonnées approximatives (site de fouille, pas position exacte de l'animal). Certains items multi-continents ou mal tagués nécessitent des corrections manuelles via `manual-coordinate-fixes.json`.

### 4.3 Points océaniques
GPlates renvoie `999.99` pour les points en plein océan (pas de plaque tectonique). Le pipeline gère ce cas mais le résultat peut être imprécis pour les items marins.

### 4.4 Mode "Real Land" sans pinpoints
Comportement voulu : mode observation seule, pas de pinpoints (décision actée).

---

## 5. Ce qui fonctionne bien

- Le globe 3D : rendu, rotation, zoom, étoiles, atmosphère
- Le système de textures avec cache (Merdith + Cao)
- Les filtres par type de contenu
- La popup de contenu (video embedded, preview image, lien page)
- Le sélecteur de périodes et le switch de couches
- La structure du `content-data.json` (quand le format est correct)
- L'architecture DRY avec module central `paleo-reconstruction.js`
- Le mécanisme incrémental (détection de changements)
