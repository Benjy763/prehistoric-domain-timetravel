# 🌍 Prehistoric Domain - Time Travel Globe

Interactive 3D globe displaying prehistoric life across geological time periods. Built for [prehistoricdomain.com](https://prehistoricdomain.com).

## ✨ Features

- **3D Globe Navigation** - Explore Earth through 13 geological periods (Cambrian to Today)
- **Paleogeographic Reconstruction** - Continental positions calculated using GPlates MERDITH2021 model
- **Smart Content Placement** - Automated geocoding via PBDB (Paleobiology Database)
- **Search & Browse** - Explore 300+ videos, paleo docs, images, and 3D immersive experiences
- **Webflow CMS Integration** - Automated content sync and bilingual support (EN/FR)

## 🚀 Quick Start

```bash
# Install dependencies (none required for frontend, Node.js for scripts)
npm install

# Development server
npm run dev

# Sync CMS data
npm run sync

# Build for production
npm run build
```

## 📁 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Project context, stack, conventions
- **[SPEC.md](SPEC.md)** - Product specifications, features
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture, data pipeline
- **[DEPLOY.md](DEPLOY.md)** - Build and deployment guide

## 🛠️ Tech Stack

- **Frontend**: Vanilla JS, Three.js, Vite
- **CMS**: Webflow API v2
- **Data**: PBDB (geocoding), GPlates API (paleo-reconstruction)
- **Hosting**: Static files on Hostinger, embedded via iframe

## 📜 License

Proprietary - © Prehistoric Domain

---

**Live Demo**: [prehistoricdomain.com](https://prehistoricdomain.com)
