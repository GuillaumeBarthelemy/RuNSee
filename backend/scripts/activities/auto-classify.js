/* eslint-env node */
/**
 * Auto-classification best-effort des activites historiques.
 *
 * Usage :
 *   node backend/scripts/activities/auto-classify.js [--dry-run]
 *
 * Pour chaque activite sans userSessionType, applique suggestSessionType
 * (heuristiques zones FC / duree / distance / D+ / workoutType Strava) en
 * utilisant la FC max active de l'utilisateur.
 *
 * IMPORTANT : userClassifiedAt reste NULL => l'UI affiche un badge "auto"
 * incitant l'utilisateur a confirmer. On ne marque jamais une suggestion
 * comme confirmee.
 *
 * Idempotent : ne touche que les activites ou userSessionType IS NULL.
 */

import "dotenv/config";
import prisma from "../../src/config/prisma.js";
import { suggestSessionType } from "../../src/services/activities/activityClassification.service.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  // FC max active par utilisateur (pour les heuristiques basees FC).
  const settings = await prisma.userTrainingAnalyticsSettings.findMany({
    where: { isActive: true },
    select: { appUserId: true, heartRateMax: true },
  });
  const fcMaxByUser = new Map(
    settings
      .filter((s) => s.heartRateMax)
      .map((s) => [s.appUserId, s.heartRateMax]),
  );

  // Fallback : si pas de FC max configuree, on estime depuis le pic FC
  // observe sur les activites du user (max des maxHeartrate). Permet aux
  // heuristiques FC de fonctionner pour le backfill historique.
  const peaks = await prisma.activity.groupBy({
    by: ["appUserId"],
    _max: { maxHeartrate: true },
  });
  for (const p of peaks) {
    if (!fcMaxByUser.has(p.appUserId) && p._max.maxHeartrate) {
      fcMaxByUser.set(p.appUserId, Math.round(p._max.maxHeartrate));
    }
  }

  const activities = await prisma.activity.findMany({
    where: { userSessionType: null },
    select: {
      id: true,
      appUserId: true,
      movingTime: true,
      distance: true,
      totalElevationGain: true,
      averageHeartrate: true,
      maxHeartrate: true,
      workoutType: true,
    },
  });

  console.info(`[auto-classify] ${activities.length} activite(s) sans type${DRY_RUN ? " (dry-run)" : ""}`);

  const counts = {};
  let updated = 0;
  let skipped = 0;

  for (const a of activities) {
    const fcMax = fcMaxByUser.get(a.appUserId) || 0;
    const suggestion = suggestSessionType(a, { fcMax });
    if (!suggestion) {
      skipped += 1;
      continue;
    }
    counts[suggestion] = (counts[suggestion] || 0) + 1;
    if (!DRY_RUN) {
      await prisma.activity.update({
        where: { id: a.id },
        data: { userSessionType: suggestion }, // userClassifiedAt reste NULL
      });
    }
    updated += 1;
  }

  console.info(`[auto-classify] ${updated} classifiee(s), ${skipped} ignoree(s)`);
  console.info("[auto-classify] repartition :", JSON.stringify(counts, null, 2));
  if (DRY_RUN) console.info("[auto-classify] DRY-RUN : aucune ecriture effectuee.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[auto-classify] erreur fatale", err);
  process.exit(1);
});
