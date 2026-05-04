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
- [ ] Tester l'import SQLite → PG dev avec les données actuelles (`import-current-sqlite-to-dev-postgres.ps1`)
- [ ] Valider la stack green PG avant tout cutover (`deployment/postgresql/CUTOVER.md`)

## Zones à analyser (lecture seule, pas de modif sans analyse)

- [x] `garminProvider.service.js` — lu, dispatch bien structuré, gestion d'erreurs OK
- [ ] `pages/AdminPage.jsx` — cartographier les actions exposées (providers, assistant, sync)
- [x] `utils/activityAggregation.js` vs `utils/activityAggregations.js` — doublon supprimé (`activityAggregation.js` était un re-export inutilisé)

## Backlog fonctionnel (non démarré)

- [x] Affichage des données recovery (HRV, body battery, sleep score) dans le Dashboard — `RecoverySnapshotCard` déployée
- [ ] Intégration des snapshots recovery dans les calculs de charge (`loadDynamics`, `trainingIntelligence`)
- [ ] Tests automatisés pour les services Garmin (zéro couverture actuellement)

## Housekeeping
- [x] Ajouter `handoff_*` et `git_*` au `.gitignore` — fait (commit 735a153)
