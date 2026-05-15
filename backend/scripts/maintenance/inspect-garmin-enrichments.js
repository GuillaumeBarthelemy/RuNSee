// Diagnostic ponctuel : inspecte les enrichments Garmin pour vérifier
// qu'epoc et recoveryTime sont bien présents dans normalizedJson.
import "dotenv/config";
import prisma from "../../src/config/prisma.js";

async function main() {
  const totalCount = await prisma.activityProviderEnrichment.count({
    where: { providerCode: "garminconnect_unofficial" },
  });
  console.log(`TOTAL Garmin enrichments: ${totalCount}`);

  const enrichments = await prisma.activityProviderEnrichment.findMany({
    where: { providerCode: "garminconnect_unofficial" },
    select: { id: true, normalizedJson: true, status: true, providerActivityId: true },
    take: 5,
  });

  for (const e of enrichments) {
    let parsed = {};
    try { parsed = e.normalizedJson ? JSON.parse(e.normalizedJson) : {}; } catch {}
    console.log({
      id: e.id.slice(0, 8),
      status: e.status,
      providerActivityId: e.providerActivityId,
      epoc: parsed.epoc,
      recoveryTime: parsed.recoveryTime,
      aerobicTrainingEffect: parsed.aerobicTrainingEffect,
      vo2max: parsed.vo2max,
      keys: Object.keys(parsed),
    });
  }

  // Count enrichments WITH epoc populated
  const withEpoc = enrichments.filter((e) => {
    try {
      const p = JSON.parse(e.normalizedJson || "{}");
      return p.epoc != null;
    } catch { return false; }
  });
  console.log(`Sample with epoc: ${withEpoc.length}/${enrichments.length}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
