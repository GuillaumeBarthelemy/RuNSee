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

function formatStatus(expected, actual) {
  return expected === actual ? "OK" : "MISMATCH";
}

function formatImportAction(dumpCount, postgresCount, truncate) {
  if (truncate) {
    return "TRUNCATE+INSERT";
  }

  if (postgresCount === 0 && dumpCount > 0) {
    return "INSERT";
  }

  if (postgresCount === 0 && dumpCount === 0) {
    return "NOOP";
  }

  return "REFUSED";
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

async function readPostgresCounts(client) {
  const counts = {};

  for (const table of TABLES) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM "${table.name}";`);
    counts[table.name] = Number(result.rows[0]?.count || 0);
  }

  return counts;
}

function printPreflightReport(dumpCounts, postgresCounts, truncate) {
  console.log("Table                         Dump     PostgreSQL before     Action");
  for (const table of TABLES) {
    const dumpCount = dumpCounts[table.name];
    const postgresCount = postgresCounts[table.name] || 0;
    console.log(
      `${table.name.padEnd(30)} ${String(dumpCount).padStart(7)} ${String(postgresCount).padStart(21)}     ${formatImportAction(dumpCount, postgresCount, truncate)}`
    );
  }
}

async function main() {
  const inputPath = resolveInputPath();
  const dump = await loadDump(inputPath);
  const batchSize = Number(getArgValue("--batch-size") || 200);
  const dryRun = hasFlag("--dry-run");
  const truncate = hasFlag("--truncate");
  const allowAppend = hasFlag("--allow-append");

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
    const postgresCountsBefore = await readPostgresCounts(client);
    const targetHasData = Object.values(postgresCountsBefore).some((count) => count > 0);

    printPreflightReport(counts, postgresCountsBefore, truncate);

    if (dryRun) {
      console.log(`POSTGRES_IMPORT_DRY_RUN_OK ${inputPath}`);
      return;
    }

    if (!truncate && !allowAppend && targetHasData) {
      throw new Error(
        "Import refused: target PostgreSQL database is not empty. Use --truncate for a controlled refresh. Incremental merge is not supported."
      );
    }

    if (!truncate && allowAppend && targetHasData) {
      throw new Error(
        "Import refused: --allow-append is only allowed when all target PostgreSQL tables are empty. Incremental merge is not supported."
      );
    }

    if (!truncate && !allowAppend) {
      throw new Error(
        "Refusing PostgreSQL import without --truncate or --allow-append. Incremental merge is not supported."
      );
    }

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

    const importedCounts = {};
    for (const table of TABLES) {
      const result = await client.query(`SELECT COUNT(*)::int AS count FROM "${table.name}";`);
      importedCounts[table.name] = Number(result.rows[0]?.count || 0);
    }

    await client.query("COMMIT");
    console.log(`POSTGRES_IMPORT_OK ${inputPath}`);
    console.log("Table                         Dump     PostgreSQL   Statut");
    for (const table of TABLES) {
      const dumpCount = counts[table.name];
      const postgresCount = importedCounts[table.name];
      console.log(
        `${table.name.padEnd(30)} ${String(dumpCount).padStart(7)} ${String(postgresCount).padStart(12)}   ${formatStatus(dumpCount, postgresCount)}`
      );
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

await main();
