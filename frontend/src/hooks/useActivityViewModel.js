import { useEffect, useMemo } from "react";
import useDashboardState, { DEFAULT_SPORT_GROUP } from "./useDashboardState.js";
import useRunSeeData from "./useRunSeeData.js";
import { filterActivities, getAvailableSportGroups } from "../utils/activityAggregations.js";

const DEFAULT_FILTERS = {
  search: "",
  sportGroup: DEFAULT_SPORT_GROUP,
  dateFrom: "",
  dateTo: "",
};

const DEFAULT_OPTIONS = {
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
};

const DEFAULT_TABLE = {
  currentPage: 1,
  pageSize: 20,
};

const noop = () => {};

export default function useActivityViewModel({ includeActivities = true } = {}) {
  const { athlete, activities, error, isLoading } = useRunSeeData({ includeActivities });
  const { dashboardState, dashboardActions } = useDashboardState();

  const safeActivities = useMemo(
    () => (Array.isArray(activities) ? activities : []),
    [activities],
  );

  const filters = useMemo(
    () => ({ ...DEFAULT_FILTERS, ...(dashboardState?.filters || {}) }),
    [dashboardState?.filters],
  );

  const options = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...(dashboardState?.options || {}) }),
    [dashboardState?.options],
  );

  const table = useMemo(
    () => ({ ...DEFAULT_TABLE, ...(dashboardState?.table || {}) }),
    [dashboardState?.table],
  );

  const setFilter = dashboardActions?.setFilter ?? noop;
  const resetFilters = dashboardActions?.resetFilters ?? noop;
  const setOption = dashboardActions?.setOption ?? noop;
  const setTable = dashboardActions?.setTable ?? noop;

  const availableSports = useMemo(
    () => getAvailableSportGroups(safeActivities, { groupSports: options.groupSports }),
    [options.groupSports, safeActivities],
  );

  useEffect(() => {
    if (!availableSports.length) return;
    if (filters.sportGroup === "all") return;
    if (!availableSports.includes(filters.sportGroup)) {
      setFilter("sportGroup", "all");
    }
  }, [availableSports, filters.sportGroup, setFilter]);

  const filteredActivities = useMemo(
    () => filterActivities(safeActivities, filters, { groupSports: options.groupSports }),
    [filters, options.groupSports, safeActivities],
  );

  const comparisonActivities = useMemo(
    () =>
      filterActivities(
        safeActivities,
        { ...filters, dateFrom: "", dateTo: "" },
        { groupSports: options.groupSports },
      ),
    [filters, options.groupSports, safeActivities],
  );

  return {
    athlete,
    error,
    isLoading,
    safeActivities,
    filteredActivities,
    comparisonActivities,
    filters,
    options,
    table,
    availableSports,
    setFilter,
    resetFilters,
    setOption,
    setTable,
  };
}
