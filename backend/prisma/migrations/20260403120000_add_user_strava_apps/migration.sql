-- AlterTable
ALTER TABLE "StravaConnection" ADD COLUMN "userStravaAppId" TEXT;

-- CreateTable
CREATE TABLE "UserStravaApp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretEncrypted" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserStravaApp_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserStravaApp_appUserId_key" ON "UserStravaApp"("appUserId");

-- CreateIndex
CREATE INDEX "StravaConnection_userStravaAppId_idx" ON "StravaConnection"("userStravaAppId");
