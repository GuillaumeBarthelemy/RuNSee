# Codebase Map

## Vue generale

Monorepo `C:\Services\RuNSee` :

- `backend/` : Node.js + Express + Prisma, ESM, JS pur.
- `frontend/` : React + Vite + React Router, JS/JSX pur.
- DB dev : SQLite `backend/dev.db` local, ignore Git.
- DB prod cible : PostgreSQL via `backend/prisma-postgresql/schema.prisma`.

## Backend critique

- `src/app.js` : montage routes Express.
- `src/routes/provider.routes.js` : routes Garmin non officiel.
- `src/controllers/provider.controller.js` : controllers providers.
- `src/services/providers/garminProvider.service.js` : connexion Garmin, MFA, purge, metriques sync.
- `src/services/providers/garminRecoveryBackfill.service.js` : recuperation recovery quotidienne.
- `src/services/providers/garminActivityEnrichment.service.js` : enrichissement activites Garmin -> Strava.
- `src/services/providers/garminconnectBridge.service.js` : subprocess Python.
- `scripts/providers/garminconnect_bridge.py` : operations `login`, `fetch_recovery_days`, `fetch_activities`.
- `repositories/activity.repository.js` : acces Activity, inclut maintenant `providerEnrichments` sur detail user.

## Frontend critique

- `pages/ActivityDetailPage.jsx` : charge detail activite, snapshots Garmin, action enrichment Garmin ciblee.
- `components/ActivityDetailCard.jsx` : compose la fiche activite.
- `components/ActivityDetailTabs.jsx` : onglets Carte/Splits/Intra/RPE/Garmin.
- `components/GarminEnrichmentPanel.jsx` : recovery snapshot + metriques Garmin de seance.
- `utils/activityEnrichment.js` : mapping stable des metriques Garmin par activite.
- `services/externalProvider.service.js` : appels API providers.

## Scripts DB

- `scripts/db/tableDefinitions.js` : liste ordonnee des 15 modeles.
- `scripts/db/export-sqlite-dump.js` : dump JSON SQLite.
- `scripts/db/import-postgresql-dump.js` : import PostgreSQL avec dry-run et garde-fous.
- `scripts/db/report-database-snapshot.js` : snapshot counts + integrite Garmin.

## Modeles provider importants

- `ExternalProviderConnection` : etat de connexion provider + session chiffree.
- `ExternalProviderRawData` : brut provider deduplique.
- `ExternalDailyRecoverySnapshot` : recovery quotidien normalise.
- `ActivityProviderEnrichment` : enrichissement d'une activite Strava par provider externe.

## Contraintes de conception

- Strava reste source principale des activites.
- Garmin non officiel reste un enrichissement temporaire.
- Les dashboards ne doivent pas consommer directement le payload Garmin brut.
- Les imports DB reels doivent etre explicites et precedes d'un backup.
