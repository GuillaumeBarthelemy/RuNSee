import { useEffect, useMemo, useState } from "react";
import AppNavigation from "../components/AppNavigation.jsx";
import ActivitiesTable from "../components/ActivitiesTable.jsx";
import ActivityFilters from "../components/ActivityFilters.jsx";
import DistanceDistributionChart from "../components/DistanceDistributionChart.jsx";
import KpiGrid from "../components/KpiGrid.jsx";
import MonthlyVolumeChart from "../components/MonthlyVolumeChart.jsx";
import PeriodComparisonSection from "../components/PeriodComparisonSection.jsx";
import RollingLoadChart from "../components/RollingLoadChart.jsx";
import SportDistributionChart from "../components/SportDistributionChart.jsx";
import WeekdayDistributionChart from "../components/WeekdayDistributionChart.jsx";
import useDashboardState from "../hooks/useDashboardState.js";
import useRunSeeData from "../hooks/useRunSeeData.js";
import { buildDistanceDistribution, buildKpis, buildMonthlySeries, buildRollingLoadSeries, buildSportDistribution, buildWeekdayDistribution, filterActivities, getAvailableSportGroups } from "../utils/activityAggregations.js";

const DEFAULT_FILTERS = {
  search: "",
  sportGroup: "all",
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
  comparisonMode: "yearToDate",
  comparisonReference: "",
  comparisonDisplay: "line",
  comparisonPeriods: 3,
};

const DEFAULT_TABLE = {
  currentPage: 1,
  pageSize: 20,
};

const noop = () => {};

export default function DashboardPage() {
  const { activities, error } = useRunSeeData({ includeActivities: true });
  const { dashboardState, dashboardActions } = useDashboardState();
  const [activeAnchor, setActiveAnchor] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.location.hash ? window.location.hash.replace("#", "") : window.sessionStorage?.getItem("runsee-return-hash") || "";
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    sessionStorage.removeItem("runsee-return-hash");
  }, []);

  const safeActivities = useMemo(() => (Array.isArray(activities) ? activities : []), [activities]);
  const filters = useMemo(() => ({ ...DEFAULT_FILTERS, ...(dashboardState?.filters || {}) }), [dashboardState?.filters]);
  const options = useMemo(() => ({ ...DEFAULT_OPTIONS, ...(dashboardState?.options || {}) }), [dashboardState?.options]);
  const table = useMemo(() => ({ ...DEFAULT_TABLE, ...(dashboardState?.table || {}) }), [dashboardState?.table]);
  const setFilter = dashboardActions?.setFilter ?? noop;
  const resetFilters = dashboardActions?.resetFilters ?? noop;
  const setOption = dashboardActions?.setOption ?? noop;
  const setTable = dashboardActions?.setTable ?? noop;

  const availableSports = useMemo(
    () => getAvailableSportGroups(safeActivities, { groupSports: options.groupSports }),
    [options.groupSports, safeActivities],
  );

  useEffect(() => {
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
    () => filterActivities(safeActivities, { ...filters, dateFrom: "", dateTo: "" }, { groupSports: options.groupSports }),
    [filters, options.groupSports, safeActivities],
  );

  const kpis = useMemo(() => buildKpis(filteredActivities), [filteredActivities]);
  const monthlyVolume = useMemo(
    () => buildMonthlySeries(filteredActivities, { metric: options.monthlyMetric, months: options.monthlyMonths }),
    [filteredActivities, options.monthlyMetric, options.monthlyMonths],
  );
  const weekdayDistribution = useMemo(
    () => buildWeekdayDistribution(filteredActivities, { metric: options.weekdayMetric }),
    [filteredActivities, options.weekdayMetric],
  );
  const sportDistribution = useMemo(
    () => buildSportDistribution(filteredActivities, { groupSports: options.groupSports }),
    [filteredActivities, options.groupSports],
  );
  const rollingLoad = useMemo(() => buildRollingLoadSeries(filteredActivities, { metric: "distanceKm", days: 120 }), [filteredActivities]);
  const distanceDistribution = useMemo(() => buildDistanceDistribution(filteredActivities), [filteredActivities]);
  const comparisonScopeText = useMemo(() => {
    const safeSearch = String(filters.search || "").trim();
    const sportScope = filters.sportGroup === "all" ? "tous les sports" : filters.sportGroup;
    const searchScope = safeSearch ? `, recherche "${safeSearch}"` : "";
    return `Portée actuelle : ${sportScope}${searchScope}. Les filtres de date sont ignorés pour comparer des périodes équivalentes.`;
  }, [filters.search, filters.sportGroup]);

  return (
    <div className="page premium-page">
      <div className="container">
        <header className="topbar premium-topbar">
          <div>
            <div className="brand-line">
              <span className="brand-badge">RuNSee</span>
              <AppNavigation />
            </div>
            <h1 className="topbar-title">Tableau de bord analytique</h1>
            <p className="page-subtitle">Analyse tes activités locales, compare tes années à date comme dans Elevate et garde ton contexte de navigation entre les pages.</p>
          </div>
        </header>

        {error ? <div className="alert alert-error section">{error}</div> : null}

        <div className="section">
          <ActivityFilters
            filters={filters}
            options={options}
            availableSports={availableSports}
            filteredCount={filteredActivities.length}
            totalCount={safeActivities.length}
            onChange={setFilter}
            onReset={resetFilters}
            onOptionChange={setOption}
          />
        </div>

        <div className="section"><KpiGrid kpis={kpis} /></div>

        <div className="section">
          <PeriodComparisonSection
            activities={comparisonActivities}
            mode={options.comparisonMode}
            metric={options.comparisonMetric}
            reference={options.comparisonReference}
            display={options.comparisonDisplay}
            periods={options.comparisonPeriods}
            scopeText={comparisonScopeText}
            onModeChange={(value) => setOption("comparisonMode", value)}
            onMetricChange={(value) => setOption("comparisonMetric", value)}
            onReferenceChange={(value) => setOption("comparisonReference", value)}
            onDisplayChange={(value) => setOption("comparisonDisplay", value)}
            onPeriodsChange={(value) => setOption("comparisonPeriods", value)}
          />
        </div>

        <div className="section">
          <MonthlyVolumeChart
            data={monthlyVolume}
            metric={options.monthlyMetric}
            display={options.monthlyDisplay}
            months={options.monthlyMonths}
            onMetricChange={(value) => setOption("monthlyMetric", value)}
            onDisplayChange={(value) => setOption("monthlyDisplay", value)}
            onMonthsChange={(value) => setOption("monthlyMonths", value)}
          />
        </div>

        <div className="grid two-columns section">
          <RollingLoadChart data={rollingLoad} metric="distanceKm" />
          <WeekdayDistributionChart
            data={weekdayDistribution}
            metric={options.weekdayMetric}
            onMetricChange={(value) => setOption("weekdayMetric", value)}
          />
        </div>

        <div className="grid two-columns section">
          <DistanceDistributionChart data={distanceDistribution} />
          <SportDistributionChart data={sportDistribution} groupSports={options.groupSports} />
        </div>

        <div className="section">
          <ActivitiesTable
            activities={filteredActivities}
            groupSports={options.groupSports}
            currentAnchor={activeAnchor}
            onAnchorHandled={() => setActiveAnchor("")}
            currentPage={table.currentPage}
            pageSize={table.pageSize}
            onPageChange={(value) => setTable("currentPage", value)}
            onPageSizeChange={(value) => {
              setTable("pageSize", value);
              setTable("currentPage", 1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
