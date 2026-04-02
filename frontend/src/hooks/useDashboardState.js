import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "runsee-dashboard-state-v7";
const LEGACY_STORAGE_KEYS = ["runsee-dashboard-state-v6", "runsee-dashboard-state-v5"];
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];
export const DEFAULT_SPORT_GROUP = "Course à pied / trail";

const DEFAULT_STATE = {
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
    weekdayMetric: "count",
    comparisonMetric: "distanceKm",
    comparisonDisplay: "line",
    analyticsPeriodPreset: "90d",
    analyticsCustomDateFrom: "",
    analyticsCustomDateTo: "",
    dashboardPeriodPreset: "30d",
    dashboardCustomDateFrom: "",
    dashboardCustomDateTo: "",
    analyticsWeeklyMetric: "count",
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

function readStorageValue(key) {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage?.getItem(key) || window.sessionStorage?.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStorageValue(state) {
  if (typeof window === "undefined") return;

  try {
    const serialized = JSON.stringify(state);
    window.localStorage?.setItem(STORAGE_KEY, serialized);
    window.sessionStorage?.setItem(STORAGE_KEY, serialized);
  } catch {
    // Ignore storage failures and keep the in-memory state.
  }
}

function readStoredState() {
  const current = readStorageValue(STORAGE_KEY);
  if (current) return { raw: current, isLegacy: false };

  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy = readStorageValue(key);
    if (legacy) return { raw: legacy, isLegacy: true };
  }

  return { raw: "", isLegacy: false };
}

function loadState() {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  try {
    const { raw, isLegacy } = readStoredState();
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    const currentPage = Math.max(1, Number(parsed?.table?.currentPage || DEFAULT_STATE.table.currentPage));
    const requestedPageSize = Number(parsed?.table?.pageSize || DEFAULT_STATE.table.pageSize);
    const pageSize = ALLOWED_PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : DEFAULT_STATE.table.pageSize;
    const parsedSportGroup = parsed?.filters?.sportGroup;
    const sportGroup = isLegacy && (!parsedSportGroup || parsedSportGroup === "all")
      ? DEFAULT_SPORT_GROUP
      : (parsedSportGroup || DEFAULT_STATE.filters.sportGroup);

    return {
      filters: { ...DEFAULT_STATE.filters, ...(parsed.filters || {}), sportGroup },
      options: { ...DEFAULT_STATE.options, ...(parsed.options || {}) },
      table: { ...DEFAULT_STATE.table, ...(parsed.table || {}), currentPage, pageSize },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export default function useDashboardState() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    writeStorageValue(state);
  }, [state]);

  const actions = useMemo(() => {
    const updateState = (updater) => {
      setState((current) => {
        const next = updater(current);
        writeStorageValue(next);
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
  }, []);

  return { dashboardState: state, dashboardActions: actions };
}
