import "dotenv/config";
import prisma from "../../src/config/prisma.js";

const raw = await prisma.externalProviderRawData.findFirst({
  where: { providerCode: "garminconnect_unofficial", dataType: "activity_detail" },
  orderBy: { syncedAt: "desc" },
  select: { payloadJson: true, providerDateKey: true },
});
if (!raw) { console.log("no raw"); process.exit(0); }
const data = JSON.parse(raw.payloadJson);
const keys = Object.keys(data);
const epocKeys = keys.filter((k) => /epoc|recover|firstbeat|aerobic|anaerobic|excessOxygen|VO2|training/i.test(k));
console.log("Date:", raw.providerDateKey);
console.log("Nb keys total:", keys.length);
console.log("Keys EPOC/recovery/aerobic/training :");
for (const k of epocKeys) console.log(" ", k, "=", JSON.stringify(data[k]).slice(0, 80));
await prisma.$disconnect();
