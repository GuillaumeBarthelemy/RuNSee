-- AlterTable AppUser : ajout profil personnel + preferences UI
-- Sqlite ne supporte pas `ADD COLUMN IF NOT EXISTS` ni les ADD multiples.
-- On utilise des ALTER TABLE separes ; en cas de re-execution, la migration
-- a deja ete enregistree dans `_prisma_migrations` et ne sera pas rejouee.
ALTER TABLE "AppUser" ADD COLUMN "firstName" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "lastName" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE "AppUser" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris';
ALTER TABLE "AppUser" ADD COLUMN "themePreference" TEXT NOT NULL DEFAULT 'light';
ALTER TABLE "AppUser" ADD COLUMN "unitsPreference" TEXT NOT NULL DEFAULT 'metric';
ALTER TABLE "AppUser" ADD COLUMN "densityPreference" TEXT NOT NULL DEFAULT 'comfort';
