-- AddApiKey (sqlite)
CREATE TABLE "ApiKey" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "appUserId"  TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "keyPrefix"  TEXT NOT NULL,
  "keyHash"    TEXT NOT NULL,
  "scopes"     TEXT NOT NULL DEFAULT 'activities:read,recovery:read,fitness:read,objectives:read',
  "lastUsedAt" DATETIME,
  "expiresAt"  DATETIME,
  "revokedAt"  DATETIME,
  "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  DATETIME NOT NULL,
  CONSTRAINT "ApiKey_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_appUserId_idx" ON "ApiKey"("appUserId");
