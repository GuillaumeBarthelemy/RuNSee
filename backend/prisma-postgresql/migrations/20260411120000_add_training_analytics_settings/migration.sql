CREATE TABLE "UserTrainingAnalyticsSettings" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "heartRateMax" INTEGER,
    "heartRateZone1Max" INTEGER,
    "heartRateZone2Max" INTEGER,
    "heartRateZone3Max" INTEGER,
    "heartRateZone4Max" INTEGER,
    "intensitySourcePriority" TEXT NOT NULL DEFAULT 'heart_rate',
    "efficiencyMinDurationMinutes" INTEGER NOT NULL DEFAULT 20,
    "efficiencyMaxElevationPerKm" INTEGER NOT NULL DEFAULT 25,
    "efficiencyExcludeTrail" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTrainingAnalyticsSettings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserTrainingAnalyticsSettings_appUserId_isActive_idx"
ON "UserTrainingAnalyticsSettings"("appUserId", "isActive");

CREATE INDEX "UserTrainingAnalyticsSettings_appUserId_archivedAt_idx"
ON "UserTrainingAnalyticsSettings"("appUserId", "archivedAt");

CREATE INDEX "UserTrainingAnalyticsSettings_appUserId_effectiveFrom_idx"
ON "UserTrainingAnalyticsSettings"("appUserId", "effectiveFrom");

ALTER TABLE "UserTrainingAnalyticsSettings"
ADD CONSTRAINT "UserTrainingAnalyticsSettings_appUserId_fkey"
FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
