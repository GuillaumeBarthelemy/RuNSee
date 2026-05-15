/**
 * Maintenance script — Déclenche l'enrichissement Garmin pour tous les
 * utilisateurs ayant une connexion Garmin active.
 *
 * Utilité : peupler ActivityProviderEnrichment pour les utilisateurs qui
 * n'ont pas encore reçu d'enrichissement automatique via la sync globale.
 *
 * Usage :
 *   node scripts/maintenance/trigger-garmin-enrichment.js [--days=30] [--user-id=<id>]
 *
 * Idempotent : mode "recent_missing" ne ré-enrichit pas les activités déjà
 * matchées (sauf si --force).
 */

import "dotenv/config";
import prisma from "../../src/config/prisma.js";
import { enrichGarminActivitiesForUser } from "../../src/services/providers/garminActivityEnrichment.service.js";
import { EXTERNAL_PROVIDER_CODES } from "../../src/services/providers/externalProvider.constants.js";
import { EXTERNAL_PROVIDER_STATUSES } from "../../src/services/providers/externalProviderConnection.service.js";

function parseArgs() {
  const args = { days: 30, appUserId: null, force: false };
  for (const raw of process.argv.slice(2)) {
    const m = raw.match(/^--([\w-]+)(?:=(.+))?$/);
    if (!m) continue;
    const [, key, value] = m;
    if (key === "days") {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) args.days = Math.floor(n);
    } else if (key === "user-id") {
      args.appUserId = value;
    } else if (key === "force") {
      args.force = true;
    }
  }
  return args;
}

async function main() {
  const { days, appUserId, force } = parseArgs();
  console.log(`[trigger-garmin-enrichment] Démarrage (user: ${appUserId || "tous"}, days: ${days}, force: ${force}).`);

  const where = {
    providerCode: EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL,
    status: EXTERNAL_PROVIDER_STATUSES.CONNECTED,
  };
  if (appUserId) where.appUserId = appUserId;

  const connections = await prisma.externalProviderConnection.findMany({
    where,
    select: { id: true, appUserId: true, status: true },
  });

  if (connections.length === 0) {
    console.log("[trigger-garmin-enrichment] Aucune connexion Garmin active trouvée.");
    await prisma.$disconnect();
    return;
  }

  console.log(`[trigger-garmin-enrichment] ${connections.length} connexion(s) Garmin active(s).`);

  let totalOk = 0;
  let totalFail = 0;
  for (const conn of connections) {
    try {
      const result = await enrichGarminActivitiesForUser(conn.appUserId, {
        mode: "recent_missing",
        days,
        triggerSource: "maintenance_script",
        allowGarminOnly: true,
        force,
      });
      console.log(`  user ${conn.appUserId.slice(0, 8)} : fetched=${result.fetchedCount}, matched=${result.matchedCount}, enrichments=${result.enrichmentUpsertedCount}`);
      totalOk += 1;
    } catch (err) {
      console.error(`  user ${conn.appUserId.slice(0, 8)} : ÉCHEC — ${err.message || err}`);
      totalFail += 1;
    }
  }

  console.log(`[trigger-garmin-enrichment] Terminé : ${totalOk} succès, ${totalFail} échec(s).`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[trigger-garmin-enrichment] Erreur fatale :", err);
  await prisma.$disconnect();
  process.exit(1);
});
