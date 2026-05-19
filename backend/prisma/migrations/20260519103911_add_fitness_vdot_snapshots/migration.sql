-- CreateTable
CREATE TABLE "ExternalDailyFitnessSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "snapshotDate" DATETIME NOT NULL,
    "timezone" TEXT,
    "vo2MaxRunning" REAL,
    "vo2MaxCycling" REAL,
    "fitnessAge" INTEGER,
    "heatAcclimationPercent" INTEGER,
    "altitudeAcclimationPercent" INTEGER,
    "dataQuality" TEXT NOT NULL DEFAULT 'partial',
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalDailyFitnessSnapshot_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VdotHistorySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "snapshotDate" DATETIME NOT NULL,
    "vdotValue" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "basedOnActivityId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VdotHistorySnapshot_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityProviderEnrichment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "providerActivityId" TEXT NOT NULL DEFAULT '',
    "matchConfidence" REAL,
    "matchedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "normalizedJson" TEXT,
    "rawDataId" TEXT,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivityProviderEnrichment_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityProviderEnrichment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ActivityProviderEnrichment" ("activityId", "appUserId", "createdAt", "id", "lastErrorCode", "lastErrorMessage", "matchConfidence", "matchedAt", "normalizedJson", "providerActivityId", "providerCode", "rawDataId", "status", "updatedAt") SELECT "activityId", "appUserId", "createdAt", "id", "lastErrorCode", "lastErrorMessage", "matchConfidence", "matchedAt", "normalizedJson", "providerActivityId", "providerCode", "rawDataId", "status", "updatedAt" FROM "ActivityProviderEnrichment";
DROP TABLE "ActivityProviderEnrichment";
ALTER TABLE "new_ActivityProviderEnrichment" RENAME TO "ActivityProviderEnrichment";
CREATE INDEX "ActivityProviderEnrichment_appUserId_providerCode_status_idx" ON "ActivityProviderEnrichment"("appUserId", "providerCode", "status");
CREATE INDEX "ActivityProviderEnrichment_providerCode_providerActivityId_idx" ON "ActivityProviderEnrichment"("providerCode", "providerActivityId");
CREATE UNIQUE INDEX "ActivityProviderEnrichment_activityId_providerCode_key" ON "ActivityProviderEnrichment"("activityId", "providerCode");
CREATE TABLE "new_ActivityProviderLink" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivityProviderLink_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityProviderLink_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ActivityProviderLink" ("activityId", "appUserId", "createdAt", "id", "matchConfidence", "matchStatus", "matchedAt", "provider", "providerActivityId", "rawDataId", "updatedAt") SELECT "activityId", "appUserId", "createdAt", "id", "matchConfidence", "matchStatus", "matchedAt", "provider", "providerActivityId", "rawDataId", "updatedAt" FROM "ActivityProviderLink";
DROP TABLE "ActivityProviderLink";
ALTER TABLE "new_ActivityProviderLink" RENAME TO "ActivityProviderLink";
CREATE INDEX "ActivityProviderLink_activityId_provider_idx" ON "ActivityProviderLink"("activityId", "provider");
CREATE INDEX "ActivityProviderLink_appUserId_provider_matchStatus_idx" ON "ActivityProviderLink"("appUserId", "provider", "matchStatus");
CREATE UNIQUE INDEX "ActivityProviderLink_appUserId_provider_providerActivityId_key" ON "ActivityProviderLink"("appUserId", "provider", "providerActivityId");
CREATE TABLE "new_ExternalDailyRecoverySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "snapshotDate" DATETIME NOT NULL,
    "timezone" TEXT,
    "sleepDurationSeconds" INTEGER,
    "sleepScore" REAL,
    "hrvAvgMs" REAL,
    "hrvStatus" TEXT,
    "restingHr" INTEGER,
    "stressAvg" REAL,
    "stressMax" REAL,
    "bodyBatteryMorning" INTEGER,
    "bodyBatteryMin" INTEGER,
    "bodyBatteryMax" INTEGER,
    "bodyBatteryEnd" INTEGER,
    "trainingReadinessScore" INTEGER,
    "trainingReadinessStatus" TEXT,
    "dataQuality" TEXT NOT NULL DEFAULT 'partial',
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalDailyRecoverySnapshot_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExternalDailyRecoverySnapshot" ("appUserId", "bodyBatteryEnd", "bodyBatteryMax", "bodyBatteryMin", "bodyBatteryMorning", "createdAt", "dataQuality", "hrvAvgMs", "hrvStatus", "id", "restingHr", "sleepDurationSeconds", "sleepScore", "snapshotDate", "sourceProvider", "stressAvg", "stressMax", "syncedAt", "timezone", "trainingReadinessScore", "trainingReadinessStatus", "updatedAt") SELECT "appUserId", "bodyBatteryEnd", "bodyBatteryMax", "bodyBatteryMin", "bodyBatteryMorning", "createdAt", "dataQuality", "hrvAvgMs", "hrvStatus", "id", "restingHr", "sleepDurationSeconds", "sleepScore", "snapshotDate", "sourceProvider", "stressAvg", "stressMax", "syncedAt", "timezone", "trainingReadinessScore", "trainingReadinessStatus", "updatedAt" FROM "ExternalDailyRecoverySnapshot";
DROP TABLE "ExternalDailyRecoverySnapshot";
ALTER TABLE "new_ExternalDailyRecoverySnapshot" RENAME TO "ExternalDailyRecoverySnapshot";
CREATE INDEX "ExternalDailyRecoverySnapshot_appUserId_snapshotDate_idx" ON "ExternalDailyRecoverySnapshot"("appUserId", "snapshotDate");
CREATE INDEX "ExternalDailyRecoverySnapshot_sourceProvider_snapshotDate_idx" ON "ExternalDailyRecoverySnapshot"("sourceProvider", "snapshotDate");
CREATE INDEX "ExternalDailyRecoverySnapshot_dataQuality_idx" ON "ExternalDailyRecoverySnapshot"("dataQuality");
CREATE UNIQUE INDEX "ExternalDailyRecoverySnapshot_appUserId_sourceProvider_snapshotDate_key" ON "ExternalDailyRecoverySnapshot"("appUserId", "sourceProvider", "snapshotDate");
CREATE TABLE "new_ExternalProviderConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "displayName" TEXT,
    "accountIdentifier" TEXT,
    "encryptedSession" TEXT,
    "sessionSchemaVersion" TEXT NOT NULL DEFAULT 'v1',
    "consentAcceptedAt" DATETIME,
    "connectedAt" DATETIME,
    "disconnectedAt" DATETIME,
    "lastSyncAt" DATETIME,
    "lastBackfillStartedAt" DATETIME,
    "lastBackfillEndedAt" DATETIME,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "lastErrorAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalProviderConnection_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExternalProviderConnection" ("accountIdentifier", "appUserId", "connectedAt", "consentAcceptedAt", "createdAt", "disconnectedAt", "displayName", "encryptedSession", "id", "lastBackfillEndedAt", "lastBackfillStartedAt", "lastErrorAt", "lastErrorCode", "lastErrorMessage", "lastSyncAt", "providerCode", "sessionSchemaVersion", "status", "updatedAt") SELECT "accountIdentifier", "appUserId", "connectedAt", "consentAcceptedAt", "createdAt", "disconnectedAt", "displayName", "encryptedSession", "id", "lastBackfillEndedAt", "lastBackfillStartedAt", "lastErrorAt", "lastErrorCode", "lastErrorMessage", "lastSyncAt", "providerCode", "sessionSchemaVersion", "status", "updatedAt" FROM "ExternalProviderConnection";
