# Regression Risks

## Élevé

### Migration SQLite → PostgreSQL
- **Zone** : `prisma-postgresql/schema.prisma`, `scripts/db/`, `deployment/postgresql/`
- **Risque** : données de production encore sur SQLite. Toute modification du schéma SQLite sans répercussion sur le schéma PG crée une divergence. Les scripts d'import (`import-postgresql-dump.js`) ne sont pas idempotents par défaut.
- **Garde-fou** : comparer les deux schémas avant chaque `prisma migrate dev`. Tester l'import sur la stack dev PG avant tout cutover.

### Garmin bridge subprocess
- **Zone** : `garminconnectBridge.service.js`, `garminProvider.service.js`, `garminconnect_bridge.py`
- **Risque** : le bridge Python est appelé en subprocess depuis Node. Une erreur de parsing de la sortie JSON, un timeout ou un changement d'API Garmin plante silencieusement le sync sans alerte visible.
- **Garde-fou** : vérifier que `garminProvider.service.js` gère les cas `stderr`, `exit code != 0` et timeout. Aucun test automatisé couvre ce chemin.

## Moyen

### Auth middleware
- **Zone** : `backend/src/middleware/auth.middleware.js`
- **Risque** : partagé par toutes les routes protégées. Une régression (token lookup, expiry check, revocation) déconnecte tous les utilisateurs ou ouvre une faille.
- **Garde-fou** : ne pas modifier sans test manuel de login/logout/session expirée.

### Garmin backfill étendu
- **Zone** : `garminRecoveryBackfill.service.js` (+47 lignes récentes)
- **Risque** : la logique de déduplication repose sur `@@unique` Prisma (upsert). Une mauvaise construction de la clé composite (`appUserId + sourceProvider + snapshotDate`) peut créer des doublons ou écraser des données valides.
- **Garde-fou** : vérifier que `snapshotDate` est normalisée (UTC minuit ou date locale cohérente) avant upsert.

### Calculs analytique frontend
- **Zone** : `frontend/src/utils/` (~18 modules)
- **Risque** : aucun test sauf `performanceNarratives.test.js`. Les bugs dans `loadDynamics`, `trainingIntelligence`, `raceObjectivePlanner` sont silencieux et affectent les affichages Dashboard/Analytics/Performance.
- **Garde-fou** : toute modification d'un util analytique doit être vérifiée visuellement sur un jeu de données réel.

### ExternalProviderConnection status machine
- **Zone** : `externalProviderConnection.service.js`, `provider.controller.js`
- **Risque** : les champs `status`, `lastErrorCode`, `lastErrorAt` pilotent l'affichage de l'état de connexion Garmin en frontend. Un statut bloqué en `"error"` après un test peut persister si le reset n'est pas explicite.
- **Garde-fou** : vérifier que les flux de reconnexion et de déconnexion remettent bien `status` à la bonne valeur.

### Re-normalisation des snapshots Garmin
- **Zone** : `renormalizeGarminRecoverySnapshotsForUser` → upsert `ExternalDailyRecoverySnapshot`
- **Risque** : la renormalisation recalcule `dataQuality` à partir des raw data. Des snapshots précédemment marqués `complete` (avec des zéros qui gonflaient `signalCount`) peuvent passer à `partial` ou `absent`. C'est le comportement attendu mais peut surprendre si on surveille `qualityCounts`.
- **Garde-fou** : comparer `qualityCounts` avant/après via `GET /provider/garmin/recovery/snapshots`. Une dégradation est normale et honnête — ne pas revenir en arrière.

## Faible

### Doublon activityAggregation(s).js
- **Zone** : `frontend/src/utils/activityAggregation.js` et `activityAggregations.js`
- **Risque** : si les deux fichiers coexistent avec des implémentations divergentes, les imports incorrects passent silencieusement.
- **Garde-fou** : clarifier lequel est actif avant de modifier l'un des deux.
