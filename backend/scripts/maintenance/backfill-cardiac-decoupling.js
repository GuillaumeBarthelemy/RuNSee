/**
 * Maintenance script — Recalcule cardiacDecouplingPercent pour toutes les
 * activités existantes qui ont un rawJson exploitable mais pas encore de
 * valeur précalculée.
 *
 * Utilisation :
 *   node scripts/maintenance/backfill-cardiac-decoupling.js
 *
 * Optionnel :
 *   node scripts/maintenance/backfill-cardiac-decoupling.js --user-id=<id> --limit=500
 *
 * Idempotent : ne touche pas aux activités déjà calculées (filtre
 * cardiacDecouplingComputedAt IS NULL).
 */

import "dotenv/config";
import prisma from "../../src/config/prisma.js";
import { backfillCardiacDecoupling } from "../../src/services/cardiacDecoupling.service.js";

function parseArgs() {
  const args = { appUserId: null, limit: 500 };
  for (const raw of process.argv.slice(2)) {
    const m = raw.match(/^--([\w-]+)=(.+)$/);
    if (!m) continue;
    const [, key, value] = m;
    if (key === "user-id") args.appUserId = value;
    if (key === "limit") {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n);
    }
  }
  return args;
}

async function main() {
  const { appUserId, limit } = parseArgs();
  console.log(`[backfill-cardiac-decoupling] Démarrage (user: ${appUserId || "tous"}, batch: ${limit}).`);

  let totalProcessed = 0;
  let totalComputed = 0;
  // Boucle de batchs jusqu'à épuisement
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await backfillCardiacDecoupling({ appUserId, batchSize: limit });
    totalProcessed += result.processed;
    totalComputed += result.computed;
    if (result.processed < limit) break;
    console.log(`[backfill-cardiac-decoupling] Batch terminé (${result.processed} traitées, ${result.computed} calculées). Continue...`);
  }

  console.log(`[backfill-cardiac-decoupling] Terminé : ${totalProcessed} activités traitées, ${totalComputed} avec dérive calculée.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[backfill-cardiac-decoupling] Erreur :", err);
  await prisma.$disconnect();
  process.exit(1);
});
