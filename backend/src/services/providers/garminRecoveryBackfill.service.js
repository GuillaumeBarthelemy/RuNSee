import { createHash } from "node:crypto";
import prisma from "../../config/prisma.js";
import env from "../../config/env.js";
import {
  EXTERNAL_PROVIDER_CODES,
  EXTERNAL_PROVIDER_DATA_QUALITIES,
  EXTERNAL_PROVIDER_DATA_TYPES,
  EXTERNAL_PROVIDER_STATUSES,
} from "./externalProvider.constants.js";
import {
  buildExternalProviderConnectionSummary,
  findExternalProviderConnectionForUser,
  upsertExternalProviderConnectionState,
} from "./externalProviderConnection.service.js";
import { fetchGarminRecoveryDays } from "./garminconnectBridge.service.js";
import { sanitizeError } from "./loggerSanitization.js";
import { decryptProviderSessionPayload } from "./providerSessionCrypto.service.js";

const GARMIN_PROVIDER_CODE = EXTERNAL_PROVIDER_CODES.GARMINCONNECT_UNOFFICIAL;
const runningBackfills = new Map();

const RAW_SOURCE_TYPES = Object.freeze({
  userSummary: EXTERNAL_PROVIDER_DATA_TYPES.DAILY_SUMMARY,
  heartRates: EXTERNAL_PROVIDER_DATA_TYPES.DAILY_HEART_RATE,
  sleep: EXTERNAL_PROVIDER_DATA_TYPES.SLEEP,
  hrv: EXTERNAL_PROVIDER_DATA_TYPES.HRV,
  stress: EXTERNAL_PROVIDER_DATA_TYPES.STRESS,
  bodyBattery: EXTERNAL_PROVIDER_DATA_TYPES.BODY_BATTERY,
});

function buildHttpError(message, userMessage, httpStatus = 400) {
  const error = new Error(message);
  error.httpStatus = httpStatus;
  error.userMessage = userMessage;
  return error;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRoundedNumber(value, decimals = 1) {
  const numericValue = toNumber(value);

  if (numericValue === null) {
    return null;
  }

  const multiplier = 10 ** decimals;
  return Math.round(numericValue * multiplier) / multiplier;
}

function toInteger(value) {
  const numericValue = toNumber(value);
  return numericValue === null ? null : Math.round(numericValue);
}

function normalizeDateKey(value) {
  return String(value || "").trim().slice(0, 10);
}

function buildUtcDate(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function buildRecoveryDateKeys() {
  const today = buildUtcDate(formatDateKey(new Date()));
  const totalDays = Number(env.garminconnectRecoveryWindowDays || 180);

  return Array.from({ length: totalDays }, (_, index) => formatDateKey(addDays(today, -index)));
}

function buildRecentRecoveryDateKeys() {
  const today = buildUtcDate(formatDateKey(new Date()));
  const totalDays = Number(env.garminconnectRecentSyncDays || 4);

  return Array.from({ length: totalDays }, (_, index) => formatDateKey(addDays(today, -index)));
}

function buildRecoverySnapshotWindow(days) {
  const safeDays = Math.min(180, Math.max(1, Number(days || 56)));
  const endDate = buildUtcDate(formatDateKey(new Date()));
  const startDate = addDays(endDate, -(safeDays - 1));

  return {
    days: safeDays,
    startDate,
    endDate,
  };
}

function safeParseJson(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

function stringifyPayload(value) {
  return JSON.stringify(value ?? null);
}

function hashPayload(value) {
  return createHash("sha256").update(stringifyPayload(value)).digest("hex");
}

function walkObject(value, callback, path = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkObject(item, callback, [...path, String(index)]));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  Object.entries(value).forEach(([key, item]) => {
    callback(key, item, path);
    walkObject(item, callback, [...path, key]);
  });
}

// Cherche dans `value` la premiere occurrence d'une cle dont le nom matche
// `keys` (insensible a la casse), en parcourant l'objet en profondeur.
//
// Option `predicate(numericValue) => boolean` : si fournie, ne retient un
// match que si la valeur numerique trouvee passe le predicat. Sert a ignorer
// les placeholders Garmin (0, valeurs aberrantes) qui peuvent apparaitre
// dans des sous-sections du payload avant la vraie valeur.
function findFirstNumberByKeys(value, keys, options = {}) {
  const predicate = typeof options.predicate === "function" ? options.predicate : null;
  let result = null;
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));

  walkObject(value, (key, item) => {
    if (result !== null) {
      return;
    }

    if (!normalizedKeys.has(String(key || "").toLowerCase())) {
      return;
    }

    const candidate = toNumber(item);
    if (candidate === null) {
      return;
    }

    if (predicate && !predicate(candidate)) {
      return;
    }

    result = candidate;
  });

  return result;
}

