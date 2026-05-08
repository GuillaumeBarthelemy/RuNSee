-- Add non-destructive provider duplicate repair markers and canonical elevation loss.
ALTER TABLE "Activity" ADD COLUMN "isMerged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Activity" ADD COLUMN "mergedIntoActivityId" TEXT;
ALTER TABLE "Activity" ADD COLUMN "mergedAt" TIMESTAMP(3);
ALTER TABLE "Activity" ADD COLUMN "totalElevationLoss" DOUBLE PRECISION;

CREATE INDEX "Activity_appUserId_isMerged_idx" ON "Activity"("appUserId", "isMerged");
CREATE INDEX "Activity_mergedIntoActivityId_idx" ON "Activity"("mergedIntoActivityId");
