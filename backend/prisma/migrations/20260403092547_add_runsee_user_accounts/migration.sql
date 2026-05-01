-- AlterTable
ALTER TABLE "AppUser" ADD COLUMN "email" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "emailNormalized" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE "AppUser" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "AppUser" ADD COLUMN "lastLoginAt" DATETIME;

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "lastSeenAt" DATETIME,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSession_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_emailNormalized_key" ON "AppUser"("emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_appUserId_expiresAt_idx" ON "UserSession"("appUserId", "expiresAt");
