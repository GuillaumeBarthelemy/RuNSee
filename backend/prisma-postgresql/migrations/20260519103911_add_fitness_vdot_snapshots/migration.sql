-- Lot 5 Performance V5 — VO2max wellness Garmin + historisation VDOT.
--
-- Source primaire : Garmin Connect `api.get_max_metrics(date)` qui expose un
-- VO2max running quotidien calcule par Firstbeat (validation labo r=0.93,
-- Knaier 2019). Donnees stockees dans ExternalDailyFitnessSnapshot (brut
-- provider) et consolidees dans VdotHistorySnapshot (source unique pour
-- l'UI Performance).

-- CreateTable
CREATE TABLE "ExternalDailyFitnessSnapshot" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT,
    "vo2MaxRunning" DOUBLE PRECISION,
    "vo2MaxCycling" DOUBLE PRECISION,
    "fitnessAge" INTEGER,
    "heatAcclimationPercent" INTEGER,
    "altitudeAcclimationPercent" INTEGER,
    "dataQuality" TEXT NOT NULL DEFAULT 'partial',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalDailyFitnessSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VdotHistorySnapshot" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "vdotValue" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "basedOnActivityId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VdotHistorySnapshot_pkey" PRIMARY KEY ("id")
);

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

-- AddForeignKey
ALTER TABLE "ExternalDailyFitnessSnapshot" ADD CONSTRAINT "ExternalDailyFitnessSnapshot_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VdotHistorySnapshot" ADD CONSTRAINT "VdotHistorySnapshot_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
