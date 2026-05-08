import "dotenv/config";
import prisma from "../../src/config/prisma.js";
import { detectProviderActivityDuplicates } from "../../src/services/providers/providerActivityDuplicateDetection.service.js";

function hasFlag(name) {
  return process.argv.includes(name);
}

function getArgValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const minScore = Math.max(0, Number(getArgValue("--min-score", "70")) || 70);
  const appUserId = getArgValue("--app-user-id", "");
  const result = await detectProviderActivityDuplicates({ appUserId, minScore });

  const payload = {
    dryRun: !hasFlag("--apply"),
    ...result,
  };

  console.log(JSON.stringify(payload, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      status: "error",
      message: error.message,
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
