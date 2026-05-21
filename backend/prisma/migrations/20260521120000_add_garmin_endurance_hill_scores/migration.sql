-- Ajoute Garmin Endurance Score + Hill Score sur ExternalDailyFitnessSnapshot.
-- Source : Firstbeat via API non-officielle (garminconnect lib).
ALTER TABLE "ExternalDailyFitnessSnapshot" ADD COLUMN "enduranceScore" INTEGER;
ALTER TABLE "ExternalDailyFitnessSnapshot" ADD COLUMN "enduranceScoreLevel" TEXT;
ALTER TABLE "ExternalDailyFitnessSnapshot" ADD COLUMN "hillScore" INTEGER;
ALTER TABLE "ExternalDailyFitnessSnapshot" ADD COLUMN "hillScoreLevel" TEXT;
