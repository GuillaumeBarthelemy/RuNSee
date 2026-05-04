# Codebase Map

## Vue générale

Monorepo `C:\Services\RuNSee\` avec deux apps indépendantes :
- `backend/` — Node.js 22 + Express 5 + Prisma 7, ESM, JS pur
- `frontend/` — React 19 + Vite 8 + React Router 7, ESM, JS/JSX pur

DB active : SQLite (`backend/dev.db`). Migration PostgreSQL en cours (dual-schema).

## Modules principaux

| Domaine | Backend (`src/services/`) | Frontend (`src/`) |
|---|---|---|
| Auth | `auth/` — password, session, user-auth | `context/AuthContext.jsx`, `hooks/useAuth.js` |
| Strava | `strava/` — OAuth, activity, athlete, token crypto | `services/sync.service.js` |
| Garmin | `providers/garmin*` — bridge Python, recovery | `services/externalProvider.service.js` |
| Activités | `sync/activitySync`, `repositories/activity.repository` | `hooks/useActivityViewModel.js`, `services/activity.service.js` |
| Analytique | — | `utils/` (~18 modules : loadDynamics, gradeAdjustedPace, trainingIntelligence…) |
| Objectifs course | `settings/raceObjective.service` | `hooks/useRaceObjectives.js`, `utils/raceObjectivePlanner.js` |
| Assistant IA | `assistant/` — assistantChat, assistantConfig (OpenAI, clé chiffrée) | `pages/AdminPage.jsx` |

## Points d'entrée

- Backend : `backend/src/server.js` → `src/app.js` (Express, 8 routeurs montés)
- Frontend : `frontend/src/main.jsx` → `layouts/AppShell.jsx` → `layouts/AppLayout.jsx`
- Routes backend : `src/routes/{auth,activity,athlete,provider,raceObjective,sync,assistant,trainingAnalyticsSettings}.routes.js`
- Pages frontend : `pages/{Login,Dashboard,Activities,ActivityDetail,Analytics,Performance,Admin}Page.jsx`

## Services critiques

```
backend/src/services/
├── auth/              session.service.js (token opaque hashé, UserSession DB)
├── strava/            stravaActivity.service.js, stravaAuth.service.js
├── sync/              activitySync.service.js, autoSync.service.js, syncJob.service.js
├── providers/
│   ├── garminconnectBridge.service.js   subprocess Python → garminconnect_bridge.py
│   ├── garminProvider.service.js        dispatcher Garmin (NOUVEAU, +131 lignes)
│   ├── garminRecoveryBackfill.service.js  backfill recovery (étendu, +47 lignes)
│   ├── garminRecoveryAutoSync.service.js  auto-sync recovery
│   ├── externalProviderConnection.service.js
│   └── providerSessionCrypto.service.js
├── settings/          raceObjective.service.js, trainingAnalyticsSettings.service.js
└── assistant/         assistantChat.service.js, assistantConfig.service.js
```

## Modèle de données (Prisma SQLite actif)

Modèles clés :
- `AppUser` — utilisateur, rôle, statut
- `UserSession` — token opaque hashé, expiry, revocation
- `Activity` — activité Strava (summary + details, userRpe)
- `Athlete` — profil Strava lié à StravaConnection
- `ExternalProviderConnection` — état connexion provider (Garmin…)
- `ExternalProviderRawData` — données brutes provider (dedup par `@@unique`)
- `ExternalDailyRecoverySnapshot` — HRV, sleep, body battery, stress (par date/provider)
- `ActivityProviderEnrichment` — enrichissement activité par provider externe
- `UserTrainingAnalyticsSettings` — FCmax, zones HR, priorité intensité (historisé)
- `UserRaceObjective` — objectif course actif + historique
- `UserAiAssistantConfig` — config OpenAI par user (clé chiffrée)
- `SyncJob` / `SyncCursor` — état et curseur de synchronisation Strava

Schéma PostgreSQL cible : `backend/prisma-postgresql/schema.prisma`

## Commandes utiles

```bash
# Backend dev
cd backend && npm run dev

# Frontend dev
cd frontend && npm run dev

# Prisma SQLite
cd backend && npm run prisma:migrate
cd backend && npm run prisma:studio

# Prisma PostgreSQL
cd backend && npm run prisma:pg:migrate:dev
cd backend && npm run prisma:pg:studio

# Tests frontend
cd frontend && npm test

# Stack PG dev (Docker)
# deployment/postgresql/scripts/start-dev-db.ps1
# deployment/postgresql/scripts/run-backend-dev.ps1
# deployment/postgresql/scripts/run-frontend-dev.ps1
```

## Conventions détectées

- ESM (`"type": "module"`) dans les deux packages, import/export natif
- JS pur partout — zéro TypeScript dans le code applicatif
- Sessions : token opaque hashé (bcrypt ou sha256) stocké en `UserSession`, pas de JWT
- Chiffrement en DB : `encryptedSession` (providers), `apiKeyEncrypted` (assistant), `clientSecretEncrypted` (Strava app)
- Prisma 7 avec adaptateur runtime (`better-sqlite3` dev, `pg` prod)
- Python bridge subprocess pour Garmin Connect (pas d'appel HTTP direct)
- CSS vanilla uniquement, pas de Tailwind ni CSS-in-JS
- Recharts pour les graphiques, Leaflet pour les cartes
- Vitest pour les tests (frontend seulement, couverture très partielle)
- `@@unique` Prisma utilisé comme garde-fou de déduplication (ExternalProviderRawData, ExternalDailyRecoverySnapshot)

## Zones à analyser au cas par cas

- `garminProvider.service.js` — logique de dispatch interne non encore documentée
- `prisma-postgresql/schema.prisma` — parité à vérifier avec `prisma/schema.prisma`
- `pages/AdminPage.jsx` — périmètre exact (providers, assistant, sync) inconnu
- `utils/activityAggregation.js` vs `utils/activityAggregations.js` — doublon apparent
- `activityEnrichment.service.js` — rôle dans le pipeline Garmin↔Activity non clarifié
