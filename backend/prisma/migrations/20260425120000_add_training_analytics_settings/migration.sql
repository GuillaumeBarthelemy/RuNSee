-- CreateTable
CREATE TABLE "UserTrainingAnalyticsSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "heartRateMax" INTEGER,
    "restingHeartrate" INTEGER,
    "biologicalSex" TEXT,
    "heartRateZone1Max" INTEGER,
    "heartRateZone2Max" INTEGER,
    "heartRateZone3Max" INTEGER,
    "heartRateZone4Max" INTEGER,
    "intensitySourcePriority" TEXT NOT NULL DEFAULT 'heart_rate',
    "efficiencyMinDurationMinutes" INTEGER NOT NULL DEFAULT 20,
    "efficiencyMaxElevationPerKm" INTEGER NOT NULL DEFAULT 25,
    "efficiencyExcludeTrail" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserTrainingAnalyticsSettings_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserTrainingAnalyticsSettings_appUserId_isActive_idx" ON "UserTrainingAnalyticsSettings"("appUserId", "isActive");

-- CreateIndex
CREATE INDEX "UserTrainingAnalyticsSettings_appUserId_archivedAt_idx" ON "UserTrainingAnalyticsSettings"("appUserId", "archivedAt");

-- CreateIndex
CREATE INDEX "UserTrainingAnalyticsSettings_appUserId_effectiveFrom_idx" ON "UserTrainingAnalyticsSettings"("appUserId", "effectiveFrom");
