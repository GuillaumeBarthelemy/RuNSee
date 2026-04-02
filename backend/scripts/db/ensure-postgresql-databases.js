import "dotenv/config";
import { Client } from "pg";

function getRequiredUrl(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  if (!value.startsWith("postgresql:") && !value.startsWith("postgres:")) {
    throw new Error(`${name} must point to a PostgreSQL database.`);
  }

  return new URL(value);
}

function getOptionalUrl(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    return null;
  }

  if (!value.startsWith("postgresql:") && !value.startsWith("postgres:")) {
    throw new Error(`${name} must point to a PostgreSQL database.`);
  }

  return new URL(value);
}

function getDatabaseName(url, envName) {
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, "").trim());

  if (!databaseName) {
    throw new Error(`${envName} must include a database name.`);
  }

  if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error(
      `${envName} contains an unsupported database name "${databaseName}".`
    );
  }

  return databaseName;
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, "\"\"")}"`;
}

async function ensureDatabase(client, databaseName) {
  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    databaseName,
  ]);

  if (existing.rowCount > 0) {
    console.log(`Database already present: ${databaseName}`);
    return "existing";
  }

  await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  console.log(`Database created: ${databaseName}`);
  return "created";
}

async function main() {
  const databaseUrl = getRequiredUrl("DATABASE_URL");
  const shadowDatabaseUrl = getOptionalUrl("SHADOW_DATABASE_URL");
  const directUrl = getOptionalUrl("DIRECT_URL") || databaseUrl;
  const adminUrl = new URL(directUrl.toString());

  adminUrl.pathname = "/postgres";
  adminUrl.search = "";
  adminUrl.hash = "";

  const targetDatabases = [
    getDatabaseName(databaseUrl, "DATABASE_URL"),
    ...(shadowDatabaseUrl ? [getDatabaseName(shadowDatabaseUrl, "SHADOW_DATABASE_URL")] : []),
  ];

  const client = new Client({
    connectionString: adminUrl.toString(),
  });

  await client.connect();

  try {
    const results = [];

    for (const databaseName of [...new Set(targetDatabases)]) {
      const status = await ensureDatabase(client, databaseName);
      results.push({ databaseName, status });
    }

    console.log(`POSTGRES_DATABASES_READY ${results.map((item) => item.databaseName).join(", ")}`);
  } finally {
    await client.end();
  }
}

await main();
