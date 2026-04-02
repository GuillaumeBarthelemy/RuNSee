import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "runsee-dashboard-state-v5";
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

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
  if (typeof window === "undefined" || !window.sessionStorage) {
    return DEFAULT_STATE;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    const currentPage = Math.max(1, Number(parsed?.table?.currentPage || DEFAULT_STATE.table.currentPage));
    const requestedPageSize = Number(parsed?.table?.pageSize || DEFAULT_STATE.table.pageSize);
    const pageSize = ALLOWED_PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : DEFAULT_STATE.table.pageSize;

    return {
      filters: { ...DEFAULT_STATE.filters, ...(parsed.filters || {}) },
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
    if (typeof window === "undefined" || !window.sessionStorage) return;
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
        table: {
          ...current.table,
          [name]: name === "pageSize"
            ? (ALLOWED_PAGE_SIZES.includes(Number(value)) ? Number(value) : DEFAULT_STATE.table.pageSize)
            : Math.max(1, Number(value || DEFAULT_STATE.table.currentPage)),
        },
      }));
    },
    resetAll() {
      setState(DEFAULT_STATE);
    },
  }), []);

  return { dashboardState: state, dashboardActions: actions };
}
