# RunNSee - Quality Gate permanent

Ce document definit les controles permanents a executer avant de considerer un chantier RunNSee comme livre.

## 1. Git et artefacts

Commandes :

```bash
git status --short
git diff --stat
git diff --check
```

Attendu :

- aucun fichier parasite ;
- aucun secret ;
- aucun artefact runtime ;
- aucun diff non souhaite.

Interdits dans les commits et archives :

```text
node_modules/
dist/
.env
.env.*.local
*.db
*.sqlite
*.sqlite3
*.log
runtime/
.tmp/
generated/
coverage/
*.zip
```

## 2. Backend

Commandes :

```bash
cd backend
npm run prisma:generate
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
npm test
node --check src/app.js
node --check src/server.js
```

Attendu :

- Prisma SQLite OK ;
- Prisma PostgreSQL OK ;
- schemas SQLite/PostgreSQL alignes ;
- tests backend OK ;
- syntaxe Node OK.

## 3. Frontend

Commandes :

```bash
cd frontend
npm test -- --run
npm run build
```

Attendu :

- tests frontend OK ;
- build Vite OK ;
- pas d'erreur bloquante.

## 4. Archive de review

Avant chaque review :

```bash
git archive --format=zip --output runsee-source-review.zip HEAD
```

Preferer le script projet :

```powershell
powershell -ExecutionPolicy Bypass -File deployment\scripts\Export-RunSeeSourceArchive.ps1 -OutputPath C:\Services\RuNSee\runsee-source-review.zip
```

L'archive doit etre basee sur `HEAD` et ne contenir aucun artefact interdit.

## 5. Alignement `.ai`

A chaque fin de chantier, verifier :

- `.ai/current_context.md` reflete l'etat reel ;
- `.ai/open_tasks.md` ne contient pas de taches terminees ;
- `.ai/regression_risks.md` contient les nouveaux risques ;
- `.ai/codebase_map.md` contient les nouveaux fichiers/services.

## 6. Non-regressions metier permanentes

- Providers Strava/Garmin : statut visible et coherent.
- Activites : pas de doublons visibles, activites merged masquees, pagination coherente.
- Matching Garmin/Strava : dry-run doublons a 0 apres sync/backfill.
- Aujourd'hui : pas de double comptage, lecture courte, filtre sport local.
- Analytics/Performance/Objectifs : volumes, charge, records et liens sans activites merged parasites.
- Backfill Garmin : `GARMIN_BACKFILL_ALLOW_FORCE_RUN=false`, une fenetre a la fois, compteurs persistants, pas d'usage de la route purge.
