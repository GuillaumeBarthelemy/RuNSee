/*
  Warnings:

  - You are about to drop the column `syncType` on the `SyncJob` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "athleteId" TEXT NOT NULL,
    "stravaActivityId" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activity_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Activity" ("achievementCount", "athleteCount", "athleteId", "averageCadence", "averageHeartrate", "averageSpeed", "averageTemp", "averageWatts", "calories", "commentCount", "commute", "createdAt", "description", "deviceWatts", "distance", "elapsedTime", "endLatlngJson", "externalId", "flagged", "gearId", "hasHeartrate", "id", "kilojoules", "kudosCount", "lastFetchedAt", "manual", "mapId", "mapPolyline", "mapSummaryPolyline", "maxHeartrate", "maxSpeed", "movingTime", "name", "photoCount", "prCount", "private", "rawJson", "resourceState", "sportType", "startDate", "startDateLocal", "startLatlngJson", "stravaActivityId", "sufferScore", "summaryJson", "timezone", "totalElevationGain", "totalPhotoCount", "trainer", "type", "updatedAt", "uploadId", "utcOffset", "weightedAverageWatts", "workoutType") SELECT "achievementCount", "athleteCount", "athleteId", "averageCadence", "averageHeartrate", "averageSpeed", "averageTemp", "averageWatts", "calories", "commentCount", "commute", "createdAt", "description", "deviceWatts", "distance", "elapsedTime", "endLatlngJson", "externalId", "flagged", "gearId", "hasHeartrate", "id", "kilojoules", "kudosCount", "lastFetchedAt", "manual", "mapId", "mapPolyline", "mapSummaryPolyline", "maxHeartrate", "maxSpeed", "movingTime", "name", "photoCount", "prCount", "private", "rawJson", "resourceState", "sportType", "startDate", "startDateLocal", "startLatlngJson", "stravaActivityId", "sufferScore", "summaryJson", "timezone", "totalElevationGain", "totalPhotoCount", "trainer", "type", "updatedAt", "uploadId", "utcOffset", "weightedAverageWatts", "workoutType" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
CREATE UNIQUE INDEX "Activity_stravaActivityId_key" ON "Activity"("stravaActivityId");
CREATE INDEX "Activity_athleteId_startDate_idx" ON "Activity"("athleteId", "startDate");
CREATE TABLE "new_SyncJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL DEFAULT 'legacy',
    "status" TEXT NOT NULL,
    "triggerSource" TEXT NOT NULL DEFAULT 'ui',
    "message" TEXT,
    "errorDetails" TEXT,
    "progressPercent" INTEGER,
    "pagesProcessed" INTEGER NOT NULL DEFAULT 0,
    "activitiesSeen" INTEGER NOT NULL DEFAULT 0,
    "activitiesInserted" INTEGER NOT NULL DEFAULT 0,
    "activitiesUpdated" INTEGER NOT NULL DEFAULT 0,
    "activitiesFailed" INTEGER NOT NULL DEFAULT 0,
    "detailsFetched" INTEGER NOT NULL DEFAULT 0,
    "lastProcessedActivityDate" DATETIME,
    "lastProcessedActivityId" TEXT,
    "requestedAfterEpoch" TEXT,
    "resultJson" TEXT,
    "queuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncJob_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SyncJob" ("appUserId", "createdAt", "endedAt", "id", "message", "startedAt", "status") SELECT "appUserId", "createdAt", "endedAt", "id", "message", "startedAt", "status" FROM "SyncJob";
DROP TABLE "SyncJob";
ALTER TABLE "new_SyncJob" RENAME TO "SyncJob";
CREATE INDEX "SyncJob_status_queuedAt_idx" ON "SyncJob"("status", "queuedAt");
CREATE INDEX "SyncJob_jobType_queuedAt_idx" ON "SyncJob"("jobType", "queuedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
