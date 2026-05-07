-- Multi-source activity foundation for Strava/Garmin canonical activities.

ALTER TABLE "Activity" ADD COLUMN "appUserId" TEXT;
ALTER TABLE "Activity" ADD COLUMN "sourceProvider" TEXT NOT NULL DEFAULT 'strava';
ALTER TABLE "Activity" ADD COLUMN "sourceActivityId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Activity" ADD COLUMN "sourcePriority" TEXT NOT NULL DEFAULT 'primary';
ALTER TABLE "Activity" ADD COLUMN "sourceCreatedAt" TIMESTAMP(3);
ALTER TABLE "Activity" ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Activity" ADD COLUMN "sourceSyncedAt" TIMESTAMP(3);
ALTER TABLE "Activity" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Activity" ADD COLUMN "hasExternalEnrichment" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Activity" a
SET
  "appUserId" = sc."appUserId",
  "sourceProvider" = 'strava',
  "sourceActivityId" = COALESCE(a."stravaActivityId", ''),
  "sourcePriority" = 'primary',
  "sourceSyncedAt" = COALESCE(a."lastFetchedAt", a."updatedAt"),
  "sourceUrl" = CASE
    WHEN a."stravaActivityId" IS NOT NULL THEN 'https://www.strava.com/activities/' || a."stravaActivityId"
    ELSE NULL
  END
FROM "Athlete" ath
JOIN "StravaConnection" sc ON sc."id" = ath."connectionId"
WHERE ath."id" = a."athleteId";

ALTER TABLE "Activity" ALTER COLUMN "athleteId" DROP NOT NULL;
ALTER TABLE "Activity" ALTER COLUMN "stravaActivityId" DROP NOT NULL;

ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_appUserId_fkey"
  FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Activity_appUser_source_key"
  ON "Activity"("appUserId", "sourceProvider", "sourceActivityId");
CREATE INDEX "Activity_appUserId_startDate_idx" ON "Activity"("appUserId", "startDate");
CREATE INDEX "Activity_sourceProvider_startDate_idx" ON "Activity"("sourceProvider", "startDate");

CREATE TABLE "ActivityProviderLink" (
  "id" TEXT NOT NULL,
  "appUserId" TEXT NOT NULL,
  "activityId" TEXT,
  "provider" TEXT NOT NULL,
  "providerActivityId" TEXT NOT NULL,
  "matchStatus" TEXT NOT NULL,
  "matchConfidence" DOUBLE PRECISION,
  "matchedAt" TIMESTAMP(3),
  "rawDataId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityProviderLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityProviderLink_identity_key"
  ON "ActivityProviderLink"("appUserId", "provider", "providerActivityId");
CREATE INDEX "ActivityProviderLink_activity_provider_idx"
  ON "ActivityProviderLink"("activityId", "provider");
CREATE INDEX "ActivityProviderLink_user_provider_status_idx"
  ON "ActivityProviderLink"("appUserId", "provider", "matchStatus");

ALTER TABLE "ActivityProviderLink"
  ADD CONSTRAINT "ActivityProviderLink_appUserId_fkey"
  FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityProviderLink"
  ADD CONSTRAINT "ActivityProviderLink_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProviderBackfillCursor" (
  "id" TEXT NOT NULL,
  "appUserId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'idle',
  "nextWindowEndDate" TIMESTAMP(3),
  "oldestFetchedDate" TIMESTAMP(3),
  "windowDays" INTEGER NOT NULL DEFAULT 180,
  "lastRunAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "totalWindowsProcessed" INTEGER NOT NULL DEFAULT 0,
  "totalActivitiesImported" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderBackfillCursor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderBackfillCursor_identity_key"
  ON "ProviderBackfillCursor"("appUserId", "provider", "resourceType");
CREATE INDEX "ProviderBackfillCursor_provider_resource_status_idx"
  ON "ProviderBackfillCursor"("provider", "resourceType", "status");
CREATE INDEX "ProviderBackfillCursor_next_window_idx" ON "ProviderBackfillCursor"("nextWindowEndDate");

ALTER TABLE "ProviderBackfillCursor"
  ADD CONSTRAINT "ProviderBackfillCursor_appUserId_fkey"
  FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
