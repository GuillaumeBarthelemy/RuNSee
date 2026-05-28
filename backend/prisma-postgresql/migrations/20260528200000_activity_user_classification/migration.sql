-- Classification utilisateur des activites (postgresql)
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "userSessionType" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "userSessionMarkers" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "userNotes" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "userClassifiedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Activity_appUserId_userSessionType_idx"
  ON "Activity" ("appUserId", "userSessionType");

-- CHECK constraint defense en profondeur (12 types canoniques + autre)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Activity_userSessionType_check'
  ) THEN
    ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userSessionType_check"
      CHECK (
        "userSessionType" IS NULL
        OR "userSessionType" IN (
          'endurance_fond', 'sortie_longue', 'recuperation',
          'tempo', 'seuil',
          'vma_courte', 'vma_longue',
          'fartlek', 'cote',
          'competition', 'test',
          'decouverte', 'autre'
        )
      );
  END IF;
END $$;
