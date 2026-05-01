-- CreateTable
CREATE TABLE "UserRaceObjective" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "distanceMeters" INTEGER NOT NULL,
    "targetPaceSecondsPerKm" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRaceObjective_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRaceObjective_appUserId_isActive_idx" ON "UserRaceObjective"("appUserId", "isActive");

-- CreateIndex
CREATE INDEX "UserRaceObjective_appUserId_raceDate_idx" ON "UserRaceObjective"("appUserId", "raceDate");

-- AddForeignKey
ALTER TABLE "UserRaceObjective" ADD CONSTRAINT "UserRaceObjective_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
