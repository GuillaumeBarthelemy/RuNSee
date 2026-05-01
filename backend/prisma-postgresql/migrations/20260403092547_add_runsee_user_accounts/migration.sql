-- AlterTable
ALTER TABLE "AppUser"
ADD COLUMN "email" TEXT,
ADD COLUMN "emailNormalized" TEXT,
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_emailNormalized_key" ON "AppUser"("emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_appUserId_expiresAt_idx" ON "UserSession"("appUserId", "expiresAt");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
