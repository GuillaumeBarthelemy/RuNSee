/**
 * Diagnostic ponctuel — répond à 2 questions :
 *
 *  Q1. Dérive cardiaque : combien d'activités candidates sur 90 j vs combien
 *      avec cardiacDecouplingPercent non-null ?
 *  Q2. EPOC Garmin : combien d'activités Strava `running` sur 30 j vs
 *      combien de raw Garmin sur la même période, et quel est l'écart
 *      temporel typique entre une Garmin et la Strava la plus proche ?
 *
 * Usage :
 *   node scripts/maintenance/diagnose-overview-data.js [--user-id=<id>] [--days=30]
 */
import "dotenv/config";
import prisma from "../../src/config/prisma.js";

function parseArgs() {
  const args = { appUserId: null, days: 30 };
  for (const raw of process.argv.slice(2)) {
    const m = raw.match(/^--([\w-]+)(?:=(.+))?$/);
    if (!m) continue;
    const [, k, v] = m;
    if (k === "user-id") args.appUserId = v;
    else if (k === "days") args.days = Math.max(1, Number(v) || 30);
  }
  return args;
}

function dayKeyUtc(d) {
  return new Date(d).toISOString().slice(0, 10);
}

async function pickUser(appUserId) {
  if (appUserId) return appUserId;
  const conn = await prisma.externalProviderConnection.findFirst({
    where: { providerCode: "garminconnect_unofficial", status: "connected" },
    select: { appUserId: true },
  });
  return conn?.appUserId || null;
}

async function main() {
  const { appUserId: askedUser, days } = parseArgs();
  const appUserId = await pickUser(askedUser);
  if (!appUserId) {
    console.log("Aucun user avec connexion Garmin connectée. Passe --user-id=<id>.");
    await prisma.$disconnect();
    return;
  }
  console.log(`User: ${appUserId.slice(0, 8)}…  Fenêtre: ${days} j`);

  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const since90 = new Date(Date.now() - 90 * 24 * 3600 * 1000);

  // === Q1. Dérive cardiaque ===
  const total90 = await prisma.activity.count({
    where: { appUserId, startDate: { gte: since90 }, isMerged: false },
  });
  const withDecoupling = await prisma.activity.count({
    where: {
      appUserId,
      startDate: { gte: since90 },
      isMerged: false,
      cardiacDecouplingPercent: { not: null },
    },
  });
  const eligibleDuration = await prisma.activity.count({
    where: {
      appUserId,
      startDate: { gte: since90 },
      isMerged: false,
      movingTime: { gte: 20 * 60 },
    },
  });
  console.log("\n--- Q1 Dérive cardiaque (90 j) ---");
  console.log(`  Total activités          : ${total90}`);
  console.log(`  Durée ≥ 20 min            : ${eligibleDuration}`);
  console.log(`  Avec cardiacDecoupling   : ${withDecoupling}`);

  // === Q2. EPOC matching diagnostic ===
  const stravaList = await prisma.activity.findMany({
    where: {
      appUserId,
      sourceProvider: "strava",
      isMerged: false,
      startDate: { gte: since },
    },
    select: { id: true, stravaActivityId: true, startDate: true, type: true, distance: true, movingTime: true },
    orderBy: { startDate: "asc" },
  });
  const stravaRunning = stravaList.filter((a) =>
    String(a.type || "").toLowerCase().includes("run"),
  );

  const garminRaw = await prisma.externalProviderRawData.findMany({
    where: {
      appUserId,
      providerCode: "garminconnect_unofficial",
      dataType: "activity_detail",
      syncedAt: { gte: since },
    },
    select: { providerDateKey: true, providerResourceId: true, payloadJson: true },
    orderBy: { providerDateKey: "asc" },
  });

  console.log(`\n--- Q2 EPOC matching (${days} j) ---`);
  console.log(`  Strava activities total  : ${stravaList.length}`);
  console.log(`  Strava type=running      : ${stravaRunning.length}`);
  console.log(`  Garmin raw activities    : ${garminRaw.length}`);

  // Pour les 5 premières Garmin, trouver la Strava la plus proche en temps
  console.log("\n  Top 5 Garmin -> plus proche Strava :");
  const sample = garminRaw.slice(0, 5);
  for (const g of sample) {
    let payload = {};
    try { payload = JSON.parse(g.payloadJson || "{}"); } catch {}
    const garminStart = payload.startTimeLocal || payload.startTimeGMT || payload.startTimeGmt;
    const garminDate = garminStart ? new Date(garminStart) : null;
    const type = payload.activityType?.typeKey || payload.activityType || "?";
    let closest = null;
    let minDelta = Infinity;
    if (garminDate) {
      for (const s of stravaList) {
        const delta = Math.abs(s.startDate.getTime() - garminDate.getTime());
        if (delta < minDelta) { minDelta = delta; closest = s; }
      }
    }
    console.log(`    [${dayKeyUtc(garminStart)}] type=${type} | closest Strava: ${closest ? `Δ=${Math.round(minDelta/1000)}s type=${closest.type}` : "—"}`);
  }

  // Enrichments existants (déjà matchés)
  const enrichments = await prisma.activityProviderEnrichment.count({
    where: { appUserId, providerCode: "garminconnect_unofficial" },
  });
  console.log(`\n  Enrichments en DB        : ${enrichments}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
