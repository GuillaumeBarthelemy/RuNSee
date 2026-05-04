# Current Context

## Objectif actif

Implémenter et valider la couche **Garmin Recovery** : récupération automatique des données de récupération quotidiennes (HRV, sleep, body battery, stress, training readiness) via le bridge Python `garminconnect_bridge.py`, avec backfill historique et auto-sync.

## Décisions validées

- Sessions auth : token opaque hashé en DB (`UserSession`), pas de JWT
- Bridge Garmin : subprocess Python (bibliothèque `garminconnect`) appelé depuis Node — pas d'appel API direct
- Dual-schema Prisma pendant la migration : `prisma/schema.prisma` (SQLite actif) + `prisma-postgresql/schema.prisma` (cible)
- Déduplication recovery : contrainte `@@unique([appUserId, sourceProvider, snapshotDate])` sur `ExternalDailyRecoverySnapshot`
- Déduplication raw data : `@@unique([appUserId, providerCode, dataType, providerDateKey, providerResourceId])` sur `ExternalProviderRawData`

## Fichiers modifiés ou concernés

Backend (chantier Garmin Recovery initial) :
- `backend/src/services/providers/garminProvider.service.js` — dispatcher principal
- `backend/src/services/providers/garminRecoveryBackfill.service.js` — extracteurs corrigés (predicate > 0) + `renormalizeGarminRecoverySnapshotsForUser` ajouté
- `backend/src/services/providers/garminRecoveryAutoSync.service.js` — ajustements mineurs
- `backend/src/services/providers/garminconnectBridge.service.js` — ajustement mineur
- `backend/src/controllers/provider.controller.js` — `renormalizeGarminRecoveryController` ajouté
- `backend/src/routes/provider.routes.js` — `POST /garmin/recovery/renormalize` ajouté

Frontend :
- `frontend/src/services/externalProvider.service.js` — `renormalizeGarminRecovery()` ajouté

## Tâches en cours ou interrompues

- [ ] Vérifier que `garminProvider.service.js` gère correctement tous les cas d'erreur du bridge Python
- [ ] Connecter les données `ExternalDailyRecoverySnapshot` à l'affichage frontend (DashboardPage ou AnalyticsPage ?)
- [ ] Vérifier la parité entre `prisma/schema.prisma` et `prisma-postgresql/schema.prisma`

## Erreurs résolues

### Bug "Sommeil 0 / FC repos 0 bpm" (résolu 2026-05-04)
- **Cause** : les extracteurs `extractSleepScore`, `extractHrvAvg`, `extractSleepDurationSeconds`, `extractRestingHr` prenaient la première valeur numérique trouvée sans filtre, y compris les placeholders Garmin à `0`.
- **Fix** : ajout de `{ predicate: (value) => value > 0 }` sur les 4 extracteurs dans `garminRecoveryBackfill.service.js`.
- **Re-normalisation** : nouvelle fonction `renormalizeGarminRecoverySnapshotsForUser` + endpoint `POST /provider/garmin/recovery/renormalize` pour recalculer les snapshots déjà pollués sans rappel Garmin.

## Risques de régression

→ Voir `regression_risks.md` pour le détail complet.

Résumé :
- Migration SQLite → PG : **Élevé**
- Garmin bridge subprocess : **Élevé** (code récent, zéro test automatisé)
- Auth middleware : **Moyen** (partagé par toutes les routes protégées)

## Validations restantes

- [ ] **Déclencher `POST /provider/garmin/recovery/renormalize`** pour recalculer les snapshots DB déjà pollués
- [ ] Vérifier dans `ExternalDailyRecoverySnapshot` après renormalisation : `sleepScore` ≈ 80, `restingHr` ≈ 49
- [ ] Dashboard frontend → "Sommeil score moyen 80" et "FC repos ±X bpm vs repere" (non nul)
- [ ] Déclencher un sync récent → vérifier que les nouveaux snapshots ont des valeurs correctes
- [ ] Test de l'auto-sync Garmin après backfill initial
