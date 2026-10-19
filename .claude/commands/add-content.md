## Ajout de contenu — $ARGUMENTS

Le CMS Webflow n'est plus la source des contenus (2026-10-19). Un contenu s'ajoute dans le dépôt du site (`pd-web-dinodeck`), par le skill `pd-ajout-contenu`. Ne rien créer dans Webflow.

Ensuite, mettre le globe à jour depuis ce dépôt :

1. `npm run sync` (incrémental : lit `/api/globe` du site, géocode les nouveaux contenus, reconstruit leurs positions passées) ;
2. `npm run validate` ;
3. `npm run build` puis `npm run deploy:pages`, **seulement après la confirmation explicite de Benjamin** (CLAUDE.md du site : jamais de redéploiement sans accord).
