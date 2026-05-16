import "dotenv/config";
import prisma from "../../src/config/prisma.js";

const conn = await prisma.externalProviderConnection.findFirst({
  where: { providerCode: "garminconnect_unofficial", status: "connected" },
});
const u = conn.appUserId;
for (const days of [30, 90]) {
  const since = new Date(Date.now() - days * 86400000);
  const en = await prisma.activityProviderEnrichment.findMany({
    where: { appUserId: u, providerCode: "garminconnect_unofficial", activity: { startDate: { gte: since } } },
    select: { normalizedJson: true },
  });
  const withTL = en.filter((e) => {
    try { return JSON.parse(e.normalizedJson || "{}").activityTrainingLoad != null; }
    catch { return false; }
  }).length;
  console.log(`${days}j : ${en.length} enrichments, ${withTL} avec Training Load`);
}
await prisma.$disconnect();