function findFirstStringByKeys(value, keys) {
  let result = "";
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));

  walkObject(value, (key, item) => {
    if (result) {
      return;
    }

    if (!normalizedKeys.has(String(key || "").toLowerCase())) {
      return;
    }

    const candidate = String(item || "").trim();
    if (candidate) {
      result = candidate;
    }
  });

  return result;
}

// Parcourt `paths` dans l'ordre et retourne la premiere valeur numerique
// trouvee. Option `predicate(numericValue) => boolean` : si fournie, on ne
// considere comme valide que les valeurs qui passent le predicat ; sinon on
// continue d'essayer les paths suivants. Utile pour ignorer les placeholders
// (sleepScore: 0 a la racine) et tomber sur le path imbrique correct.
function getNestedNumber(value, paths, options = {}) {
  const predicate = typeof options.predicate === "function" ? options.predicate : null;

  for (const path of paths) {
    let current = value;

    for (const key of path) {
      current = current && typeof current === "object" ? current[key] : undefined;
    }

    const numericValue = toNumber(current);
    if (numericValue === null) {
      continue;
    }

    if (predicate && !predicate(numericValue)) {
      continue;
    }

    return numericValue;
  }

  return null;
}

function collectSeriesNumbers(value, likelyKeys) {
  const values = [];

  walkObject(value, (key, item, path) => {
    const lowerPath = [...path, key].join(".").toLowerCase();
    const isLikelySeries = likelyKeys.some((needle) => lowerPath.includes(needle));

    if (!isLikelySeries) {
      return;
    }

    if (Array.isArray(item)) {
      item.forEach((entry) => {
        if (Array.isArray(entry)) {
          entry
            .map((candidate) => toNumber(candidate))
            .filter((candidate) => candidate !== null && candidate >= 0 && candidate <= 100)
            .forEach((candidate) => values.push(candidate));
        } else if (entry && typeof entry === "object") {
          Object.entries(entry).forEach(([entryKey, entryValue]) => {
            const numericValue = toNumber(entryValue);
            const lowerEntryKey = entryKey.toLowerCase();
            if (
              numericValue !== null
              && numericValue >= 0
              && numericValue <= 100
              && (lowerEntryKey.includes("value") || lowerEntryKey.includes("level"))
            ) {
              values.push(numericValue);
            }
          });
        }
      });
    }
  });

  return values;
}

function extractStressSeries(rawStress) {
  const values = collectSeriesNumbers(rawStress, ["stressvalues", "stressvaluesarray"]);
  return values.filter((value) => value >= 0 && value <= 100);
}

function extractBodyBatterySeries(rawBodyBattery) {
  return collectSeriesNumbers(rawBodyBattery, ["bodybattery"]);
}

function extractSleepDurationSeconds(rawSleep) {
  return toInteger(
    getNestedNumber(
      rawSleep,
      [
        ["dailySleepDTO", "sleepTimeSeconds"],
        ["dailySleepDTO", "totalSleepSeconds"],
        ["dailySleepDTO", "durationInSeconds"],
        ["sleepTimeSeconds"],
        ["totalSleepSeconds"],
        ["sleepDurationSeconds"],
        ["durationInSeconds"],
      ],
      { predicate: (value) => value > 0 },
    ),
  );
}

function extractSleepScore(rawSleep) {
  return toRoundedNumber(
    getNestedNumber(
      rawSleep,
      [
        ["sleepScores", "overall", "value"],
        ["sleepScore", "value"],
        ["dailySleepDTO", "sleepScore"],
        ["sleepScore"],
        ["overallScore"],
      ],
      { predicate: (value) => value > 0 },
    ),
    1,
  );
}

function extractHrvAvg(rawHrv) {
  return toRoundedNumber(
    getNestedNumber(
      rawHrv,
      [
        ["hrvSummary", "lastNightAvg"],
        ["hrvSummary", "weeklyAvg"],
        ["lastNightAvg"],
        ["weeklyAvg"],
        ["avgHrv"],
        ["hrvValue"],
      ],
      { predicate: (value) => value > 0 },
    ),
    1,
  );
}

