import "dotenv/config";
import prisma from "../../src/config/prisma.js";

const conn = await prisma.externalProviderConnection.findFirst({
  where: { providerCode: "garminconnect_unofficial", status: "connected" },
});
if (!conn) { console.log("no conn"); process.exit(0); }
const u = conn.appUserId;

const total = await prisma.externalDailyRecoverySnapshot.count({
  where: { appUserId: u },
});
console.log("Total snapshots:", total);

const since30 = new Date(Date.now() - 30 * 86400000);
const recent = await prisma.externalDailyRecoverySnapshot.count({
  where: { appUserId: u, snapshotDate: { gte: since30 } },
});
console.log("Snapshots last 30 days:", recent);

const sample = await prisma.externalDailyRecoverySnapshot.findMany({
  where: { appUserId: u },
  orderBy: { snapshotDate: "desc" },
  take: 5,
  select: {
    snapshotDate: true,
    sleepDurationSeconds: true,
    hrvAvgMs: true,
    restingHr: true,
    stressAvg: true,
    bodyBatteryMax: true,
    trainingReadinessScore: true,
    dataQuality: true,
  },
});
console.log("Top 5 récents :");
for (const s of sample) {
  console.log(" ", {
    date: s.snapshotDate?.toISOString().slice(0, 10),
    sleepH: s.sleepDurationSeconds ? Math.round(s.sleepDurationSeconds / 3600 * 10) / 10 : null,
    hrv: s.hrvAvgMs,
    rhr: s.restingHr,
    stress: s.stressAvg,
    battery: s.bodyBatteryMax,
    readiness: s.trainingReadinessScore,
    q: s.dataQuality,
  });
}
await prisma.$disconnect();
