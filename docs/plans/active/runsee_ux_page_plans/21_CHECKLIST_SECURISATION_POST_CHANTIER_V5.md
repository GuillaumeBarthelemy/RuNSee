# RunNSee — Sécurisation post-chantier V5

## 1. Repo clean

```bash
git status
git diff --stat
```

Vérifier :

- pas de fichier temporaire ;
- pas de capture inutile ;
- pas de backup local ;
- pas de `.env` modifié ;
- pas de logs committés ;
- pas de `node_modules` ajouté.

## 2. Alignement documentation

Mettre à jour :

```text
.ai/current_context.md
.ai/open_tasks.md
.ai/regression_risks.md
docs/quality/RUNSEE_TEST_LOG.md
docs/quality/RUNSEE_VALIDATION_MATRIX.md
docs/backlog/BACKLOG_FONCTIONNALITES_FUTURES.md
docs/changelog/RUNSEE_UX_CHANGELOG.md
```

## 3. Tests

Frontend :

```bash
cd frontend
npm test -- --run
npm run build
```

Backend si modifié :

```bash
cd backend
npm test
```

## 4. Recette contrôlée

Tester :

- Accueil ;
- Activités ;
- Analyse ;
- Performance ;
- Progression ;
- Réglages ;
- Glossaire ;
- responsive ;
- données absentes ;
- erreurs API ;
- sync Strava ;
- éléments Garmin.

## 5. Garde-fous spécifiques

- Accueil visuel non modifié.
- Pas de double comptage.
- Pas de calcul métier changé silencieusement.
- Pas de faux placeholders.
- Pas de bouton actif sans handler.
- Pas de `NaN`.
- Pas de libellé anglais technique en principal.

## 6. Archive source propre

Produire une archive propre si demandé :

- sans `node_modules` ;
- sans `.env` ;
- sans logs ;
- avec docs plans actifs ;
- avec changelog ;
- avec matrice validation.

## 7. Baseline / tag

Si validation complète :

```bash
git commit -m "Finalize Alpine Light UX refactor"
git tag ux-alpine-light-v1
```

Si validation partielle :

```bash
git commit -m "Stabilize Alpine Light UX refactor"
```

et documenter les limites.