DROP TABLE "ExternalProviderConnection";
ALTER TABLE "new_ExternalProviderConnection" RENAME TO "ExternalProviderConnection";
CREATE INDEX "ExternalProviderConnection_providerCode_status_idx" ON "ExternalProviderConnection"("providerCode", "status");
CREATE INDEX "ExternalProviderConnection_appUserId_status_idx" ON "ExternalProviderConnection"("appUserId", "status");
CREATE INDEX "ExternalProviderConnection_lastSyncAt_idx" ON "ExternalProviderConnection"("lastSyncAt");
CREATE UNIQUE INDEX "ExternalProviderConnection_appUserId_providerCode_key" ON "ExternalProviderConnection"("appUserId", "providerCode");
CREATE TABLE "new_ExternalProviderRawData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "providerDateKey" TEXT NOT NULL DEFAULT '',
    "providerResourceId" TEXT NOT NULL DEFAULT '',
    "payloadJson" TEXT NOT NULL,
    "payloadHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalProviderRawData_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExternalProviderRawData" ("appUserId", "createdAt", "dataType", "id", "payloadHash", "payloadJson", "providerCode", "providerDateKey", "providerResourceId", "status", "syncedAt", "updatedAt") SELECT "appUserId", "createdAt", "dataType", "id", "payloadHash", "payloadJson", "providerCode", "providerDateKey", "providerResourceId", "status", "syncedAt", "updatedAt" FROM "ExternalProviderRawData";
