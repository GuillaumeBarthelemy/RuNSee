import { useCallback, useDeferredValue, useEffect, useMemo } from "react";
import useDashboardState, { DEFAULT_SPORT_GROUP } from "./useDashboardState.js";
import useRunSeeData from "./useRunSeeData.js";
import { filterActivities, getAvailableSportGroups } from "../utils/activityAggregations.js";
import { buildAnalyticsDateRange, getFirstActivityDate } from "../utils/analyticsPeriods.js";

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
  analyticsMonthlyMetric: "load",
  weekdayMetric: "count",
  comparisonMetric: "load",
  comparisonSelectedYears: [],
  comparisonDisplay: "line",
  sharedPeriodPreset: "90d",
  sharedCustomDateFrom: "",
  sharedCustomDateTo: "",
  analyticsWeeklyMetric: "count",
  analyticsVolumeGrouping: "rolling",
  analyticsWeeklyViewMode: "rolling",
  analyticsHeartRateDistributionMetric: "load",
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
export default function useActivityViewModel({
  includeActivities = true,
} = {}) {
  const {
    athlete,
    activities,
    error,
    isLoading,
    reload,
    trainingAnalyticsSettings,
    trainingAnalyticsSettingsHistory,
  } = useRunSeeData({ includeActivities });
  const { dashboardState, dashboardActions } = useDashboardState();

  const safeActivities = useMemo(
    () => (Array.isArray(activities) ? activities : []),
    [activities],
  );

  const firstActivityDate = useMemo(
    () => getFirstActivityDate(safeActivities),
    [safeActivities],
  );

  const filters = useMemo(
    () => ({ ...DEFAULT_FILTERS, ...(dashboardState?.filters || {}) }),
    [dashboardState?.filters],
  );

  const options = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...(dashboardState?.options || {}) }),
    [dashboardState?.options],
  );
  const deferredFilters = useDeferredValue(filters);
  const deferredGroupSports = useDeferredValue(options.groupSports);

  const table = useMemo(
    () => ({ ...DEFAULT_TABLE, ...(dashboardState?.table || {}) }),
    [dashboardState?.table],
  );
  const rawSetOption = dashboardActions?.setOption ?? noop;

  const sharedRange = useMemo(
    () => buildAnalyticsDateRange({
      preset: options.sharedPeriodPreset,
      customDateFrom: options.sharedCustomDateFrom,
      customDateTo: options.sharedCustomDateTo,
      firstActivityDate,
    }),
    [firstActivityDate, options.sharedCustomDateFrom, options.sharedCustomDateTo, options.sharedPeriodPreset],
  );

  const setFilter = dashboardActions?.setFilter ?? noop;
  const resetFilters = dashboardActions?.resetFilters ?? noop;
  const setOption = useCallback((name, value) => {
    rawSetOption(name, value);
  }, [rawSetOption]);
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
    () => filterActivities(
      safeActivities,
      {
        ...deferredFilters,
        dateFrom: sharedRange.dateFrom,
        dateTo: sharedRange.dateTo,
      },
      { groupSports: deferredGroupSports },
    ),
    [deferredFilters, deferredGroupSports, safeActivities, sharedRange.dateFrom, sharedRange.dateTo],
  );

  const comparisonActivities = useMemo(
    () =>
      filterActivities(
        safeActivities,
        { ...deferredFilters, dateFrom: "", dateTo: "" },
        { groupSports: deferredGroupSports },
      ),
    [deferredFilters, deferredGroupSports, safeActivities],
  );

  return {
    athlete,
    error,
    isLoading,
    safeActivities,
    firstActivityDate,
    filteredActivities,
    comparisonActivities,
    sharedRange,
    filters,
    deferredFilters,
    options,
    deferredGroupSports,
    table,
    availableSports,
    trainingAnalyticsSettings,
    trainingAnalyticsSettingsHistory,
    setFilter,
    resetFilters,
    setOption,
    setTable,
    reload,
  };
}
