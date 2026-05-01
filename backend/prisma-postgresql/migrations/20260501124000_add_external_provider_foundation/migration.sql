-- Foundation tables for external providers such as garminconnect_unofficial.
-- These tables intentionally separate provider connection state, raw payloads,
-- normalized recovery snapshots and activity enrichments.

CREATE TABLE "ExternalProviderConnection" (
  "id" TEXT NOT NULL,
  "appUserId" TEXT NOT NULL,
  "providerCode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'disconnected',
  "displayName" TEXT,
  "accountIdentifier" TEXT,
  "encryptedSession" TEXT,
  "sessionSchemaVersion" TEXT NOT NULL DEFAULT 'v1',
  "consentAcceptedAt" TIMESTAMP(3),
  "connectedAt" TIMESTAMP(3),
  "disconnectedAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "lastBackfillStartedAt" TIMESTAMP(3),
  "lastBackfillEndedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "lastErrorAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalProviderConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalProviderRawData" (
  "id" TEXT NOT NULL,
  "appUserId" TEXT NOT NULL,
  "providerCode" TEXT NOT NULL,
  "dataType" TEXT NOT NULL,
  "providerDateKey" TEXT NOT NULL DEFAULT '',
  "providerResourceId" TEXT NOT NULL DEFAULT '',
  "payloadJson" TEXT NOT NULL,
  "payloadHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'success',
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalProviderRawData_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalDailyRecoverySnapshot" (
  "id" TEXT NOT NULL,
  "appUserId" TEXT NOT NULL,
  "sourceProvider" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT,
  "sleepDurationSeconds" INTEGER,
  "sleepScore" DOUBLE PRECISION,
  "hrvAvgMs" DOUBLE PRECISION,
  "hrvStatus" TEXT,
  "restingHr" INTEGER,
  "stressAvg" DOUBLE PRECISION,
  "stressMax" DOUBLE PRECISION,
  "bodyBatteryMorning" INTEGER,
  "bodyBatteryMin" INTEGER,
  "bodyBatteryMax" INTEGER,
  "bodyBatteryEnd" INTEGER,
  "trainingReadinessScore" INTEGER,
  "trainingReadinessStatus" TEXT,
  "dataQuality" TEXT NOT NULL DEFAULT 'partial',
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalDailyRecoverySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityProviderEnrichment" (
  "id" TEXT NOT NULL,
  "appUserId" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "providerCode" TEXT NOT NULL,
  "providerActivityId" TEXT NOT NULL DEFAULT '',
  "matchConfidence" DOUBLE PRECISION,
  "matchedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "normalizedJson" TEXT,
  "rawDataId" TEXT,
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityProviderEnrichment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalProviderConnection_user_provider_key"
  ON "ExternalProviderConnection"("appUserId", "providerCode");
CREATE INDEX "ExternalProviderConnection_provider_status_idx"
  ON "ExternalProviderConnection"("providerCode", "status");
CREATE INDEX "ExternalProviderConnection_user_status_idx"
  ON "ExternalProviderConnection"("appUserId", "status");
CREATE INDEX "ExternalProviderConnection_last_sync_idx"
  ON "ExternalProviderConnection"("lastSyncAt");

CREATE UNIQUE INDEX "ExternalProviderRawData_identity_key"
  ON "ExternalProviderRawData"("appUserId", "providerCode", "dataType", "providerDateKey", "providerResourceId");
CREATE INDEX "ExternalProviderRawData_user_provider_type_idx"
  ON "ExternalProviderRawData"("appUserId", "providerCode", "dataType");
CREATE INDEX "ExternalProviderRawData_provider_type_date_idx"
  ON "ExternalProviderRawData"("providerCode", "dataType", "providerDateKey");
CREATE INDEX "ExternalProviderRawData_synced_at_idx"
  ON "ExternalProviderRawData"("syncedAt");

CREATE UNIQUE INDEX "ExternalDailyRecoverySnapshot_identity_key"
  ON "ExternalDailyRecoverySnapshot"("appUserId", "sourceProvider", "snapshotDate");
CREATE INDEX "ExternalDailyRecoverySnapshot_user_date_idx"
  ON "ExternalDailyRecoverySnapshot"("appUserId", "snapshotDate");
CREATE INDEX "ExternalDailyRecoverySnapshot_source_date_idx"
  ON "ExternalDailyRecoverySnapshot"("sourceProvider", "snapshotDate");
CREATE INDEX "ExternalDailyRecoverySnapshot_quality_idx"
  ON "ExternalDailyRecoverySnapshot"("dataQuality");

CREATE UNIQUE INDEX "ActivityProviderEnrichment_activity_provider_key"
  ON "ActivityProviderEnrichment"("activityId", "providerCode");
CREATE INDEX "ActivityProviderEnrichment_user_provider_status_idx"
  ON "ActivityProviderEnrichment"("appUserId", "providerCode", "status");
CREATE INDEX "ActivityProviderEnrichment_provider_activity_idx"
  ON "ActivityProviderEnrichment"("providerCode", "providerActivityId");

ALTER TABLE "ExternalProviderConnection"
  ADD CONSTRAINT "ExternalProviderConnection_appUserId_fkey"
  FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalProviderRawData"
  ADD CONSTRAINT "ExternalProviderRawData_appUserId_fkey"
  FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalDailyRecoverySnapshot"
  ADD CONSTRAINT "ExternalDailyRecoverySnapshot_appUserId_fkey"
  FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityProviderEnrichment"
  ADD CONSTRAINT "ActivityProviderEnrichment_appUserId_fkey"
  FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityProviderEnrichment"
  ADD CONSTRAINT "ActivityProviderEnrichment_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
