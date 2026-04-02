import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { TABLES } from "./tableDefinitions.js";

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

function resolveInputPath() {
  const requested = getArgValue("--input") || getPositionalArgs()[0] || "";

  if (!requested) {
    throw new Error("db:import:postgres requires --input <path-to-export.json>.");
  }

  return path.resolve(process.cwd(), requested);
}

function chunkRows(rows, size) {
  const chunks = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function normalizeValue(column, row, dateTimeColumns) {
  const value = row[column];

  if (value === undefined || value === null) {
    return null;
  }

  if (dateTimeColumns.includes(column)) {
    return new Date(value);
  }

  return value;
}

function buildInsertStatement(table, rows) {
  const values = [];
  const valueGroups = rows.map((row) => {
    const placeholders = table.columns.map((column) => {
      values.push(normalizeValue(column, row, table.dateTimeColumns));
      return `$${values.length}`;
    });

    return `(${placeholders.join(", ")})`;
  });

  const columns = table.columns.map((column) => `"${column}"`).join(", ");
  const text = `INSERT INTO "${table.name}" (${columns}) VALUES ${valueGroups.join(", ")};`;

  return { text, values };
}

async function loadDump(inputPath) {
  const raw = await fs.readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed?.tables || typeof parsed.tables !== "object") {
    throw new Error("Invalid dump file: missing tables object.");
  }

  return parsed;
}

async function main() {
  const inputPath = resolveInputPath();
  const dump = await loadDump(inputPath);
  const batchSize = Number(getArgValue("--batch-size") || 200);
  const dryRun = hasFlag("--dry-run");
  const truncate = hasFlag("--truncate");

  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error("--batch-size must be a positive integer.");
  }

  const counts = {};

  for (const table of TABLES) {
    const rows = dump.tables[table.name];

    if (!Array.isArray(rows)) {
      throw new Error(`Invalid dump file: table ${table.name} is missing or not an array.`);
    }

    counts[table.name] = rows.length;
  }

  if (dryRun) {
    console.log(`POSTGRES_IMPORT_DRY_RUN_OK ${inputPath}`);
    for (const [tableName, count] of Object.entries(counts)) {
      console.log(`${tableName}: ${count}`);
    }
    return;
  }

  const databaseUrl = String(process.env.DATABASE_URL || "");

  if (!databaseUrl.startsWith("postgresql:") && !databaseUrl.startsWith("postgres:")) {
    throw new Error(
      "db:import:postgres requires DATABASE_URL to point to a PostgreSQL database."
    );
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    if (truncate) {
      const tableNames = TABLES.map((table) => `"${table.name}"`).join(", ");
      await client.query(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
    }

    for (const table of TABLES) {
      const rows = dump.tables[table.name];

      for (const batch of chunkRows(rows, batchSize)) {
        if (!batch.length) {
          continue;
        }

        const statement = buildInsertStatement(table, batch);
        await client.query(statement.text, statement.values);
      }

      console.log(`Imported ${rows.length} rows into ${table.name}.`);
    }

    await client.query("COMMIT");
    console.log(`POSTGRES_IMPORT_OK ${inputPath}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

await main();
