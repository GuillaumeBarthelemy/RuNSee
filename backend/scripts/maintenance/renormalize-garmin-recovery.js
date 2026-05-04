/**
 * Maintenance script — Re-normalise les ExternalDailyRecoverySnapshot Garmin
 * à partir des ExternalProviderRawData déjà stockés, sans rappel Garmin.
 *
 * Utilisation :
 *   node scripts/maintenance/renormalize-garmin-recovery.js
 *
 * Exécuté dans le conteneur backend via le workflow GitHub Actions
 * maintenance-renormalize-garmin.yml.
 */

import "dotenv/config";
import prisma from "../../src/config/prisma.js";
import { renormalizeGarminRecoverySnapshotsForUser } from "../../src/services/providers/garminRecoveryBackfill.service.js";

const GARMIN_PROVIDER_CODE = "garminconnect_unofficial";

async function main() {
  console.log("[renormalize-garmin] Démarrage de la re-normalisation...");

  const userIds = await prisma.externalProviderRawData.findMany({
    where: { providerCode: GARMIN_PROVIDER_CODE },
    select: { appUserId: true },
    distinct: ["appUserId"],
  });

  if (!userIds.length) {
    console.log("[renormalize-garmin] Aucun raw data Garmin trouvé. Rien à faire.");
    await prisma.$disconnect();
    return;
  }

  console.log(`[renormalize-garmin] ${userIds.length} utilisateur(s) avec des données Garmin.`);

  let totalProcessed = 0;
  let totalUpdated = 0;

  for (const { appUserId } of userIds) {
    try {
      const { processedDays, updatedDays } = await renormalizeGarminRecoverySnapshotsForUser(appUserId);
      console.log(`[renormalize-garmin] user=${appUserId} → ${processedDays} jour(s) traité(s), ${updatedDays} snapshot(s) mis à jour`);
      totalProcessed += processedDays;
      totalUpdated += updatedDays;
    } catch (error) {
      console.error(`[renormalize-garmin] Erreur pour user=${appUserId}:`, error.message);
    }
  }

  console.log(`[renormalize-garmin] Terminé. Total : ${totalProcessed} jour(s), ${totalUpdated} snapshot(s) mis à jour.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("[renormalize-garmin] Erreur fatale :", error);
  process.exit(1);
});
