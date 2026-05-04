# Open Tasks

## En cours / prioritaires

### Garmin Recovery — correction extracteurs (fait 2026-05-04)
- [x] Correctif `predicate > 0` appliqué sur `extractSleepScore`, `extractHrvAvg`, `extractSleepDurationSeconds`, `extractRestingHr`
- [x] Endpoint `POST /provider/garmin/recovery/renormalize` créé
- [x] Service frontend `renormalizeGarminRecovery()` ajouté

### Garmin Recovery — validation post-correctif (à faire)
- [x] Re-normalisation déclenchée via `maintenance-renormalize-garmin.yml`
- [x] Dashboard validé : "Sommeil score moyen 70", "FC repos +0 bpm vs repere", "HRV equilibree 7/7 jours"
- [ ] Déclencher un sync récent → confirmer que nouveaux snapshots ont des valeurs correctes
- [ ] Vérifier la gestion des erreurs dans `garminProvider.service.js` (stderr bridge, timeout, exit code)
- [ ] Confirmer que `garminRecoveryAutoSync.service.js` s'enclenche correctement après un backfill réussi

### Frontend provider
- [ ] Connecter les données `ExternalDailyRecoverySnapshot` à une vue frontend (Dashboard ou Analytics — à décider)

## Migration PostgreSQL

- [ ] Comparer `prisma/schema.prisma` et `prisma-postgresql/schema.prisma` — identifier les divergences éventuelles
- [ ] Tester l'import SQLite → PG dev avec les données actuelles (`import-current-sqlite-to-dev-postgres.ps1`)
- [ ] Valider la stack green PG avant tout cutover (`deployment/postgresql/CUTOVER.md`)

## Zones à analyser (lecture seule, pas de modif sans analyse)

- [ ] `garminProvider.service.js` — lire entièrement pour comprendre le dispatch et les cas limites
- [ ] `pages/AdminPage.jsx` — cartographier les actions exposées (providers, assistant, sync)
- [ ] `utils/activityAggregation.js` vs `utils/activityAggregations.js` — identifier lequel est utilisé et supprimer le doublon

## Backlog fonctionnel (non démarré)

- [ ] Affichage des données recovery (HRV, body battery, sleep score) dans le Dashboard
- [ ] Intégration des snapshots recovery dans les calculs de charge (`loadDynamics`, `trainingIntelligence`)
- [ ] Tests automatisés pour les services Garmin (zéro couverture actuellement)
