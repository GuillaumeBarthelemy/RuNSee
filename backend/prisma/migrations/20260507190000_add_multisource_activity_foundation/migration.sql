-- Multi-source activity foundation for Strava/Garmin canonical activities.
-- SQLite requires a table rebuild to relax Activity.athleteId/stravaActivityId.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Activity" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "appUserId" TEXT,
  "athleteId" TEXT,
  "stravaActivityId" TEXT,
  "sourceProvider" TEXT NOT NULL DEFAULT 'strava',
  "sourceActivityId" TEXT NOT NULL DEFAULT '',
  "sourcePriority" TEXT NOT NULL DEFAULT 'primary',
  "sourceCreatedAt" DATETIME,
  "sourceUpdatedAt" DATETIME,
  "sourceSyncedAt" DATETIME,
  "sourceUrl" TEXT,
  "hasExternalEnrichment" BOOLEAN NOT NULL DEFAULT false,
  "resourceState" INTEGER,
  "externalId" TEXT,
  "uploadId" TEXT,
  "name" TEXT,
  "description" TEXT,
  "type" TEXT,
  "sportType" TEXT,
  "workoutType" INTEGER,
  "startDate" DATETIME,
  "startDateLocal" DATETIME,
  "timezone" TEXT,
  "utcOffset" REAL,
  "distance" REAL,
  "movingTime" INTEGER,
  "elapsedTime" INTEGER,
  "totalElevationGain" REAL,
  "startLatlngJson" TEXT,
  "endLatlngJson" TEXT,
  "achievementCount" INTEGER,
  "kudosCount" INTEGER,
  "commentCount" INTEGER,
  "athleteCount" INTEGER,
  "photoCount" INTEGER,
  "prCount" INTEGER,
  "totalPhotoCount" INTEGER,
  "trainer" BOOLEAN,
  "commute" BOOLEAN,
  "manual" BOOLEAN,
  "private" BOOLEAN,
  "flagged" BOOLEAN,
  "averageSpeed" REAL,
  "maxSpeed" REAL,
  "averageCadence" REAL,
  "averageWatts" REAL,
  "weightedAverageWatts" INTEGER,
  "kilojoules" REAL,
  "deviceWatts" BOOLEAN,
  "hasHeartrate" BOOLEAN,
  "averageHeartrate" REAL,
  "maxHeartrate" REAL,
  "averageTemp" INTEGER,
  "sufferScore" INTEGER,
  "calories" REAL,
  "mapId" TEXT,
  "mapSummaryPolyline" TEXT,
  "mapPolyline" TEXT,
  "gearId" TEXT,
  "isDetailed" BOOLEAN NOT NULL DEFAULT false,
  "summaryJson" TEXT,
  "rawJson" TEXT,
  "summaryFetchedAt" DATETIME,
  "detailsFetchedAt" DATETIME,
  "lastFetchedAt" DATETIME,
  "userRpe" INTEGER,
  "userRpeUpdatedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Activity_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Activity_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Activity" (
  "id", "appUserId", "athleteId", "stravaActivityId", "sourceProvider", "sourceActivityId", "sourcePriority",
  "sourceSyncedAt", "sourceUrl", "resourceState", "externalId", "uploadId", "name", "description",
  "type", "sportType", "workoutType", "startDate", "startDateLocal", "timezone", "utcOffset",
  "distance", "movingTime", "elapsedTime", "totalElevationGain", "startLatlngJson", "endLatlngJson",
  "achievementCount", "kudosCount", "commentCount", "athleteCount", "photoCount", "prCount",
  "totalPhotoCount", "trainer", "commute", "manual", "private", "flagged", "averageSpeed", "maxSpeed",
  "averageCadence", "averageWatts", "weightedAverageWatts", "kilojoules", "deviceWatts", "hasHeartrate",
  "averageHeartrate", "maxHeartrate", "averageTemp", "sufferScore", "calories", "mapId",
  "mapSummaryPolyline", "mapPolyline", "gearId", "isDetailed", "summaryJson", "rawJson",
  "summaryFetchedAt", "detailsFetchedAt", "lastFetchedAt", "userRpe", "userRpeUpdatedAt",
  "createdAt", "updatedAt"
)
SELECT
  a."id",
  sc."appUserId",
  a."athleteId",
  a."stravaActivityId",
  'strava',
  COALESCE(a."stravaActivityId", ''),
  'primary',
  COALESCE(a."lastFetchedAt", a."updatedAt"),
  CASE WHEN a."stravaActivityId" IS NOT NULL THEN 'https://www.strava.com/activities/' || a."stravaActivityId" ELSE NULL END,
  a."resourceState", a."externalId", a."uploadId", a."name", a."description",
  a."type", a."sportType", a."workoutType", a."startDate", a."startDateLocal", a."timezone", a."utcOffset",
  a."distance", a."movingTime", a."elapsedTime", a."totalElevationGain", a."startLatlngJson", a."endLatlngJson",
  a."achievementCount", a."kudosCount", a."commentCount", a."athleteCount", a."photoCount", a."prCount",
  a."totalPhotoCount", a."trainer", a."commute", a."manual", a."private", a."flagged", a."averageSpeed", a."maxSpeed",
  a."averageCadence", a."averageWatts", a."weightedAverageWatts", a."kilojoules", a."deviceWatts", a."hasHeartrate",
  a."averageHeartrate", a."maxHeartrate", a."averageTemp", a."sufferScore", a."calories", a."mapId",
  a."mapSummaryPolyline", a."mapPolyline", a."gearId", a."isDetailed", a."summaryJson", a."rawJson",
  a."summaryFetchedAt", a."detailsFetchedAt", a."lastFetchedAt", a."userRpe", a."userRpeUpdatedAt",
  a."createdAt", a."updatedAt"