function extractRestingHr(rawSources) {
  const hrPredicate = { predicate: (value) => value > 0 };
  return toInteger(
    findFirstNumberByKeys(rawSources?.heartRates, [
      "restingHeartRate",
      "restingHr",
      "restingHR",
      "wellnessRestingHeartRate",
    ], hrPredicate)
      ?? findFirstNumberByKeys(rawSources?.userSummary, [
        "restingHeartRate",
        "restingHr",
        "restingHR",
        "wellnessRestingHeartRate",
      ], hrPredicate),
  );
}

function extractStress(rawStress) {
  const series = extractStressSeries(rawStress);
  const averageFromSeries = series.length
    ? series.reduce((sum, value) => sum + value, 0) / series.length
    : null;

  return {
    stressAvg: toRoundedNumber(
      findFirstNumberByKeys(rawStress, ["avgStressLevel", "averageStressLevel", "stressAvg"])
        ?? averageFromSeries,
      1,
    ),
    stressMax: toRoundedNumber(
      findFirstNumberByKeys(rawStress, ["maxStressLevel", "stressMax"])
        ?? (series.length ? Math.max(...series) : null),
      1,
    ),
  };
}

function extractBodyBattery(rawBodyBattery) {
  const series = extractBodyBatterySeries(rawBodyBattery);

  return {
    bodyBatteryMorning: toInteger(
      findFirstNumberByKeys(rawBodyBattery, ["bodyBatteryMorning", "morningBodyBattery"])
        ?? series[0],
    ),
    bodyBatteryMin: toInteger(
      findFirstNumberByKeys(rawBodyBattery, ["bodyBatteryMin", "lowestBodyBattery"])
        ?? (series.length ? Math.min(...series) : null),
    ),
    bodyBatteryMax: toInteger(
      findFirstNumberByKeys(rawBodyBattery, ["bodyBatteryMax", "highestBodyBattery"])
        ?? (series.length ? Math.max(...series) : null),
    ),
    bodyBatteryEnd: toInteger(
      findFirstNumberByKeys(rawBodyBattery, ["bodyBatteryEnd", "endOfDayBodyBattery"])
        ?? series.at(-1),
    ),
  };
}

function normalizeDailyRecovery(rawSources = {}, sourceErrors = []) {
  const stress = extractStress(rawSources.stress);
  const bodyBattery = extractBodyBattery(rawSources.bodyBattery);
  const normalized = {
    timezone: findFirstStringByKeys(rawSources.userSummary, ["timeZone", "timezone"]) || null,
    sleepDurationSeconds: extractSleepDurationSeconds(rawSources.sleep),
    sleepScore: extractSleepScore(rawSources.sleep),
    hrvAvgMs: extractHrvAvg(rawSources.hrv),
    hrvStatus: findFirstStringByKeys(rawSources.hrv, [
      "status",
      "hrvStatus",
      "weeklyAvgStatus",
      "lastNightStatus",
    ]) || null,
    restingHr: extractRestingHr(rawSources),
    stressAvg: stress.stressAvg,
    stressMax: stress.stressMax,
    bodyBatteryMorning: bodyBattery.bodyBatteryMorning,
    bodyBatteryMin: bodyBattery.bodyBatteryMin,
    bodyBatteryMax: bodyBattery.bodyBatteryMax,
    bodyBatteryEnd: bodyBattery.bodyBatteryEnd,
    trainingReadinessScore: null,
    trainingReadinessStatus: null,
  };
  const signalCount = [
    normalized.sleepDurationSeconds,
    normalized.hrvAvgMs,
    normalized.restingHr,
    normalized.stressAvg,
    normalized.bodyBatteryMorning ?? normalized.bodyBatteryEnd,
  ].filter((value) => value !== null && typeof value !== "undefined").length;

  let dataQuality = EXTERNAL_PROVIDER_DATA_QUALITIES.ABSENT;
  if (signalCount >= 4) {
    dataQuality = EXTERNAL_PROVIDER_DATA_QUALITIES.COMPLETE;
  } else if (signalCount > 0) {
    dataQuality = EXTERNAL_PROVIDER_DATA_QUALITIES.PARTIAL;
  } else if (sourceErrors.length > 0) {
    dataQuality = EXTERNAL_PROVIDER_DATA_QUALITIES.ERROR;
  }

  return {
    ...normalized,
    dataQuality,
  };
}

