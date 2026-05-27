-- Lot 3 — Cohérence données (sqlite)
--
-- 1. Index [appUserId, queuedAt DESC] sur SyncJob pour accelerer listSyncJobs
--    et getCurrentSyncJob (filtre appUserId + tri par queuedAt).
-- 2. Backfill Garmin : remplace displayName par accountIdentifier (email saisi)
--    quand displayName ressemble a un UUID Garmin (36 chars hex avec tirets).
--    Heuristique : displayName matche regex UUID v4 OU est strictement egal a
--    accountIdentifier ET accountIdentifier contient '@' (i.e. email).

-- 1. Index SyncJob
CREATE INDEX IF NOT EXISTS "SyncJob_appUserId_queuedAt_idx"
  ON "SyncJob" ("appUserId", "queuedAt" DESC);

-- 2. Backfill Garmin displayName
-- Sqlite : pas de regex natif, on detecte un UUID par sa longueur (36)
-- et la presence de tirets aux bonnes positions.
UPDATE "ExternalProviderConnection"
SET "displayName" = "accountIdentifier"
WHERE "providerCode" = 'GARMINCONNECT_UNOFFICIAL'
  AND "accountIdentifier" IS NOT NULL
  AND "accountIdentifier" LIKE '%@%'
  AND "displayName" IS NOT NULL
  AND length("displayName") = 36
  AND substr("displayName", 9, 1) = '-'
  AND substr("displayName", 14, 1) = '-'
  AND substr("displayName", 19, 1) = '-'
  AND substr("displayName", 24, 1) = '-';
