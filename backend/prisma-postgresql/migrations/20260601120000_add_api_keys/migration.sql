-- AddApiKey (postgresql)
CREATE TABLE "ApiKey" (
  "id"         TEXT NOT NULL,
  "appUserId"  TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "keyPrefix"  TEXT NOT NULL,
  "keyHash"    TEXT NOT NULL,
  "scopes"     TEXT NOT NULL DEFAULT 'activities:read,recovery:read,fitness:read,objectives:read',
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt"  TIMESTAMP(3),
  "revokedAt"  TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_appUserId_fkey"
  FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_appUserId_idx" ON "ApiKey"("appUserId");
