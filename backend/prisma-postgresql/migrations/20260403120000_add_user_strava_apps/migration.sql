-- AlterTable
ALTER TABLE "StravaConnection"
ADD COLUMN "userStravaAppId" TEXT;

-- CreateTable
CREATE TABLE "UserStravaApp" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStravaApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserStravaApp_appUserId_key" ON "UserStravaApp"("appUserId");

-- CreateIndex
CREATE INDEX "StravaConnection_userStravaAppId_idx" ON "StravaConnection"("userStravaAppId");

-- AddForeignKey
ALTER TABLE "UserStravaApp" ADD CONSTRAINT "UserStravaApp_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StravaConnection" ADD CONSTRAINT "StravaConnection_userStravaAppId_fkey" FOREIGN KEY ("userStravaAppId") REFERENCES "UserStravaApp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
