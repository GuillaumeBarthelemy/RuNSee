-- CreateTable
CREATE TABLE "ProviderBackfillWindowLog" (
    "id" TEXT NOT NULL,
    "cursorId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "windowStartDate" TIMESTAMP(3) NOT NULL,
    "windowEndDate" TIMESTAMP(3) NOT NULL,
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
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderBackfillWindowLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProviderBackfillWindowLog" ADD CONSTRAINT "ProviderBackfillWindowLog_cursorId_fkey" FOREIGN KEY ("cursorId") REFERENCES "ProviderBackfillCursor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderBackfillWindowLog" ADD CONSTRAINT "ProviderBackfillWindowLog_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ProviderBackfillWindowLog_cursorId_startedAt_idx" ON "ProviderBackfillWindowLog"("cursorId", "startedAt");

-- CreateIndex
CREATE INDEX "ProviderBackfillWindowLog_appUserId_provider_resourceType_startedAt_idx" ON "ProviderBackfillWindowLog"("appUserId", "provider", "resourceType", "startedAt");

-- CreateIndex
CREATE INDEX "ProviderBackfillWindowLog_status_startedAt_idx" ON "ProviderBackfillWindowLog"("status", "startedAt");
