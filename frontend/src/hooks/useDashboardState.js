import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "runsee-dashboard-state-v5";

const DEFAULT_STATE = {
  filters: {
    search: "",
    sportGroup: "all",
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
    comparisonMode: "yearToDate",
    comparisonReference: "",
    comparisonDisplay: "line",
    comparisonPeriods: 3,
  },
  table: {
    currentPage: 1,
    pageSize: 20,
  },
};

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      filters: { ...DEFAULT_STATE.filters, ...(parsed.filters || {}) },
      options: { ...DEFAULT_STATE.options, ...(parsed.options || {}) },
      table: { ...DEFAULT_STATE.table, ...(parsed.table || {}) },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export default function useDashboardState() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const actions = useMemo(() => ({
    setFilter(name, value) {
      setState((current) => ({
        ...current,
        filters: { ...current.filters, [name]: value },
        table: { ...current.table, currentPage: 1 },
      }));
    },
    resetFilters() {
      setState((current) => ({
        ...current,
        filters: { ...DEFAULT_STATE.filters },
        table: { ...current.table, currentPage: 1 },
      }));
    },
    setOption(name, value) {
      setState((current) => ({
        ...current,
        options: { ...current.options, [name]: value },
      }));
    },
    setTable(name, value) {
      setState((current) => ({
        ...current,
        table: { ...current.table, [name]: value },
      }));
    },
    resetAll() {
      setState(DEFAULT_STATE);
    },
  }), []);

  return { dashboardState: state, dashboardActions: actions };
}
