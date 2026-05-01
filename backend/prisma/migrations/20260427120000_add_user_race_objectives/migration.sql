-- CreateTable
CREATE TABLE "UserRaceObjective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "raceDate" DATETIME NOT NULL,
    "distanceMeters" INTEGER NOT NULL,
    "targetPaceSecondsPerKm" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserRaceObjective_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserRaceObjective_appUserId_isActive_idx" ON "UserRaceObjective"("appUserId", "isActive");

-- CreateIndex
CREATE INDEX "UserRaceObjective_appUserId_raceDate_idx" ON "UserRaceObjective"("appUserId", "raceDate");
