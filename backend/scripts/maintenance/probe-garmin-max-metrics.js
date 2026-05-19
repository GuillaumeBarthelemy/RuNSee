/**
 * Probe ponctuelle : appelle directement le bridge `fetch_fitness_days`
 * pour 1 jour et imprime le payload brut afin de comprendre la shape
 * Garmin reelle vs ce que `extractFitnessSnapshotFromPayload` attend.
 */
import "dotenv/config";
import prisma from "../../src/config/prisma.js";
import { decryptProviderSessionPayload } from "../../src/services/providers/providerSessionCrypto.service.js";
import { fetchGarminFitnessDays } from "../../src/services/providers/garminconnectBridge.service.js";

const conn = await prisma.externalProviderConnection.findFirst({
  where: { providerCode: "garminconnect_unofficial", status: "connected" },
});
if (!conn) { console.log("no conn"); process.exit(0); }
const session = decryptProviderSessionPayload(conn.encryptedSession, { parseJson: true });

const today = new Date();
const todayKey = today.toISOString().slice(0, 10);
const yesterday = new Date(today.getTime() - 86400000);
const yesterdayKey = yesterday.toISOString().slice(0, 10);

const result = await fetchGarminFitnessDays({
  session,
  dates: [todayKey, yesterdayKey],
});

console.log("status:", result.status);
for (const day of (result.days || [])) {
  console.log(`\n--- ${day.date} ---`);
  console.log("errors:", day.errors);
  console.log("raw shape (top keys):", day.raw ? Object.keys(day.raw) : "null");
  console.log("raw payload (truncated):");
  console.log(JSON.stringify(day.raw, null, 2).slice(0, 2000));
}
await prisma.$disconnect();
