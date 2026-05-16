/* Inspect enrichments content (epoc, recovery, dates). */
import "dotenv/config";
import prisma from "../../src/config/prisma.js";

const conn = await prisma.externalProviderConnection.findFirst({
  where: { providerCode: "garminconnect_unofficial", status: "connected" },
  select: { appUserId: true },
});
if (!conn) { console.log("no conn"); process.exit(0); }
const u = conn.appUserId;

const all = await prisma.activityProviderEnrichment.findMany({
  where: { appUserId: u, providerCode: "garminconnect_unofficial" },
  select: { normalizedJson: true, matchedAt: true, status: true },
});
let withEpoc = 0, withRec = 0, withAet = 0;
const buckets = {};
for (const e of all) {
  let n = {}; try { n = JSON.parse(e.normalizedJson || "{}"); } catch {}
  if (n.epoc != null) withEpoc++;
  if (n.recoveryTime != null) withRec++;
  if (n.aerobicTrainingEffect != null) withAet++;
  const ym = e.matchedAt ? e.matchedAt.toISOString().slice(0, 7) : "?";
  buckets[ym] = (buckets[ym] || 0) + 1;
}
console.log({ total: all.length, withEpoc, withRecoveryTime: withRec, withAerobicTE: withAet });
console.log("Distribution par mois (matchedAt) :");
Object.entries(buckets).sort().forEach(([m, c]) => console.log(" ", m, c));

const sample = await prisma.activityProviderEnrichment.findMany({
  where: { appUserId: u, providerCode: "garminconnect_unofficial" },
  orderBy: { matchedAt: "desc" },
  take: 5,
  select: { matchedAt: true, status: true, normalizedJson: true, activityId: true },
});
console.log("\nTop 5 récents :");
for (const e of sample) {
  let n = {}; try { n = JSON.parse(e.normalizedJson || "{}"); } catch {}
  console.log(" ", {
    matchedAt: e.matchedAt?.toISOString().slice(0, 10),
    activityStart: (n.startTimeLocal || n.startTimeGMT || "").slice(0, 10),
    status: e.status,
    epoc: n.epoc,
    rec: n.recoveryTime,
    aet: n.aerobicTrainingEffect,
    keys: Object.keys(n).length,
  });
}

// Vérifier si l'activité Strava liée tombe dans la fenêtre 30j
const since30 = new Date(Date.now() - 30 * 86400000);
const recent = await prisma.activityProviderEnrichment.count({
  where: { appUserId: u, providerCode: "garminconnect_unofficial", activity: { startDate: { gte: since30 } } },
});
console.log(`\nEnrichments dont l'activité Strava liée est dans les 30 derniers jours: ${recent}`);
await prisma.$disconnect();