FROM "Activity" a
LEFT JOIN "Athlete" ath ON ath."id" = a."athleteId"
LEFT JOIN "StravaConnection" sc ON sc."id" = ath."connectionId";

DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";

CREATE UNIQUE INDEX "Activity_stravaActivityId_key" ON "Activity"("stravaActivityId");
CREATE UNIQUE INDEX "Activity_appUser_source_key" ON "Activity"("appUserId", "sourceProvider", "sourceActivityId");
CREATE INDEX "Activity_appUserId_startDate_idx" ON "Activity"("appUserId", "startDate");
CREATE INDEX "Activity_athleteId_startDate_idx" ON "Activity"("athleteId", "startDate");
CREATE INDEX "Activity_sourceProvider_startDate_idx" ON "Activity"("sourceProvider", "startDate");

CREATE TABLE "ActivityProviderLink" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "appUserId" TEXT NOT NULL,
  "activityId" TEXT,
  "provider" TEXT NOT NULL,
  "providerActivityId" TEXT NOT NULL,
  "matchStatus" TEXT NOT NULL,
  "matchConfidence" REAL,
  "matchedAt" DATETIME,
  "rawDataId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityProviderLink_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ActivityProviderLink_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ActivityProviderLink_identity_key" ON "ActivityProviderLink"("appUserId", "provider", "providerActivityId");
CREATE INDEX "ActivityProviderLink_activity_provider_idx" ON "ActivityProviderLink"("activityId", "provider");
CREATE INDEX "ActivityProviderLink_user_provider_status_idx" ON "ActivityProviderLink"("appUserId", "provider", "matchStatus");

CREATE TABLE "ProviderBackfillCursor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "appUserId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'idle',
  "nextWindowEndDate" DATETIME,
  "oldestFetchedDate" DATETIME,
  "windowDays" INTEGER NOT NULL DEFAULT 180,
  "lastRunAt" DATETIME,
  "lastSuccessAt" DATETIME,
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "totalWindowsProcessed" INTEGER NOT NULL DEFAULT 0,
  "totalActivitiesImported" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderBackfillCursor_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProviderBackfillCursor_identity_key" ON "ProviderBackfillCursor"("appUserId", "provider", "resourceType");
CREATE INDEX "ProviderBackfillCursor_provider_resource_status_idx" ON "ProviderBackfillCursor"("provider", "resourceType", "status");
CREATE INDEX "ProviderBackfillCursor_next_window_idx" ON "ProviderBackfillCursor"("nextWindowEndDate");

PRAGMA foreign_keys=ON;
