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

export default function DashboardPage() {
  const { activities, error } = useRunSeeData({ includeActivities: true });
  const { dashboardState, dashboardActions } = useDashboardState();
  const [activeAnchor, setActiveAnchor] = useState("");

  useEffect(() => {
    const hashFromUrl = window.location.hash ? window.location.hash.replace("#", "") : "";
    const hashFromStorage = sessionStorage.getItem("runsee-return-hash") || "";
    const nextAnchor = hashFromUrl || hashFromStorage;
    if (nextAnchor) {
      setActiveAnchor(nextAnchor);
      sessionStorage.removeItem("runsee-return-hash");
    }
  }, []);

  const availableSports = useMemo(
    () => getAvailableSportGroups(activities, { groupSports: dashboardState.options.groupSports }),
    [activities, dashboardState.options.groupSports],
  );

  useEffect(() => {
    if (dashboardState.filters.sportGroup === "all") return;
    if (!availableSports.includes(dashboardState.filters.sportGroup)) {
      dashboardActions.setFilter("sportGroup", "all");
    }
  }, [availableSports, dashboardState.filters.sportGroup, dashboardActions]);

  const filteredActivities = useMemo(
    () => filterActivities(activities, dashboardState.filters, { groupSports: dashboardState.options.groupSports }),
    [activities, dashboardState.filters, dashboardState.options.groupSports],
  );

  const comparisonActivities = useMemo(
    () => filterActivities(activities, { ...dashboardState.filters, dateFrom: "", dateTo: "" }, { groupSports: dashboardState.options.groupSports }),
    [activities, dashboardState.filters, dashboardState.options.groupSports],
  );

  const kpis = useMemo(() => buildKpis(filteredActivities), [filteredActivities]);
  const monthlyVolume = useMemo(
    () => buildMonthlySeries(filteredActivities, { metric: dashboardState.options.monthlyMetric, months: dashboardState.options.monthlyMonths }),
    [filteredActivities, dashboardState.options.monthlyMetric, dashboardState.options.monthlyMonths],
  );
  const weekdayDistribution = useMemo(
    () => buildWeekdayDistribution(filteredActivities, { metric: dashboardState.options.weekdayMetric }),
    [filteredActivities, dashboardState.options.weekdayMetric],
  );
  const sportDistribution = useMemo(
    () => buildSportDistribution(filteredActivities, { groupSports: dashboardState.options.groupSports }),
    [filteredActivities, dashboardState.options.groupSports],
  );
  const rollingLoad = useMemo(() => buildRollingLoadSeries(filteredActivities, { metric: 'distanceKm', days: 120 }), [filteredActivities]);
  const distanceDistribution = useMemo(() => buildDistanceDistribution(filteredActivities), [filteredActivities]);

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
            filters={dashboardState.filters}
            options={dashboardState.options}
            availableSports={availableSports}
            filteredCount={filteredActivities.length}
            totalCount={activities.length}
            onChange={dashboardActions.setFilter}
            onReset={dashboardActions.resetFilters}
            onOptionChange={dashboardActions.setOption}
          />
        </div>

        <div className="section"><KpiGrid kpis={kpis} /></div>

        <div className="section">
          <PeriodComparisonSection
            activities={comparisonActivities}
            mode={dashboardState.options.comparisonMode}
            metric={dashboardState.options.comparisonMetric}
            reference={dashboardState.options.comparisonReference}
            display={dashboardState.options.comparisonDisplay}
            periods={dashboardState.options.comparisonPeriods}
            onModeChange={(value) => dashboardActions.setOption("comparisonMode", value)}
            onMetricChange={(value) => dashboardActions.setOption("comparisonMetric", value)}
            onReferenceChange={(value) => dashboardActions.setOption("comparisonReference", value)}
            onDisplayChange={(value) => dashboardActions.setOption("comparisonDisplay", value)}
            onPeriodsChange={(value) => dashboardActions.setOption("comparisonPeriods", value)}
          />
        </div>

        <div className="section">
          <MonthlyVolumeChart
            data={monthlyVolume}
            metric={dashboardState.options.monthlyMetric}
            display={dashboardState.options.monthlyDisplay}
            months={dashboardState.options.monthlyMonths}
            onMetricChange={(value) => dashboardActions.setOption("monthlyMetric", value)}
            onDisplayChange={(value) => dashboardActions.setOption("monthlyDisplay", value)}
            onMonthsChange={(value) => dashboardActions.setOption("monthlyMonths", value)}
          />
        </div>

        <div className="grid two-columns section">
          <RollingLoadChart data={rollingLoad} metric="distanceKm" />
          <WeekdayDistributionChart
            data={weekdayDistribution}
            metric={dashboardState.options.weekdayMetric}
            onMetricChange={(value) => dashboardActions.setOption("weekdayMetric", value)}
          />
        </div>

        <div className="grid two-columns section">
          <DistanceDistributionChart data={distanceDistribution} />
          <SportDistributionChart data={sportDistribution} groupSports={dashboardState.options.groupSports} />
        </div>

        <div className="section">
          <ActivitiesTable
            activities={filteredActivities}
            groupSports={dashboardState.options.groupSports}
            currentAnchor={activeAnchor}
            onAnchorHandled={() => setActiveAnchor("")}
            currentPage={dashboardState.table.currentPage}
            pageSize={dashboardState.table.pageSize}
            onPageChange={(value) => dashboardActions.setTable("currentPage", value)}
            onPageSizeChange={(value) => {
              dashboardActions.setTable("pageSize", value);
              dashboardActions.setTable("currentPage", 1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
