-- CreateTable
CREATE TABLE "ProviderBackfillWindowLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cursorId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "windowStartDate" DATETIME NOT NULL,
    "windowEndDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "rawUpsertedCount" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "garminOnlyCreatedCount" INTEGER NOT NULL DEFAULT 0,
    "garminOnlyUpdatedCount" INTEGER NOT NULL DEFAULT 0,
    "ambiguousCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCountAfterWindow" INTEGER NOT NULL DEFAULT 0,
    "resultJson" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderBackfillWindowLog_cursorId_fkey" FOREIGN KEY ("cursorId") REFERENCES "ProviderBackfillCursor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProviderBackfillWindowLog_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProviderBackfillWindowLog_cursorId_startedAt_idx" ON "ProviderBackfillWindowLog"("cursorId", "startedAt");

-- CreateIndex
CREATE INDEX "ProviderBackfillWindowLog_appUserId_provider_resourceType_startedAt_idx" ON "ProviderBackfillWindowLog"("appUserId", "provider", "resourceType", "startedAt");

-- CreateIndex
CREATE INDEX "ProviderBackfillWindowLog_status_startedAt_idx" ON "ProviderBackfillWindowLog"("status", "startedAt");
