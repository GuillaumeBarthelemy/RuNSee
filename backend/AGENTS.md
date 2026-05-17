# AGENTS.md — Backend RuNSee

Scope : `backend/` (Node 22 + Express 5 + Prisma 7, ESM, JS pur).

**Pour les regles transverses, lire d'abord `../AGENTS.md` et `../.ai/dev_rules.md` a la racine du repo.**

## Quality gate backend (avant tout commit)

```bash
cd backend
npm test                    # 31/31 verts attendus
npx prisma validate
npm run prisma:pg:validate
node --check src/app.js     # Si fichiers cles touches
```

Pas de ESLint backend (config ESLint 10 incompatible actuellement). Verification syntaxe via `node --check`.

## Schemas Prisma duaux (CRITIQUE)

- `backend/prisma/schema.prisma` (SQLite dev local).
- `backend/prisma-postgresql/schema.prisma` (PostgreSQL prod cible).

**Toute migration doit etre appliquee sur les DEUX schemas**.

Verification d'alignement :

```bash
npm run db:compare-schemas
```

## Structure

- `src/app.js` : montage routes Express.
- `src/routes/<feature>.routes.js` : definitions de routes (params, middlewares, controller binding).
- `src/controllers/<feature>.controller.js` : controllers minces (input -> service -> response).
- `src/services/<feature>/<topic>.service.js` : logique metier (testable).
- `src/repositories/<entity>.repository.js` : acces Prisma centralise.
- `src/config/` : env, prisma client, logger.
- `scripts/` : scripts de migration, maintenance, providers Python bridge.

## Providers externes

### Strava
- Source primaire des activites.
- Sync incremental via `executeIncrementalSyncJob`.
- Reste prioritaire quand un match Garmin fiable existe.

### Garmin Connect (non officiel)
- Enrichissement temporaire — pas une source primaire.
- Bridge Python : `scripts/providers/garminconnect_bridge.py` (subprocess depuis Node).
- Operations exposees : `login`, `fetch_recovery_days`, `fetch_activities`.
- Bridge appelle `api.get_activities_by_date()` (LIST) + `api.get_activity(id)` (DETAIL) pour les champs Firstbeat (`activityTrainingLoad`, etc.).
- Pacing 1s entre appels DETAIL pour eviter rate-limit.
- Stop propre sur HTTP 429 (`detailRateLimited: true` dans la response).
- Limite haute 200 activites par run (garde-fou).
- `MAX_LOOKBACK_DAYS=180` (cap Garmin hard).

## Modeles Prisma critiques

- `Activity` : multi-source via `sourceProvider`/`sourceActivityId`. Soft-merge via `isMerged/mergedIntoActivityId`. Champs trail (`totalElevationLoss`, `cardiacDecouplingPercent`, `cardiacDecouplingComputedAt`).
- `ExternalProviderConnection` : etat de connexion provider + session chiffree.
- `ExternalProviderRawData` : brut provider deduplique.
- `ExternalDailyRecoverySnapshot` : recovery quotidien normalise. **Le serializer expose `date` (string YYYY-MM-DD), pas `snapshotDate`** — voir `serializeRecoverySnapshot` dans `garminRecoveryBackfill.service.js`. Le frontend doit accepter les deux shapes.
- `ActivityProviderEnrichment` : enrichissement d'une activite Strava par provider externe (`normalizedJson` contient les champs Firstbeat).
- `ActivityProviderLink` : trace de rapprochement provider, y compris matchs ambigus sans merge.
- `ProviderBackfillCursor` / `ProviderBackfillWindowLog` : backfill historique persistant et auditable.

## Scripts maintenance

Dossier : `backend/scripts/maintenance/`. Convention : un script = une operation idempotente.

### Operations
- `trigger-garmin-enrichment.js --days=180 --force` : enrichit toutes les activites Garmin connectees.
- `backfill-cardiac-decoupling.js --limit=500` : peuple `cardiacDecouplingPercent` sur Activity.
- `renormalize-garmin-recovery.js` : renormalise les snapshots recovery existants.

### Diagnostics one-shot
- `diagnose-overview-data.js`, `diagnose-enrichments-content.js`, `diagnose-raw-garmin-keys.js`, `diagnose-recovery-snapshots.js`.
- `check-training-load.js`, `check-tl-coverage.js`.
- `probe-bridge-detail.js`, `inspect-garmin-sleep-payload.js`, `inspect-garmin-enrichments.js`.

### Invocation en prod
```bash
ssh runsee-vm
docker exec runsee-backend node scripts/maintenance/<script>.js
```

## Scripts DB

- `scripts/db/tableDefinitions.js` : liste ordonnee des 15+ modeles.
- `scripts/db/export-sqlite-dump.js` : dump JSON SQLite.
- `scripts/db/import-postgresql-dump.js` : import PostgreSQL avec dry-run et garde-fous (`--truncate` ou `--allow-append` obligatoire).
- `scripts/db/compare-prisma-schemas.js` : detection de drift entre modeles SQLite et PostgreSQL.
- `scripts/db/report-database-snapshot.js` : snapshot counts + integrite Garmin.

## Routes critiques (API publique authentifiee)

- `GET /providers/status` : statut public filtre Strava/Garmin (sans secret).
- `POST /sync/all` : sync globale sequentielle (Strava incremental + Garmin recovery recent + Garmin activites bornees).
- `GET /providers/garmin/recovery/snapshots?days=N` : snapshots recovery serializes.
- `POST /providers/garmin/activities/enrich` : enrichissement Garmin ciblé.

## Anti-patterns interdits

- ❌ Modifier `schema.prisma` sans modifier `prisma-postgresql/schema.prisma` en parallele.
- ❌ Ajouter une route sans middleware `requireAuth` (sauf si volontaire et documente).
- ❌ Exposer un secret provider (token, session chiffree) dans une reponse API.
- ❌ Effectuer un import PostgreSQL reel sans backup prealable ni option explicite (`--truncate` ou `--allow-append`).
- ❌ Backfill Garmin > 180 jours (cap Garmin hard).
- ❌ Renommer un champ DB sans gerer la rétro-compatibilité avec les helpers frontend qui consomment l'API (cf. `snapshotDate` -> `date` bug observe).

## Conventions tests

- Tests purs (pas de mocks DB pour l'instant).
- Convention de nommage : `<topic>.service.test.js` colle au fichier teste.
- Utilisateur attendu : 31/31 verts.
