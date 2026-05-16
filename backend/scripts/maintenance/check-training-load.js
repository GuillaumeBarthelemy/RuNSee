import "dotenv/config";
import prisma from "../../src/config/prisma.js";

const conn = await prisma.externalProviderConnection.findFirst({
  where: { providerCode: "garminconnect_unofficial", status: "connected" },
});
const all = await prisma.activityProviderEnrichment.findMany({
  where: { appUserId: conn.appUserId, providerCode: "garminconnect_unofficial" },
  select: { normalizedJson: true },
});
let withTL = 0, withEpoc = 0, withRec = 0, withStam = 0;
const samples = [];
for (const e of all) {
  let n = {}; try { n = JSON.parse(e.normalizedJson || "{}"); } catch {}
  if (n.activityTrainingLoad != null) withTL++;
  if (n.epoc != null) withEpoc++;
  if (n.recoveryTime != null) withRec++;
  if (n.beginPotentialStamina != null) withStam++;
  if (samples.length < 3 && n.activityTrainingLoad != null) samples.push(n);
}
console.log({ total: all.length, withTrainingLoad: withTL, withEpoc, withRecoveryTime: withRec, withStamina: withStam });
console.log("Samples:");
for (const s of samples) {
  console.log(" ", {
    date: (s.startTimeLocal || "").slice(0, 10),
    trainingLoad: s.activityTrainingLoad,
    trainingEffect: s.trainingEffect,
    aerobicTE: s.aerobicTrainingEffect,
    stamBegin: s.beginPotentialStamina,
    stamEnd: s.endPotentialStamina,
  });
}
await prisma.$disconnect();
