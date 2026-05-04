# Open Tasks

## En cours / prioritaires

### Garmin Recovery — correction extracteurs (fait 2026-05-04)
- [x] Correctif `predicate > 0` appliqué sur `extractSleepScore`, `extractHrvAvg`, `extractSleepDurationSeconds`, `extractRestingHr`
- [x] Endpoint `POST /provider/garmin/recovery/renormalize` créé
- [x] Service frontend `renormalizeGarminRecovery()` ajouté

### Garmin Recovery — validation post-correctif
- [x] Re-normalisation déclenchée via `maintenance-renormalize-garmin.yml`
- [x] Dashboard validé : "Sommeil score moyen 70", "FC repos +0 bpm vs repere", "HRV equilibree 7/7 jours"
- [ ] Déclencher un sync récent → confirmer que nouveaux snapshots ont des valeurs correctes
- [x] Vérifier la gestion des erreurs dans `garminProvider.service.js` (stderr bridge, timeout, exit code) — RAS, bridge robuste
- [x] Confirmer que `garminRecoveryAutoSync.service.js` s'enclenche correctement après backfill — OK via `lastSyncAt`

### Frontend provider
- [x] Connecter les données `ExternalDailyRecoverySnapshot` à une vue frontend — `RecoverySnapshotCard` ajoutée au Dashboard (commit 735a153)

## Migration PostgreSQL

- [x] Comparer `prisma/schema.prisma` et `prisma-postgresql/schema.prisma` — identiques fonctionnellement (diff cosmétique uniquement)
- [x] Tester l'import SQLite → PG dev — OK (fix port 55532→55432 dans `.env.postgresql.dev.local` + suppression `--env-file=.env` dans `db:ensure:postgres`, commit 069a9e8)
- [x] Valider la stack green PG — production déjà sur PostgreSQL confirmé via `GET /db/health` → `{"database":"postgresql"}`. Le Dockerfile.prod génère le client Prisma PG et exécute `prisma migrate deploy` au démarrage. Aucun cutover nécessaire.

## Zones à analyser (lecture seule, pas de modif sans analyse)

- [x] `garminProvider.service.js` — lu, dispatch bien structuré, gestion d'erreurs OK
- [x] `pages/AdminPage.jsx` — cartographié : 8 sections, 12 actions, gaps mineurs (polling cleanup, loading states manquants sur quelques backfills)
- [x] `utils/activityAggregation.js` vs `utils/activityAggregations.js` — doublon supprimé (`activityAggregation.js` était un re-export inutilisé)

## Backlog fonctionnel (non démarré)

- [x] Affichage des données recovery (HRV, body battery, sleep score) dans le Dashboard — `RecoverySnapshotCard` déployée
- [x] Intégration des snapshots recovery dans les calculs de charge — `buildRecoveryContextProfile` + groupe "Récupération biologique" dans `DynamicsGrid` (commit c6f413b)
- [ ] Tests automatisés pour les services Garmin (zéro couverture actuellement)

## Housekeeping
- [x] Ajouter `handoff_*` et `git_*` au `.gitignore` — fait (commit 735a153)
