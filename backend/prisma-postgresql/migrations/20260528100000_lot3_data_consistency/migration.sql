-- Lot 3 — Cohérence données (postgresql)
--
-- 1. Index [appUserId, queuedAt DESC] sur SyncJob.
-- 2. Backfill Garmin : displayName UUID -> email (accountIdentifier).
-- 3. CHECK constraints sur preferences AppUser (defense en profondeur :
--    la validation cote service existe deja, mais une CHECK previent les
--    modifications directes en DB qui mettraient des valeurs invalides).

-- 1. Index SyncJob
CREATE INDEX IF NOT EXISTS "SyncJob_appUserId_queuedAt_idx"
  ON "SyncJob" ("appUserId", "queuedAt" DESC);

-- 2. Backfill Garmin displayName (UUID v4 -> email)
UPDATE "ExternalProviderConnection"
SET "displayName" = "accountIdentifier"
WHERE "providerCode" = 'GARMINCONNECT_UNOFFICIAL'
  AND "accountIdentifier" IS NOT NULL
  AND "accountIdentifier" LIKE '%@%'
  AND "displayName" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. Pre-normalisation : evite l'echec des CHECK sur valeurs existantes
-- non-listees (heritages, modifs manuelles). Defaults conformes au schema.
UPDATE "AppUser" SET "language"          = 'fr'      WHERE "language"          NOT IN ('fr', 'en');
UPDATE "AppUser" SET "themePreference"   = 'light'   WHERE "themePreference"   NOT IN ('light', 'dark', 'auto');
UPDATE "AppUser" SET "unitsPreference"   = 'metric'  WHERE "unitsPreference"   NOT IN ('metric', 'imperial');
UPDATE "AppUser" SET "densityPreference" = 'comfort' WHERE "densityPreference" NOT IN ('comfort', 'compact');
UPDATE "AppUser" SET "role"              = 'user'    WHERE "role"              NOT IN ('user', 'admin');
UPDATE "AppUser" SET "status"            = 'active'  WHERE "status"            NOT IN ('active', 'disabled', 'pending');

-- 4. CHECK constraints sur AppUser.preferences (postgresql uniquement)
-- IF NOT EXISTS n'existe pas pour ADD CONSTRAINT en postgres ; on encapsule
-- dans un bloc DO pour idempotence.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AppUser_language_check'
  ) THEN
    ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_language_check"
      CHECK ("language" IN ('fr', 'en'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AppUser_themePreference_check'
  ) THEN
    ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_themePreference_check"
      CHECK ("themePreference" IN ('light', 'dark', 'auto'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AppUser_unitsPreference_check'
  ) THEN
    ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_unitsPreference_check"
      CHECK ("unitsPreference" IN ('metric', 'imperial'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AppUser_densityPreference_check'
  ) THEN
    ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_densityPreference_check"
      CHECK ("densityPreference" IN ('comfort', 'compact'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AppUser_role_check'
  ) THEN
    ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_role_check"
      CHECK ("role" IN ('user', 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AppUser_status_check'
  ) THEN
    ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_status_check"
      CHECK ("status" IN ('active', 'disabled', 'pending'));
  END IF;
END $$;
