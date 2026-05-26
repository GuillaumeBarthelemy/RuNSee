-- AlterTable AppUser : ajout profil personnel + preferences UI
ALTER TABLE "AppUser"
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName" TEXT,
  ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
  ADD COLUMN IF NOT EXISTS "themePreference" TEXT NOT NULL DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS "unitsPreference" TEXT NOT NULL DEFAULT 'metric',
  ADD COLUMN IF NOT EXISTS "densityPreference" TEXT NOT NULL DEFAULT 'comfort';
