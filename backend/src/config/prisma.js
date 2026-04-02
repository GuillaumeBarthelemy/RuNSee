import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set.");
}

const globalForPrisma = globalThis;

async function loadPrismaClientModule(url) {
  if (url.startsWith("file:")) {
    return import("@prisma/client");
  }

  if (url.startsWith("postgresql:") || url.startsWith("postgres:")) {
    try {
      return import("../../generated/postgresql-client/index.js");
    } catch (error) {
      const finalError = new Error(
        "DATABASE_URL pointe vers PostgreSQL, mais le client Prisma PostgreSQL n'a pas ete genere."
      );
      finalError.cause = error;
      throw finalError;
    }
  }

  throw new Error("Unsupported DATABASE_URL protocol. Expected file:, postgres:, or postgresql:.");
}

async function createAdapter(url) {
  if (url.startsWith("file:")) {
    return new PrismaBetterSqlite3({ url });
  }

  if (url.startsWith("postgresql:") || url.startsWith("postgres:")) {
    try {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      return new PrismaPg({ connectionString: url });
    } catch (error) {
      const finalError = new Error(
        "DATABASE_URL pointe vers PostgreSQL, mais @prisma/adapter-pg n'est pas installe."
      );
      finalError.cause = error;
      throw finalError;
    }
  }
 
  throw new Error("Unsupported DATABASE_URL protocol. Expected file:, postgres:, or postgresql:.");
}

const [{ PrismaClient }, adapter] = await Promise.all([
  loadPrismaClientModule(databaseUrl),
  createAdapter(databaseUrl),
]);
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
