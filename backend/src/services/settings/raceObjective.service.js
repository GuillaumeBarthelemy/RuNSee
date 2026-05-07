import prisma from "../../config/prisma.js";

const STANDARD_RACE_KEYS = {
  "5k": 5000,
  "10k": 10000,
  halfMarathon: 21097.5,
  marathon: 42195,
};
const TERRAIN_TYPES = new Set(["road", "rolling", "technical", "mountain"]);
const PRIORITIES = new Set(["A", "B", "C"]);

function toNullableInteger(value, { min = 0, max = 1_000_000 } = {}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.min(Math.max(numeric, min), max);
}

function toRequiredInteger(value, { min, max }) {
  const safe = toNullableInteger(value, { min, max });

  if (safe === null) {
    const error = new Error(`Valeur numerique attendue entre ${min} et ${max}.`);
    error.httpStatus = 400;
    error.userMessage = error.message;
    throw error;
  }

  return safe;
}

function toDate(value) {
  if (!value) {
    const error = new Error("Date de course requise.");
    error.httpStatus = 400;
    error.userMessage = error.message;
    throw error;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error("Date de course invalide.");
    error.httpStatus = 400;
    error.userMessage = error.message;
    throw error;
  }

  return parsed;
}

function sanitizeName(value) {
  const safe = String(value || "").trim();
  if (!safe || safe.length > 120) {
    const error = new Error("Le nom de la course doit faire entre 1 et 120 caracteres.");
    error.httpStatus = 400;
    error.userMessage = error.message;
    throw error;
  }

  return safe;
}

function resolveDistanceMeters(input = {}) {
  const standardKey = String(input?.standardDistanceKey || "").trim();
  if (standardKey && STANDARD_RACE_KEYS[standardKey]) {
    return Math.round(STANDARD_RACE_KEYS[standardKey]);
  }

  return toRequiredInteger(input?.distanceMeters, { min: 800, max: 200_000 });
}

function sanitizeInput(input = {}) {
  const terrainType = String(input.terrainType || "").trim();
  const priority = String(input.priority || "").trim().toUpperCase();

  return {
    name: sanitizeName(input.name),
    raceDate: toDate(input.raceDate),
    distanceMeters: resolveDistanceMeters(input),
    targetPaceSecondsPerKm: toNullableInteger(input.targetPaceSecondsPerKm, { min: 120, max: 1200 }),
    elevationGainMeters: toNullableInteger(input.elevationGainMeters, { min: 0, max: 30_000 }),
    elevationLossMeters: toNullableInteger(input.elevationLossMeters, { min: 0, max: 30_000 }),
    terrainType: TERRAIN_TYPES.has(terrainType) ? terrainType : null,
    targetDurationSeconds: toNullableInteger(input.targetDurationSeconds, { min: 300, max: 200_000 }),
    longestClimbMeters: toNullableInteger(input.longestClimbMeters, { min: 0, max: 5_000 }),
    longestDescentMeters: toNullableInteger(input.longestDescentMeters, { min: 0, max: 5_000 }),
    priority: PRIORITIES.has(priority) ? priority : null,
    notes: input.notes ? String(input.notes).slice(0, 500) : null,
  };
}

function serializeRaceObjective(record = null) {
  if (!record) return null;

  return {
    id: record.id,
    name: record.name,
    raceDate: record.raceDate,
    distanceMeters: record.distanceMeters,
    targetPaceSecondsPerKm: record.targetPaceSecondsPerKm,
    elevationGainMeters: record.elevationGainMeters,
    elevationLossMeters: record.elevationLossMeters,
    terrainType: record.terrainType,
    targetDurationSeconds: record.targetDurationSeconds,
    longestClimbMeters: record.longestClimbMeters,
    longestDescentMeters: record.longestDescentMeters,
    priority: record.priority,
    notes: record.notes,
    isActive: record.isActive,
    archivedAt: record.archivedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function listRaceObjectives(appUserId) {
  const records = await prisma.userRaceObjective.findMany({
    where: { appUserId },
    orderBy: [
      { isActive: "desc" },
      { raceDate: "asc" },
    ],
    take: 12,
  });

  return {
    races: records.map(serializeRaceObjective),
    activeRace: serializeRaceObjective(records.find((record) => record.isActive && !record.archivedAt) || null),
  };
}

export async function createRaceObjective(appUserId, input = {}) {
  const sanitized = sanitizeInput(input);

  const created = await prisma.$transaction(async (tx) => {
    await tx.userRaceObjective.updateMany({
      where: { appUserId, isActive: true, archivedAt: null },
      data: { isActive: false, archivedAt: new Date() },
    });

    return tx.userRaceObjective.create({
      data: {
        appUserId,
        ...sanitized,
        isActive: true,
      },
    });
  });

  return {
    race: serializeRaceObjective(created),
    ...(await listRaceObjectives(appUserId)),
  };
}

export async function archiveRaceObjective(appUserId, raceId) {
  const safeId = String(raceId || "").trim();

  if (!safeId) {
    const error = new Error("Identifiant de course manquant.");
    error.httpStatus = 400;
    error.userMessage = error.message;
    throw error;
  }

  await prisma.userRaceObjective.updateMany({
    where: { id: safeId, appUserId },
    data: { isActive: false, archivedAt: new Date() },
  });

  return listRaceObjectives(appUserId);
}

export async function reactivateRaceObjective(appUserId, raceId) {
  const safeId = String(raceId || "").trim();

  if (!safeId) {
    const error = new Error("Identifiant de course manquant.");
    error.httpStatus = 400;
    error.userMessage = error.message;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await tx.userRaceObjective.updateMany({
      where: { appUserId, isActive: true, archivedAt: null },
      data: { isActive: false, archivedAt: new Date() },
    });

    await tx.userRaceObjective.updateMany({
      where: { id: safeId, appUserId },
      data: { isActive: true, archivedAt: null },
    });
  });

  return listRaceObjectives(appUserId);
}