function serializeRecoverySnapshot(snapshot) {
  return {
    date: formatDateKey(snapshot.snapshotDate),
    sourceProvider: snapshot.sourceProvider,
    dataQuality: snapshot.dataQuality,
    timezone: snapshot.timezone,
    sleepDurationSeconds: snapshot.sleepDurationSeconds,
    sleepScore: snapshot.sleepScore,
    hrvAvgMs: snapshot.hrvAvgMs,
    hrvStatus: snapshot.hrvStatus,
    restingHr: snapshot.restingHr,
    stressAvg: snapshot.stressAvg,
    stressMax: snapshot.stressMax,
    bodyBatteryMorning: snapshot.bodyBatteryMorning,
    bodyBatteryMin: snapshot.bodyBatteryMin,
    bodyBatteryMax: snapshot.bodyBatteryMax,
    bodyBatteryEnd: snapshot.bodyBatteryEnd,
    trainingReadinessScore: snapshot.trainingReadinessScore,
    trainingReadinessStatus: snapshot.trainingReadinessStatus,
    syncedAt: snapshot.syncedAt,
  };
}

async function getStoredRecoveryDateKeys(appUserId, dateKeys) {
  if (!dateKeys.length) {
    return new Set();
  }

  const snapshots = await prisma.externalDailyRecoverySnapshot.findMany({
    where: {
      appUserId,
      sourceProvider: GARMIN_PROVIDER_CODE,
      snapshotDate: {
        gte: buildUtcDate(dateKeys.at(-1)),
        lte: buildUtcDate(dateKeys[0]),
      },
    },
    select: {
      snapshotDate: true,
    },
  });

  return new Set(snapshots.map((snapshot) => formatDateKey(snapshot.snapshotDate)));
}

async function selectPendingRecoveryDates(appUserId, limit) {
  const dateKeys = buildRecoveryDateKeys();
  const storedDateKeys = await getStoredRecoveryDateKeys(appUserId, dateKeys);

  return dateKeys
    .filter((dateKey) => !storedDateKeys.has(dateKey))
    .slice(0, limit);
}

async function upsertRawData({ appUserId, dateKey, source, payload, status }) {
  const dataType = RAW_SOURCE_TYPES[source] || source;
  const payloadJson = stringifyPayload(payload);

  return prisma.externalProviderRawData.upsert({
    where: {
      appUserId_providerCode_dataType_providerDateKey_providerResourceId: {
        appUserId,
        providerCode: GARMIN_PROVIDER_CODE,
        dataType,
        providerDateKey: dateKey,
        providerResourceId: source,
      },
    },
    create: {
      appUserId,
      providerCode: GARMIN_PROVIDER_CODE,
      dataType,
      providerDateKey: dateKey,
      providerResourceId: source,
      payloadJson,
      payloadHash: hashPayload(payload),
      status,
      syncedAt: new Date(),
    },
    update: {
      payloadJson,
      payloadHash: hashPayload(payload),
      status,
      syncedAt: new Date(),
    },
  });
}

async function storeRecoveryDay(appUserId, day) {
  const dateKey = normalizeDateKey(day?.date);

  if (!dateKey) {
    return null;
  }

  const rawSources = day?.raw && typeof day.raw === "object" ? day.raw : {};
  const sourceErrors = Array.isArray(day?.errors) ? day.errors : [];

  await Promise.all(
    Object.entries(rawSources).map(([source, payload]) => upsertRawData({
      appUserId,
      dateKey,
      source,
      payload,
      status: "success",
    })),
  );

  await Promise.all(
    sourceErrors.map((error) => upsertRawData({
      appUserId,
      dateKey,
      source: error?.source || "unknown",
      payload: error,
      status: "error",
    })),
  );

  const normalizedSnapshot = normalizeDailyRecovery(rawSources, sourceErrors);

  return prisma.externalDailyRecoverySnapshot.upsert({
    where: {
      appUserId_sourceProvider_snapshotDate: {
        appUserId,
        sourceProvider: GARMIN_PROVIDER_CODE,
        snapshotDate: buildUtcDate(dateKey),
      },
    },
    create: {
      appUserId,
      sourceProvider: GARMIN_PROVIDER_CODE,
      snapshotDate: buildUtcDate(dateKey),
      ...normalizedSnapshot,
      syncedAt: new Date(),
    },
    update: {
      ...normalizedSnapshot,
      syncedAt: new Date(),
    },
  });
}

async function storeRecoveryDays(appUserId, days = []) {
  let storedDays = 0;

  for (const day of days) {
    const storedDay = await storeRecoveryDay(appUserId, day);
    if (storedDay) {
      storedDays += 1;
    }
  }

  return storedDays;
}

