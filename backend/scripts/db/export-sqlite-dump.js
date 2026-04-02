import fs from "node:fs/promises";
import path from "node:path";
import prisma from "../../src/config/prisma.js";
import { TABLES, createSelect } from "./tableDefinitions.js";

function getArgValue(flagName) {
  const index = process.argv.indexOf(flagName);
  return index >= 0 ? process.argv[index + 1] : "";
}

function getPositionalArgs() {
  return process.argv.slice(2).filter((value) => !value.startsWith("--"));
}

function hasFlag(flagName) {
  return process.argv.includes(flagName);
}

function resolveOutputPath() {
  const requested = getArgValue("--output") || getPositionalArgs()[0] || "";

  if (requested) {
    return path.resolve(process.cwd(), requested);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve(process.cwd(), ".tmp", `sqlite-export-${timestamp}.json`);
}

async function main() {
  const databaseUrl = String(process.env.DATABASE_URL || "");

  if (!databaseUrl.startsWith("file:")) {
    throw new Error("db:export:sqlite requires DATABASE_URL to point to a SQLite database (file:...).");
  }

  const outputPath = resolveOutputPath();
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const tables = {};
  const counts = {};

  for (const table of TABLES) {
    const rows = await prisma[table.model].findMany({
      orderBy: table.orderBy,
      select: createSelect(table.columns),
    });

    tables[table.name] = rows;
    counts[table.name] = rows.length;
  }

  const dump = {
    meta: {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      source: {
        provider: "sqlite",
        databaseUrlProtocol: "file",
      },
      tables: counts,
    },
    tables,
  };

  const spacing = hasFlag("--compact") ? 0 : 2;
  await fs.writeFile(outputPath, JSON.stringify(dump, null, spacing), "utf8");

  console.log(`SQLITE_EXPORT_OK ${outputPath}`);
  for (const [tableName, count] of Object.entries(counts)) {
    console.log(`${tableName}: ${count}`);
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
