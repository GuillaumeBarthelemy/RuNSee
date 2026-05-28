-- Classification utilisateur des activites (sqlite)
ALTER TABLE "Activity" ADD COLUMN "userSessionType" TEXT;
ALTER TABLE "Activity" ADD COLUMN "userSessionMarkers" TEXT;
ALTER TABLE "Activity" ADD COLUMN "userNotes" TEXT;
ALTER TABLE "Activity" ADD COLUMN "userClassifiedAt" DATETIME;

CREATE INDEX IF NOT EXISTS "Activity_appUserId_userSessionType_idx"
  ON "Activity" ("appUserId", "userSessionType");
