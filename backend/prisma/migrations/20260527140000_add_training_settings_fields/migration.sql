-- Sqlite : ALTER TABLE ADD COLUMN sans IF NOT EXISTS (non supporte sur sqlite),
-- en ALTERs separes (ADD multiple non supporte non plus). Migration deja
-- enregistree dans `_prisma_migrations` : pas de re-execution sur instances
-- en place.
ALTER TABLE "UserTrainingAnalyticsSettings" ADD COLUMN "ftpWatts" INTEGER;
ALTER TABLE "UserTrainingAnalyticsSettings" ADD COLUMN "paceSmoothingMethod" TEXT NOT NULL DEFAULT 'exp30';
ALTER TABLE "UserTrainingAnalyticsSettings" ADD COLUMN "zonesCalculationMethod" TEXT NOT NULL DEFAULT 'custom_hr';
ALTER TABLE "UserTrainingAnalyticsSettings" ADD COLUMN "gapEnabled" BOOLEAN NOT NULL DEFAULT true;