async function fetchAndStoreRecoveryDates(appUserId, dates) {
  const connection = await requireUsableGarminConnection(appUserId);
  const session = decryptProviderSessionPayload(connection.encryptedSession, { parseJson: true });
  const result = await fetchGarminRecoveryDays({ session, dates });
  const storedDays = await storeRecoveryDays(appUserId, result?.days || []);

  return {
    result,
    storedDays,
  };
}

async function requireUsableGarminConnection(appUserId) {
  const connection = await findExternalProviderConnectionForUser(appUserId, GARMIN_PROVIDER_CODE);

  if (!connection?.encryptedSession) {
    throw buildHttpError(
      "Garmin connection is not ready.",
      "Connecte Garmin avant de lancer la recuperation.",
      409,
    );
  }

  if (
    ![
      EXTERNAL_PROVIDER_STATUSES.CONNECTED,
      EXTERNAL_PROVIDER_STATUSES.SYNCING,
    ].includes(connection.status)
  ) {
    throw buildHttpError(
      `Garmin connection status is not usable: ${connection.status}.`,
      "La connexion Garmin doit etre active avant de recuperer les donnees.",
      409,
    );
  }

  return connection;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeBridgeErrorCode(result = {}) {
  return String(result?.code || "GARMINCONNECT_RECOVERY_ERROR").trim();
}

async function markBackfillFinished(appUserId, data = {}) {
  return upsertExternalProviderConnectionState({
    appUserId,
    providerCode: GARMIN_PROVIDER_CODE,
    status: data.status || EXTERNAL_PROVIDER_STATUSES.CONNECTED,
    lastSyncAt: data.lastSyncAt,
    lastBackfillEndedAt: data.lastBackfillEndedAt || new Date(),
    lastErrorCode: data.lastErrorCode,
    lastErrorMessage: data.lastErrorMessage,
    lastErrorAt: data.lastErrorAt,
  });
}

async function runGarminRecoveryBackfillLoop(appUserId) {
  try {
    let keepRunning = true;
    let stoppedWithManagedState = false;

    while (keepRunning) {
      const pendingDates = await selectPendingRecoveryDates(
        appUserId,
        Number(env.garminconnectRecoveryBatchDays || 3),
      );

      if (!pendingDates.length) {
        break;
      }

      const { result, storedDays } = await fetchAndStoreRecoveryDates(appUserId, pendingDates);

      await upsertExternalProviderConnectionState({
        appUserId,
        providerCode: GARMIN_PROVIDER_CODE,
        status: EXTERNAL_PROVIDER_STATUSES.SYNCING,
        lastSyncAt: storedDays > 0 ? new Date() : undefined,
        lastErrorCode: null,
        lastErrorMessage: null,
        lastErrorAt: null,
      });

      if (result?.status === "rate_limited") {
        await markBackfillFinished(appUserId, {
          status: EXTERNAL_PROVIDER_STATUSES.CONNECTED,
          lastSyncAt: storedDays > 0 ? new Date() : undefined,
          lastErrorCode: normalizeBridgeErrorCode(result),
          lastErrorMessage: result?.message || "Garmin limite temporairement la recuperation.",
          lastErrorAt: new Date(),
        });
        stoppedWithManagedState = true;
        keepRunning = false;
      } else if (result?.status === "expired") {
        await markBackfillFinished(appUserId, {
          status: EXTERNAL_PROVIDER_STATUSES.EXPIRED,
          lastSyncAt: storedDays > 0 ? new Date() : undefined,
          lastErrorCode: normalizeBridgeErrorCode(result),
          lastErrorMessage: result?.message || "La session Garmin a expire.",
          lastErrorAt: new Date(),
        });
        stoppedWithManagedState = true;
        keepRunning = false;
      } else if (result?.status !== "success") {
        await markBackfillFinished(appUserId, {
          status: EXTERNAL_PROVIDER_STATUSES.CONNECTED,
          lastSyncAt: storedDays > 0 ? new Date() : undefined,
          lastErrorCode: normalizeBridgeErrorCode(result),
          lastErrorMessage: result?.message || "La recuperation Garmin a echoue.",
          lastErrorAt: new Date(),
        });
        stoppedWithManagedState = true;
        keepRunning = false;
      } else if (storedDays === 0) {
        await markBackfillFinished(appUserId, {
          status: EXTERNAL_PROVIDER_STATUSES.CONNECTED,
          lastErrorCode: "GARMINCONNECT_NO_RECOVERY_DATA_STORED",
          lastErrorMessage: "Aucun jour Garmin supplementaire n'a pu etre stocke.",
          lastErrorAt: new Date(),
        });
        stoppedWithManagedState = true;
        keepRunning = false;
      } else {
        await delay(Number(env.garminconnectRecoveryBatchDelayMs || 12000));
      }
    }

    if (stoppedWithManagedState) {
      return;
    }

    const status = await getGarminRecoveryBackfillStatus(appUserId);

    await markBackfillFinished(appUserId, {
      status: EXTERNAL_PROVIDER_STATUSES.CONNECTED,
      lastSyncAt: status.syncedDays > 0 ? new Date() : undefined,
      lastErrorCode: null,
      lastErrorMessage: null,
      lastErrorAt: null,
    });
  } catch (error) {
    const currentConnection = await findExternalProviderConnectionForUser(appUserId, GARMIN_PROVIDER_CODE);

    if (
      !currentConnection?.encryptedSession
      || currentConnection.status === EXTERNAL_PROVIDER_STATUSES.DISCONNECTED
    ) {
      return;
    }

    await markBackfillFinished(appUserId, {
      status: EXTERNAL_PROVIDER_STATUSES.CONNECTED,
      lastErrorCode: "GARMINCONNECT_RECOVERY_BACKFILL_FAILED",
      lastErrorMessage: error.userMessage || "La recuperation Garmin a ete interrompue.",
      lastErrorAt: new Date(),
    });
    console.error("Garmin recovery backfill failed:", sanitizeError(error));
  } finally {
    runningBackfills.delete(appUserId);
  }
}

export async function getGarminRecoveryBackfillStatus(appUserId) {
  const dateKeys = buildRecoveryDateKeys();
  const snapshots = await prisma.externalDailyRecoverySnapshot.findMany({
    where: {
      appUserId,
      sourceProvider: GARMIN_PROVIDER_CODE,
      snapshotDate: {
        gte: buildUtcDate(dateKeys.at(-1)),
        lte: buildUtcDate(dateKeys[0]),
      },
    },
    select: {
      snapshotDate: true,
      dataQuality: true,
      syncedAt: true,
    },
    orderBy: {
      snapshotDate: "desc",
    },
  });
  const storedDateKeys = new Set(snapshots.map((snapshot) => formatDateKey(snapshot.snapshotDate)));
  const remainingDates = dateKeys.filter((dateKey) => !storedDateKeys.has(dateKey));
  const qualityCounts = snapshots.reduce((accumulator, snapshot) => {
    const quality = snapshot.dataQuality || EXTERNAL_PROVIDER_DATA_QUALITIES.PARTIAL;
    accumulator[quality] = (accumulator[quality] || 0) + 1;
    return accumulator;
  }, {});
  const latestSnapshot = snapshots
    .slice()
    .sort((first, second) => new Date(second.syncedAt) - new Date(first.syncedAt))[0];

  return {
    windowDays: dateKeys.length,
    batchDays: Number(env.garminconnectRecoveryBatchDays || 3),
    syncedDays: snapshots.length,
    remainingDays: remainingDates.length,
    progressPercent: Math.round((snapshots.length / dateKeys.length) * 100),
    isComplete: remainingDates.length === 0,
    isRunning: runningBackfills.has(appUserId),
    nextPendingDate: remainingDates[0] || null,
    lastSyncedDate: latestSnapshot?.snapshotDate ? formatDateKey(latestSnapshot.snapshotDate) : null,
    lastSyncedAt: latestSnapshot?.syncedAt || null,
    qualityCounts,
  };
}

export async function listGarminRecoverySnapshotsForUser(appUserId, { days = 56 } = {}) {
  const window = buildRecoverySnapshotWindow(days);
  const snapshots = await prisma.externalDailyRecoverySnapshot.findMany({
    where: {
      appUserId,
      sourceProvider: GARMIN_PROVIDER_CODE,
      snapshotDate: {
        gte: window.startDate,
        lte: window.endDate,
      },
    },
    orderBy: {
      snapshotDate: "asc",
    },
  });
  const qualityCounts = snapshots.reduce((accumulator, snapshot) => {
    const quality = snapshot.dataQuality || EXTERNAL_PROVIDER_DATA_QUALITIES.PARTIAL;
    accumulator[quality] = (accumulator[quality] || 0) + 1;
    return accumulator;
  }, {});

  return {
    sourceProvider: GARMIN_PROVIDER_CODE,
    windowDays: window.days,
    startDate: formatDateKey(window.startDate),
    endDate: formatDateKey(window.endDate),
    snapshots: snapshots.map((snapshot) => serializeRecoverySnapshot(snapshot)),
    qualityCounts,
    latestSnapshotDate: snapshots.at(-1)?.snapshotDate
      ? formatDateKey(snapshots.at(-1).snapshotDate)
      : null,
  };
}

export async function startGarminRecoveryBackfillForUser(appUserId) {
  const connection = await requireUsableGarminConnection(appUserId);
  const recoveryBackfill = await getGarminRecoveryBackfillStatus(appUserId);

  if (recoveryBackfill.isComplete) {
    return {
      connection: buildExternalProviderConnectionSummary(connection),
      recoveryBackfill,
      message: "L'historique Garmin de recuperation est deja complet sur la fenetre suivie.",
    };
  }

  if (runningBackfills.has(appUserId)) {
    return {
      connection: buildExternalProviderConnectionSummary(connection),
      recoveryBackfill,
      message: "La recuperation Garmin est deja en cours.",
    };
  }

  runningBackfills.set(appUserId, {
    startedAt: new Date(),
  });

  const updatedConnection = await upsertExternalProviderConnectionState({
    appUserId,
    providerCode: GARMIN_PROVIDER_CODE,
    status: EXTERNAL_PROVIDER_STATUSES.SYNCING,
    lastBackfillStartedAt: new Date(),
    lastBackfillEndedAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    lastErrorAt: null,
  });

  setTimeout(() => {
    runGarminRecoveryBackfillLoop(appUserId).catch((error) => {
      console.error("Unable to start Garmin recovery backfill:", sanitizeError(error));
      runningBackfills.delete(appUserId);
    });
  }, 0);

  return {
    connection: buildExternalProviderConnectionSummary(updatedConnection),
    recoveryBackfill: {
      ...recoveryBackfill,
      isRunning: true,
    },
    message: "Recuperation Garmin lancee. RunNSee avance par petits lots pour limiter les appels Garmin.",
  };
}

export async function syncRecentGarminRecoveryForUser(appUserId, { triggerSource = "ui" } = {}) {
  const connection = await requireUsableGarminConnection(appUserId);
  const recoveryBackfill = await getGarminRecoveryBackfillStatus(appUserId);

  if (runningBackfills.has(appUserId)) {
    return {
      connection: buildExternalProviderConnectionSummary(connection),
      recoveryBackfill,
      message: "Une recuperation Garmin est deja en cours. RunNSee evitera les appels concurrents.",
    };
  }

  runningBackfills.set(appUserId, {
    startedAt: new Date(),
    type: "recent_sync",
    triggerSource,
  });

  await upsertExternalProviderConnectionState({
    appUserId,
    providerCode: GARMIN_PROVIDER_CODE,
    status: EXTERNAL_PROVIDER_STATUSES.SYNCING,
    lastErrorCode: null,
    lastErrorMessage: null,
    lastErrorAt: null,
  });

  try {
    const dates = buildRecentRecoveryDateKeys();
    const { result, storedDays } = await fetchAndStoreRecoveryDates(appUserId, dates);
    const now = new Date();
    let connectionStatus = EXTERNAL_PROVIDER_STATUSES.CONNECTED;
    let lastErrorCode = null;
    let lastErrorMessage = null;
    let lastErrorAt = null;
    let message = `Synchronisation Garmin recente terminee : ${storedDays} jour(s) relu(s).`;

    if (result?.status === "rate_limited") {
      lastErrorCode = normalizeBridgeErrorCode(result);
      lastErrorMessage = result?.message || "Garmin limite temporairement la synchronisation.";
      lastErrorAt = now;
      message = "Garmin limite temporairement la synchronisation. Les jours deja lus ont ete conserves.";
    } else if (result?.status === "expired") {
      connectionStatus = EXTERNAL_PROVIDER_STATUSES.EXPIRED;
      lastErrorCode = normalizeBridgeErrorCode(result);
      lastErrorMessage = result?.message || "La session Garmin a expire.";
      lastErrorAt = now;
      message = "La session Garmin a expire. Reconnecte Garmin pour reprendre la synchronisation.";
    } else if (result?.status !== "success") {
      lastErrorCode = normalizeBridgeErrorCode(result);
      lastErrorMessage = result?.message || "La synchronisation Garmin recente a echoue.";
      lastErrorAt = now;
      message = "La synchronisation Garmin recente a ete interrompue.";
    }

    const updatedConnection = await upsertExternalProviderConnectionState({
      appUserId,
      providerCode: GARMIN_PROVIDER_CODE,
      status: connectionStatus,
      lastSyncAt: storedDays > 0 || result?.status === "success" ? now : undefined,
      lastErrorCode,
      lastErrorMessage,
      lastErrorAt,
    });

    return {
      connection: buildExternalProviderConnectionSummary(updatedConnection),
      recoveryBackfill: await getGarminRecoveryBackfillStatus(appUserId),
      message,
    };
  } catch (error) {
    const updatedConnection = await upsertExternalProviderConnectionState({
      appUserId,
      providerCode: GARMIN_PROVIDER_CODE,
      status: EXTERNAL_PROVIDER_STATUSES.CONNECTED,
      lastErrorCode: "GARMINCONNECT_RECENT_SYNC_FAILED",
      lastErrorMessage: error.userMessage || "La synchronisation Garmin recente a echoue.",
      lastErrorAt: new Date(),
    });

    console.error("Garmin recent recovery sync failed:", sanitizeError(error));

    return {
      connection: buildExternalProviderConnectionSummary(updatedConnection),
      recoveryBackfill: await getGarminRecoveryBackfillStatus(appUserId),
      message: error.userMessage || "La synchronisation Garmin recente a echoue.",
    };
  } finally {
    runningBackfills.delete(appUserId);
  }
}

// Inverse de RAW_SOURCE_TYPES : providerResourceId (ex. "sleep") → clé rawSources (ex. "sleep")
const RAW_RESOURCE_ID_TO_SOURCE_KEY = Object.fromEntries(
  Object.entries(RAW_SOURCE_TYPES).map(([sourceKey]) => [sourceKey, sourceKey]),
);

export async function renormalizeGarminRecoverySnapshotsForUser(appUserId) {
  const allRawData = await prisma.externalProviderRawData.findMany({
    where: {
      appUserId,
      providerCode: GARMIN_PROVIDER_CODE,
    },
    select: {
      providerDateKey: true,
      providerResourceId: true,
      payloadJson: true,
      status: true,
    },
    orderBy: { providerDateKey: "asc" },
  });

  // Grouper par date
  const byDate = new Map();
  for (const row of allRawData) {
    const dateKey = normalizeDateKey(row.providerDateKey);
    if (!dateKey) {
      continue;
    }
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, { rawSources: {}, sourceErrors: [] });
    }
    const group = byDate.get(dateKey);
    const sourceKey = RAW_RESOURCE_ID_TO_SOURCE_KEY[row.providerResourceId];
    if (row.status === "error") {
      group.sourceErrors.push({ source: row.providerResourceId });
    } else if (sourceKey) {
      group.rawSources[sourceKey] = safeParseJson(row.payloadJson);
    }
  }

  let processedDays = 0;
  let updatedDays = 0;

  for (const [dateKey, { rawSources, sourceErrors }] of byDate) {
    const normalizedSnapshot = normalizeDailyRecovery(rawSources, sourceErrors);
    const snapshotDate = buildUtcDate(dateKey);

    const existing = await prisma.externalDailyRecoverySnapshot.findUnique({
      where: {
        appUserId_sourceProvider_snapshotDate: {
          appUserId,
          sourceProvider: GARMIN_PROVIDER_CODE,
          snapshotDate,
        },
      },
      select: { id: true },
    });

    await prisma.externalDailyRecoverySnapshot.upsert({
      where: {
        appUserId_sourceProvider_snapshotDate: {
          appUserId,
          sourceProvider: GARMIN_PROVIDER_CODE,
          snapshotDate,
        },
      },
      create: {
        appUserId,
        sourceProvider: GARMIN_PROVIDER_CODE,
        snapshotDate,
        ...normalizedSnapshot,
        syncedAt: new Date(),
      },
      update: {
        ...normalizedSnapshot,
        syncedAt: new Date(),
      },
    });

    processedDays += 1;
    if (existing) {
      updatedDays += 1;
    }
  }

  return { processedDays, updatedDays };
}

export async function buildGarminConnectionWithRecoveryStatus(appUserId, connection) {
  return {
    connection: buildExternalProviderConnectionSummary(connection),
    recoveryBackfill: await getGarminRecoveryBackfillStatus(appUserId),
  };
}