DROP TABLE "ExternalProviderRawData";
ALTER TABLE "new_ExternalProviderRawData" RENAME TO "ExternalProviderRawData";
CREATE INDEX "ExternalProviderRawData_appUserId_providerCode_dataType_idx" ON "ExternalProviderRawData"("appUserId", "providerCode", "dataType");
CREATE INDEX "ExternalProviderRawData_providerCode_dataType_providerDateKey_idx" ON "ExternalProviderRawData"("providerCode", "dataType", "providerDateKey");
CREATE INDEX "ExternalProviderRawData_syncedAt_idx" ON "ExternalProviderRawData"("syncedAt");
CREATE UNIQUE INDEX "ExternalProviderRawData_appUserId_providerCode_dataType_providerDateKey_providerResourceId_key" ON "ExternalProviderRawData"("appUserId", "providerCode", "dataType", "providerDateKey", "providerResourceId");
CREATE TABLE "new_ProviderBackfillCursor" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderBackfillCursor_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProviderBackfillCursor" ("appUserId", "createdAt", "id", "lastErrorCode", "lastErrorMessage", "lastRunAt", "lastSuccessAt", "nextWindowEndDate", "oldestFetchedDate", "provider", "resourceType", "status", "totalActivitiesImported", "totalWindowsProcessed", "updatedAt", "windowDays") SELECT "appUserId", "createdAt", "id", "lastErrorCode", "lastErrorMessage", "lastRunAt", "lastSuccessAt", "nextWindowEndDate", "oldestFetchedDate", "provider", "resourceType", "status", "totalActivitiesImported", "totalWindowsProcessed", "updatedAt", "windowDays" FROM "ProviderBackfillCursor";
DROP TABLE "ProviderBackfillCursor";
ALTER TABLE "new_ProviderBackfillCursor" RENAME TO "ProviderBackfillCursor";
CREATE INDEX "ProviderBackfillCursor_provider_resourceType_status_idx" ON "ProviderBackfillCursor"("provider", "resourceType", "status");
CREATE INDEX "ProviderBackfillCursor_nextWindowEndDate_idx" ON "ProviderBackfillCursor"("nextWindowEndDate");
CREATE UNIQUE INDEX "ProviderBackfillCursor_appUserId_provider_resourceType_key" ON "ProviderBackfillCursor"("appUserId", "provider", "resourceType");
CREATE TABLE "new_StravaConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "userStravaAppId" TEXT,
    "stravaAthleteId" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "grantedScopes" TEXT,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTokenRefreshAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StravaConnection_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StravaConnection_userStravaAppId_fkey" FOREIGN KEY ("userStravaAppId") REFERENCES "UserStravaApp" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StravaConnection" ("accessToken", "accessTokenExpiresAt", "appUserId", "connectedAt", "createdAt", "grantedScopes", "id", "isActive", "lastTokenRefreshAt", "refreshToken", "stravaAthleteId", "updatedAt", "userStravaAppId") SELECT "accessToken", "accessTokenExpiresAt", "appUserId", "connectedAt", "createdAt", "grantedScopes", "id", "isActive", "lastTokenRefreshAt", "refreshToken", "stravaAthleteId", "updatedAt", "userStravaAppId" FROM "StravaConnection";
DROP TABLE "StravaConnection";
ALTER TABLE "new_StravaConnection" RENAME TO "StravaConnection";
CREATE UNIQUE INDEX "StravaConnection_stravaAthleteId_key" ON "StravaConnection"("stravaAthleteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ExternalDailyFitnessSnapshot_appUserId_snapshotDate_idx" ON "ExternalDailyFitnessSnapshot"("appUserId", "snapshotDate");

-- CreateIndex
CREATE INDEX "ExternalDailyFitnessSnapshot_sourceProvider_snapshotDate_idx" ON "ExternalDailyFitnessSnapshot"("sourceProvider", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalDailyFitnessSnapshot_appUserId_sourceProvider_snapshotDate_key" ON "ExternalDailyFitnessSnapshot"("appUserId", "sourceProvider", "snapshotDate");

-- CreateIndex
CREATE INDEX "VdotHistorySnapshot_appUserId_snapshotDate_idx" ON "VdotHistorySnapshot"("appUserId", "snapshotDate");

-- CreateIndex
CREATE INDEX "VdotHistorySnapshot_source_idx" ON "VdotHistorySnapshot"("source");

-- CreateIndex
CREATE UNIQUE INDEX "VdotHistorySnapshot_appUserId_snapshotDate_key" ON "VdotHistorySnapshot"("appUserId", "snapshotDate");

-- RedefineIndex
DROP INDEX "Activity_appUser_source_key";
CREATE UNIQUE INDEX "Activity_appUserId_sourceProvider_sourceActivityId_key" ON "Activity"("appUserId", "sourceProvider", "sourceActivityId");
