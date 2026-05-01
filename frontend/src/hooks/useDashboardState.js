import { useEffect, useMemo, useState } from "react";
import useAuth from "./useAuth.js";
import { RUN_SPORT_GROUP_LABEL } from "../utils/activityAggregations.js";

const STORAGE_KEY_PREFIX = "runsee-dashboard-state-v9";
const LEGACY_STORAGE_KEYS = ["runsee-dashboard-state-v7", "runsee-dashboard-state-v6", "runsee-dashboard-state-v5"];
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];
const STATE_SCHEMA_VERSION = 10;
const DEFAULT_SHARED_PERIOD_PRESET = "90d";
const PREVIOUS_DEFAULT_SHARED_PERIOD_PRESET = "7d";
const PREVIOUS_DEFAULT_SPORT_GROUP = "Course a pied / trail";
const LEGACY_ANALYTICS_PERIOD_PRESET = "90d";
const DEFAULT_PRESET_FOR_DEPRECATED_PERIODS = "90d";
const DEPRECATED_PERIOD_PRESETS = new Set(["30d", "ytd"]);
export const DEFAULT_SPORT_GROUP = RUN_SPORT_GROUP_LABEL;

const DEFAULT_STATE = {
  schemaVersion: STATE_SCHEMA_VERSION,
  filters: {
    search: "",
    sportGroup: DEFAULT_SPORT_GROUP,
    dateFrom: "",
    dateTo: "",
  },
  options: {
    groupSports: true,
    monthlyMetric: "distanceKm",
    monthlyDisplay: "line",
    monthlyMonths: 6,
    analyticsMonthlyMetric: "load",
    weekdayMetric: "count",
    comparisonMetric: "load",
    comparisonSelectedYears: [],
    comparisonDisplay: "line",
    sharedPeriodPreset: DEFAULT_SHARED_PERIOD_PRESET,
    sharedCustomDateFrom: "",
    sharedCustomDateTo: "",
    analyticsWeeklyMetric: "count",
    analyticsVolumeGrouping: "rolling",
    analyticsWeeklyViewMode: "rolling",
    analyticsHeartRateDistributionMetric: "load",
    todaySportGroup: DEFAULT_SPORT_GROUP,
    heartRateMax: "",
    heartRateZone1Max: "",
    heartRateZone2Max: "",
    heartRateZone3Max: "",
    heartRateZone4Max: "",
    userLocale: "fr-FR",
    userDistanceUnit: "km",
    userWeekStartsOn: "monday",
  },
  table: {
    currentPage: 1,
    pageSize: 20,
  },
};

function buildStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}:${String(userId || "default").trim() || "default"}`;
}

function readStorageValue(key) {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage?.getItem(key) || window.sessionStorage?.getItem(key) || "";
  } catch {
    return "";
  }
}

function removeStorageValue(key) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage?.removeItem(key);
    window.sessionStorage?.removeItem(key);
  } catch {
    // Ignore storage failures and keep the in-memory state.
  }
}

function writeStorageValue(storageKey, state) {
  if (typeof window === "undefined") return;

  try {
    const serialized = JSON.stringify(state);
    window.localStorage?.setItem(storageKey, serialized);
    window.sessionStorage?.setItem(storageKey, serialized);
  } catch {
    // Ignore storage failures and keep the in-memory state.
  }
}

function readStoredState(storageKey) {
  const current = readStorageValue(storageKey);
  if (current) return { raw: current, shouldClearLegacy: false };

  const legacyCandidates = [STORAGE_KEY_PREFIX, ...LEGACY_STORAGE_KEYS];
  for (const key of legacyCandidates) {
    const legacy = readStorageValue(key);
    if (legacy) return { raw: legacy, shouldClearLegacy: true };
  }

  return { raw: "", shouldClearLegacy: false };
}

function clearLegacyStoredState() {
  [STORAGE_KEY_PREFIX, ...LEGACY_STORAGE_KEYS].forEach(removeStorageValue);
}

function resolveSharedPeriod(options = {}, filters = {}, context = {}) {
  if (options.sharedPeriodPreset) {
    const shouldMigratePreviousDefault = context.isLegacyState
      && options.sharedPeriodPreset === PREVIOUS_DEFAULT_SHARED_PERIOD_PRESET
      && !options.sharedCustomDateFrom
      && !options.sharedCustomDateTo;

    return {
      sharedPeriodPreset: shouldMigratePreviousDefault
        ? DEFAULT_SHARED_PERIOD_PRESET
        : DEPRECATED_PERIOD_PRESETS.has(options.sharedPeriodPreset)
        ? DEFAULT_PRESET_FOR_DEPRECATED_PERIODS
        : options.sharedPeriodPreset,
      sharedCustomDateFrom: options.sharedCustomDateFrom || "",
      sharedCustomDateTo: options.sharedCustomDateTo || "",
    };
  }

  if (filters.dateFrom && filters.dateTo) {
    return {
      sharedPeriodPreset: "custom",
      sharedCustomDateFrom: filters.dateFrom,
      sharedCustomDateTo: filters.dateTo,
    };
  }

  if (options.analyticsPeriodPreset === "custom" && options.analyticsCustomDateFrom && options.analyticsCustomDateTo) {
    return {
      sharedPeriodPreset: "custom",
      sharedCustomDateFrom: options.analyticsCustomDateFrom,
      sharedCustomDateTo: options.analyticsCustomDateTo,
    };
  }

  if (options.dashboardPeriodPreset === "custom" && options.dashboardCustomDateFrom && options.dashboardCustomDateTo) {
    return {
      sharedPeriodPreset: "custom",
      sharedCustomDateFrom: options.dashboardCustomDateFrom,
      sharedCustomDateTo: options.dashboardCustomDateTo,
    };
  }

  if (options.analyticsPeriodPreset && options.analyticsPeriodPreset !== LEGACY_ANALYTICS_PERIOD_PRESET) {
    return {
      sharedPeriodPreset: DEPRECATED_PERIOD_PRESETS.has(options.analyticsPeriodPreset)
        ? DEFAULT_PRESET_FOR_DEPRECATED_PERIODS
        : options.analyticsPeriodPreset,
      sharedCustomDateFrom: "",
      sharedCustomDateTo: "",
    };
  }

  if (options.dashboardPeriodPreset) {
    return {
      sharedPeriodPreset: DEPRECATED_PERIOD_PRESETS.has(options.dashboardPeriodPreset)
        ? DEFAULT_PRESET_FOR_DEPRECATED_PERIODS
        : options.dashboardPeriodPreset,
      sharedCustomDateFrom: "",
      sharedCustomDateTo: "",
    };
  }

  return {
    sharedPeriodPreset: DEFAULT_SHARED_PERIOD_PRESET,
    sharedCustomDateFrom: "",
    sharedCustomDateTo: "",
  };
}

function loadState(storageKey) {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  try {
    const { raw, shouldClearLegacy } = readStoredState(storageKey);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    const isLegacyState = Number(parsed?.schemaVersion || 0) < STATE_SCHEMA_VERSION;
    const currentPage = Math.max(1, Number(parsed?.table?.currentPage || DEFAULT_STATE.table.currentPage));
    const requestedPageSize = Number(parsed?.table?.pageSize || DEFAULT_STATE.table.pageSize);
    const pageSize = ALLOWED_PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : DEFAULT_STATE.table.pageSize;
    const parsedSportGroup = parsed?.filters?.sportGroup;
    const sportGroup = (!parsedSportGroup || parsedSportGroup === "all" || parsedSportGroup === PREVIOUS_DEFAULT_SPORT_GROUP)
      ? DEFAULT_SPORT_GROUP
      : (parsedSportGroup || DEFAULT_STATE.filters.sportGroup);
    const sharedPeriod = resolveSharedPeriod(parsed?.options || {}, parsed?.filters || {}, { isLegacyState });
    const volumeGrouping = parsed?.options?.analyticsVolumeGrouping
      || (parsed?.options?.analyticsWeeklyViewMode === "calendar" ? "calendar" : "rolling");

    const nextState = {
      schemaVersion: STATE_SCHEMA_VERSION,
      filters: { ...DEFAULT_STATE.filters, ...(parsed.filters || {}), sportGroup },
      options: {
        ...DEFAULT_STATE.options,
        ...(parsed.options || {}),
        ...sharedPeriod,
        analyticsVolumeGrouping: volumeGrouping,
      },
      table: { ...DEFAULT_STATE.table, ...(parsed.table || {}), currentPage, pageSize },
    };

    if (shouldClearLegacy) {
      clearLegacyStoredState();
      writeStorageValue(storageKey, nextState);
    }

    return nextState;
  } catch {
    return DEFAULT_STATE;
  }
}

export default function useDashboardState() {
  const { user } = useAuth();
  const storageKey = useMemo(() => buildStorageKey(user?.id || "anonymous"), [user?.id]);
  const [state, setState] = useState(() => loadState(storageKey));

  useEffect(() => {
    setState(loadState(storageKey));
  }, [storageKey]);

  useEffect(() => {
    writeStorageValue(storageKey, state);
  }, [state, storageKey]);

  const actions = useMemo(() => {
    const updateState = (updater) => {
      setState((current) => {
        const next = updater(current);
        writeStorageValue(storageKey, next);
        return next;
      });
    };

    return {
      setFilter(name, value) {
        updateState((current) => ({
          ...current,
          filters: { ...current.filters, [name]: value },
          table: { ...current.table, currentPage: 1 },
        }));
      },
      resetFilters() {
        updateState((current) => ({
          ...current,
          filters: { ...DEFAULT_STATE.filters },
          table: { ...current.table, currentPage: 1 },
        }));
      },
      setOption(name, value) {
        updateState((current) => ({
          ...current,
          options: { ...current.options, [name]: value },
        }));
      },
      setTable(name, value) {
        updateState((current) => ({
          ...current,
          table: {
            ...current.table,
            [name]: name === "pageSize"
              ? (ALLOWED_PAGE_SIZES.includes(Number(value)) ? Number(value) : DEFAULT_STATE.table.pageSize)
              : Math.max(1, Number(value || DEFAULT_STATE.table.currentPage)),
          },
        }));
      },
      resetAll() {
        updateState(() => DEFAULT_STATE);
      },
    };
  }, [storageKey]);

  return { dashboardState: state, dashboardActions: actions };
}
