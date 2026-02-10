Lis CLAUDE.md, SPEC.md et ARCHITECTURE.md.

Nouvelle feature : $ARGUMENTS

## 1. PLAN (ne code pas)

- Analyse le contexte du projet et la feature demandée
- Propose un plan découpé en tâches concrètes
- Si la feature est complexe, crée `docs/features/XX-nom-feature.md` avec le détail
- Ajoute les tâches dans TASKS.md (dans une nouvelle section dédiée)
- Attends ma validation avant de coder

## 2. DEV (après validation)

- Code et teste tâche par tâche
- Coche `[x]` dans TASKS.md au fur et à mesure

## 3. REVIEW (après dev)

- Analyse le code modifié (git diff depuis le début de la feature)
- Vérifie : qualité, sécurité, cohérence architecture, conventions CLAUDE.md
- Liste les problèmes trouvés avec sévérité (critique/majeur/mineur)
- Corrige les problèmes identifiés

## 4. DOC (après review)

- Mets à jour ARCHITECTURE.md si l'architecture a changé
- Mets à jour SPEC.md si le comportement utilisateur a changé
- Vérifie que CLAUDE.md est toujours à jour (nouvelles conventions ?)

## 5. CLOTURE (quand tout est [x])

- Déplace les tâches terminées dans TASKS_ARCHIVE.md
- Résumé de ce qui a été fait
