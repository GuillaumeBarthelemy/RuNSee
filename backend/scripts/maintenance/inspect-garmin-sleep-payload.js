/**
 * Diagnostic — Affiche la structure d'un payload sleep Garmin brut
 * pour identifier le chemin réel du sleepScore.
 *
 * Utilisation :
 *   node scripts/maintenance/inspect-garmin-sleep-payload.js
 */

import "dotenv/config";
import prisma from "../../src/config/prisma.js";

const GARMIN_PROVIDER_CODE = "garminconnect_unofficial";

function flattenPaths(obj, prefix = "", depth = 0) {
  if (depth > 6 || !obj || typeof obj !== "object") return [];
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const numericValue = Number(value);
    const isLeafNumber = Number.isFinite(numericValue) && !Array.isArray(value) && typeof value !== "object";
    const isLeafString = typeof value === "string" && value.length < 40;
    const lines = [];
    if (isLeafNumber || isLeafString) {
      lines.push(`  ${path}: ${value}`);
    }
    if (value && typeof value === "object") {
      lines.push(...flattenPaths(value, path, depth + 1));
    }
    return lines;
  });
}

async function main() {
  // Chercher un raw data sleep récent avec un payload non vide
  const rows = await prisma.externalProviderRawData.findMany({
    where: {
      providerCode: GARMIN_PROVIDER_CODE,
      providerResourceId: "sleep",
      status: "success",
    },
    orderBy: { providerDateKey: "desc" },
    take: 3,
    select: { providerDateKey: true, payloadJson: true },
  });

  if (!rows.length) {
    console.log("Aucun raw data sleep Garmin trouvé.");
    await prisma.$disconnect();
    return;
  }

  for (const row of rows) {
    console.log(`\n=== Date: ${row.providerDateKey} ===`);
    let payload;
    try {
      payload = JSON.parse(row.payloadJson);
    } catch {
      console.log("  (payload non parseable)");
      continue;
    }

    if (!payload) {
      console.log("  (payload null)");
      continue;
    }

    console.log("Chemins feuilles (numériques / strings courts) :");
    const paths = flattenPaths(payload);
    paths
      .filter((line) =>
        line.toLowerCase().includes("sleep")
        || line.toLowerCase().includes("score")
        || line.toLowerCase().includes("overall")
        || line.toLowerCase().includes("quality")
        || line.toLowerCase().includes("duration")
        || line.toLowerCase().includes("seconds"),
      )
      .forEach((line) => console.log(line));

    console.log("\nClés de premier niveau :", Object.keys(payload));

    if (payload.dailySleepDTO) {
      console.log("Clés de dailySleepDTO :", Object.keys(payload.dailySleepDTO));
      if (payload.dailySleepDTO.sleepScores) {
        console.log("dailySleepDTO.sleepScores :", JSON.stringify(payload.dailySleepDTO.sleepScores));
      }
    }
    if (payload.sleepScores) {
      console.log("sleepScores (racine) :", JSON.stringify(payload.sleepScores));
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Erreur :", error);
  process.exit(1);
});
