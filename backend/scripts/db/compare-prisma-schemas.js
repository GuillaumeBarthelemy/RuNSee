import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SQLITE_SCHEMA = path.join(ROOT, "prisma", "schema.prisma");
const POSTGRES_SCHEMA = path.join(ROOT, "prisma-postgresql", "schema.prisma");

function readSchema(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractModels(schemaText) {
  const models = new Map();
  const modelRegex = /model\s+(\w+)\s+\{([\s\S]*?)\n\}/g;
  let match;

  while ((match = modelRegex.exec(schemaText)) !== null) {
    const [, modelName, body] = match;
    const fields = [];
    const blockAttributes = [];

    body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith("//"))
      .forEach((line) => {
        if (line.startsWith("@@")) {
          blockAttributes.push(normalizeWhitespace(line));
          return;
        }

        const fieldName = line.split(/\s+/)[0];
        fields.push([fieldName, normalizeWhitespace(line)]);
      });

    models.set(modelName, {
      fields: new Map(fields),
      blockAttributes: new Set(blockAttributes),
    });
  }

  return models;
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function collectDiffs(left, right, leftLabel, rightLabel) {
  const diffs = [];

  for (const [modelName, leftModel] of left.entries()) {
    const rightModel = right.get(modelName);
    if (!rightModel) {
      diffs.push(`${rightLabel} is missing model ${modelName}`);
      continue;
    }

    for (const [fieldName, leftField] of leftModel.fields.entries()) {
      const rightField = rightModel.fields.get(fieldName);
      if (!rightField) {
        diffs.push(`${rightLabel}.${modelName} is missing field ${fieldName}`);
      } else if (leftField !== rightField) {
        diffs.push(
          `${modelName}.${fieldName} differs:\n  ${leftLabel}: ${leftField}\n  ${rightLabel}: ${rightField}`
        );
      }
    }

    for (const attribute of leftModel.blockAttributes) {
      if (!rightModel.blockAttributes.has(attribute)) {
        diffs.push(`${rightLabel}.${modelName} is missing attribute ${attribute}`);
      }
    }
  }

  return diffs;
}

function main() {
  const sqliteModels = extractModels(readSchema(SQLITE_SCHEMA));
  const postgresModels = extractModels(readSchema(POSTGRES_SCHEMA));

  const diffs = [
    ...collectDiffs(sqliteModels, postgresModels, "sqlite", "postgresql"),
    ...collectDiffs(postgresModels, sqliteModels, "postgresql", "sqlite"),
  ];

  if (diffs.length > 0) {
    console.error("Prisma schema drift detected between SQLite and PostgreSQL:");
    diffs.forEach((diff) => console.error(`- ${diff}`));
    process.exit(1);
  }

  console.log(`Prisma schemas are aligned (${sqliteModels.size} models compared).`);
}

main();
