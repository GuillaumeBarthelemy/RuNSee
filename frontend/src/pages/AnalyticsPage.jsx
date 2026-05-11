import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AnalyticsCompactFilters from "../components/analytics/AnalyticsCompactFilters.jsx";
import AnalyticsOverviewTab from "../components/analytics/AnalyticsOverviewTab.jsx";
import AnalyticsChargesTab from "../components/analytics/AnalyticsChargesTab.jsx";
import AnalyticsTrendsTab from "../components/analytics/AnalyticsTrendsTab.jsx";
import AnalyticsIntensitiesTab from "../components/analytics/AnalyticsIntensitiesTab.jsx";
import AnalyticsRecoveryTab from "../components/analytics/AnalyticsRecoveryTab.jsx";
import SubTabs from "../components/visuals/alpine/SubTabs.jsx";
import {
  TRAINING_MVP_ADVANCED_SIGNAL_INFO,
  TRAINING_MVP_KPI_INFO,
  TRAINING_MVP_LOAD_DYNAMICS_SIGNAL_INFO,
  TRAINING_MVP_SECTION_INFO,
} from "../content/trainingMvpCopy.js";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import AppShell from "../layouts/AppShell.jsx";
import { buildMonthlySeries, filterActivities } from "../utils/activityAggregations.js";
import { buildAnalyticsConfidence } from "../utils/analysisConfidence.js";
import { buildCriticalSpeed, buildRegularitySummary } from "../utils/activityInsights.js";
import { getAnalyticsGranularity } from "../utils/analyticsPeriods.js";
import {
  buildConsolidatedIntensityDistributionModel,
  buildEfficiencyHistoryModel,
  buildTrainingLoadStateModel,
} from "../utils/trainingMetrics.js";
import {
  buildEfficiencyInterpretation,
  buildIntensityNarrative,
  buildLoadChartNarrative,
  buildMonthlyVolumeNarrative,
  buildWeeklyVolumeNarrative,
} from "../utils/performanceNarratives.js";
import {
  buildIntensityPolarizationProfile,
  buildLoadVarianceProfile,
} from "../utils/trainingIntelligence.js";
import { buildLoadDynamicsProfile } from "../utils/loadDynamics.js";
import { buildRecoveryCorrelationDataset } from "../utils/recoveryCorrelations.js";
import { buildRecoveryViewModel } from "../utils/recoveryViewModel.js";
import { getGarminRecoverySnapshots } from "../services/externalProvider.service.js";
import { buildTrailAnalyticsSummary } from "../utils/trailProfile.js";
import { computeTrainingStateScore } from "../utils/analyticsTrainingState.js";

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

const ANALYTICS_TABS = [
  { id: "overview",     label: "Vue d'ensemble" },
  { id: "charges",      label: "Charges" },
  { id: "tendances",    label: "Tendances" },
  { id: "intensites",   label: "Intensités" },
  { id: "recuperation", label: "Sommeil & récupération" },
];

/**
 * AnalyticsPage — Alpine Light (Lot 04 V5 strict).
 *
 * Orchestrateur 5 sous-onglets (plan §4) :
 *   #overview · #charges · #tendances · #intensites · #recuperation
 *
 * Les view models sont calculés une seule fois ici et passés en props
 * aux composants tabs. Aucun calcul métier dans les tabs.
 *
 * Anti-régression :
 *  - Calculs CTL/ATL/TSB/zones/efficience tous intacts (utils existants).
 *  - Filtres partagés via useActivityViewModel (filterActivities intact).
 *  - AnalyticsFiltersBar (volumineuse) plus utilisée → AnalyticsCompactFilters.
 *  - Vocabulaire FR canonique : "Analyse" (pas "Tendance"), "Comparaison
 *    historique" (pas "YTD"), accents partout.
 */
export default function AnalyticsPage() {
  const location = useLocation();
  const {
    error,
    isLoading,
    safeActivities,
    sharedRange,
    filters,
    options,
    availableSports,
    trainingAnalyticsSettings,
    setFilter,
    resetFilters,
    setOption,
  } = useActivityViewModel({ includeActivities: true });

  const [recoverySnapshots, setRecoverySnapshots] = useState([]);

  useEffect(() => {
    let ignore = false;
    getGarminRecoverySnapshots({ days: 56 })
      .then((data) => {
        if (!ignore && Array.isArray(data?.snapshots)) setRecoverySnapshots(data.snapshots);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  // ---------------------------------------------------------------------------
  // Filtres + scopes activités
  // ---------------------------------------------------------------------------

  const analyticsFilters = useMemo(
    () => ({
      ...filters,
      dateFrom: sharedRange.dateFrom,
      dateTo: sharedRange.dateTo,
    }),
    [filters, sharedRange.dateFrom, sharedRange.dateTo],
  );

  const analyticsActivities = useMemo(
    () => filterActivities(safeActivities, analyticsFilters, { groupSports: options.groupSports }),
    [analyticsFilters, options.groupSports, safeActivities],
  );

  const analyticsScopeActivities = useMemo(
    () =>
      filterActivities(
        safeActivities,
        { ...filters, dateFrom: "", dateTo: "" },
        { groupSports: options.groupSports },
      ),
    [filters, options.groupSports, safeActivities],
  );

  const chartGranularity = getAnalyticsGranularity(sharedRange);

  // ---------------------------------------------------------------------------
  // View models (calculs métier intacts)
  // ---------------------------------------------------------------------------

  const trainingLoadModel = useMemo(
    () => buildTrainingLoadStateModel(analyticsScopeActivities, {
      startDate: sharedRange.start,
      endDate: sharedRange.end,
      granularity: chartGranularity,
      weekStartsOn: options.userWeekStartsOn,
      settings: trainingAnalyticsSettings,
    }),
    [analyticsScopeActivities, chartGranularity, options.userWeekStartsOn, sharedRange.end, sharedRange.start, trainingAnalyticsSettings],
  );

  const efficiencyModel = useMemo(
    () => buildEfficiencyHistoryModel(analyticsScopeActivities, {
      startDate: sharedRange.start,
      endDate: sharedRange.end,
      granularity: chartGranularity,
      settings: trainingAnalyticsSettings,
      weekStartsOn: options.userWeekStartsOn,
    }),
    [analyticsScopeActivities, chartGranularity, options.userWeekStartsOn, sharedRange.end, sharedRange.start, trainingAnalyticsSettings],
  );

  const intensityModel = useMemo(
    () => buildConsolidatedIntensityDistributionModel(analyticsActivities, {
      startDate: sharedRange.start,
      endDate: sharedRange.end,
      settings: trainingAnalyticsSettings,
    }),
    [analyticsActivities, sharedRange.end, sharedRange.start, trainingAnalyticsSettings],
  );

  const periodWeeks = Math.max(1, Math.ceil(sharedRange.days / 7));
  const analyticsVolumeGrouping = options.analyticsVolumeGrouping === "calendar" ? "calendar" : "rolling";
  const weeklySummary = useMemo(
    () => buildRegularitySummary(analyticsScopeActivities, {
      weeks: periodWeeks,
      startDate: sharedRange.start,
      endDate: sharedRange.end,
      weekStartsOn: options.userWeekStartsOn,
      viewMode: analyticsVolumeGrouping,
      settings: trainingAnalyticsSettings,
    }),
    [analyticsScopeActivities, analyticsVolumeGrouping, options.userWeekStartsOn, periodWeeks, sharedRange.end, sharedRange.start, trainingAnalyticsSettings],
  );

  const weeklyChartData = weeklySummary.weeklySeries;
  const weeklyTrendSourceData = useMemo(
    () => buildRegularitySummary(analyticsScopeActivities, {
      weeks: periodWeeks + 3,
      startDate: addDays(sharedRange.start, -21),
      endDate: sharedRange.end,
      weekStartsOn: options.userWeekStartsOn,
      viewMode: analyticsVolumeGrouping,
      settings: trainingAnalyticsSettings,
    }).weeklySeries,
    [analyticsScopeActivities, analyticsVolumeGrouping, options.userWeekStartsOn, periodWeeks, sharedRange.end, sharedRange.start, trainingAnalyticsSettings],
  );

  const analyticsWeeklyMetric = options.analyticsWeeklyMetric === "distanceKm" ? "distanceKm" : "count";
  const analyticsMonthlyMetric = options.analyticsMonthlyMetric === "distanceKm" ? "distanceKm" : "load";
  const analyticsIntensityMetric = options.analyticsHeartRateDistributionMetric === "duration" ? "duration" : "load";

  const monthlySeries = useMemo(
    () => buildMonthlySeries(analyticsActivities, {
      metric: analyticsMonthlyMetric,
      startDate: sharedRange.start,
      endDate: sharedRange.end,
      grouping: analyticsVolumeGrouping,
      settings: trainingAnalyticsSettings,
    }),
    [analyticsActivities, analyticsMonthlyMetric, analyticsVolumeGrouping, sharedRange.end, sharedRange.start, trainingAnalyticsSettings],
  );
  const monthlyAxisGranularity = analyticsVolumeGrouping === "calendar" ? "month" : "day";

  const loadChartNarrative = useMemo(() => buildLoadChartNarrative(trainingLoadModel), [trainingLoadModel]);
  const efficiencyNarrative = useMemo(() => buildEfficiencyInterpretation(efficiencyModel), [efficiencyModel]);
  const intensityNarrative = useMemo(
    () => buildIntensityNarrative(intensityModel, analyticsIntensityMetric),
    [analyticsIntensityMetric, intensityModel],
  );
  const weeklyNarrative = useMemo(
    () => buildWeeklyVolumeNarrative(weeklyChartData, analyticsWeeklyMetric, analyticsVolumeGrouping),
    [analyticsWeeklyMetric, analyticsVolumeGrouping, weeklyChartData],
  );
  const monthlyNarrative = useMemo(
    () => buildMonthlyVolumeNarrative(monthlySeries, analyticsMonthlyMetric, analyticsVolumeGrouping),
    [analyticsMonthlyMetric, analyticsVolumeGrouping, monthlySeries],
  );

  const loadVarianceModel = useMemo(
    () => buildLoadVarianceProfile(analyticsScopeActivities, {
      endDate: sharedRange.end,
      settings: trainingAnalyticsSettings,
    }),
    [analyticsScopeActivities, sharedRange.end, trainingAnalyticsSettings],
  );

  const polarizationModel = useMemo(
    () => buildIntensityPolarizationProfile(intensityModel, analyticsIntensityMetric),
    [analyticsIntensityMetric, intensityModel],
  );

  const criticalSpeedModel = useMemo(
    () => buildCriticalSpeed(analyticsScopeActivities, { settings: trainingAnalyticsSettings }),
    [analyticsScopeActivities, trainingAnalyticsSettings],
  );

  const loadDynamicsProfile = useMemo(
    () => buildLoadDynamicsProfile({ loadModel: trainingLoadModel, efficiencyModel }),
    [trainingLoadModel, efficiencyModel],
  );

  const recoveryCorrelation = useMemo(
    () => buildRecoveryCorrelationDataset(recoverySnapshots, trainingLoadModel.chartData || [], 56),
    [recoverySnapshots, trainingLoadModel.chartData],
  );

  const recoveryVm = useMemo(
    () => buildRecoveryViewModel(recoverySnapshots),
    [recoverySnapshots],
  );

  const trailAnalytics = useMemo(
    () => buildTrailAnalyticsSummary(analyticsActivities),
    [analyticsActivities],
  );

  const analyticsConfidence = useMemo(
    () => buildAnalyticsConfidence({
      activities: analyticsScopeActivities,
      periodActivities: analyticsActivities,
      trailModel: trailAnalytics,
      recoverySnapshots,
      referenceDate: sharedRange.end,
    }),
    [analyticsActivities, analyticsScopeActivities, recoverySnapshots, sharedRange.end, trailAnalytics],
  );

  // Score composite état d'entraînement (Lot 04 ajout C)
  const tsbValue = trainingLoadModel?.summary?.tsb ?? null;
  const acwrValue = loadDynamicsProfile?.acwrEwma?.value ?? null;
  const monotonyValue = loadVarianceModel?.monotony ?? null;
  const hrvDeltaPct = recoveryVm?.hrv?.deltaPct ?? null;
  const trainingState = useMemo(
    () => computeTrainingStateScore({
      tsb: tsbValue,
      acwr: acwrValue,
      monotony: monotonyValue,
      hrvDeltaPct,
    }),
    [tsbValue, acwrValue, monotonyValue, hrvDeltaPct],
  );

  // ---------------------------------------------------------------------------
  // Wording sections (FR avec accents)
  // ---------------------------------------------------------------------------

  const scopeLabel = filters.sportGroup === "all" ? "tous les sports" : filters.sportGroup;
  const searchNote = filters.search ? ` Recherche active : "${filters.search}".` : "";
  const comparisonScopeText = useMemo(() => {
    const cutoffLabel = sharedRange.end.toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
    });
    return `Cumul annuel au ${cutoffLabel} — ${scopeLabel}.${searchNote}`;
  }, [scopeLabel, searchNote, sharedRange.end]);

  const weeklyChartConfig = useMemo(
    () => (
      analyticsWeeklyMetric === "distanceKm"
        ? {
            title: "Volume hebdomadaire",
            subtitle: "",
            dataKey: "distanceKm",
            name: "Distance",
            unit: "km",
            fill: "#F97316",
            trendLabel: "Moyenne 4 sem.",
            trendColor: "#355886",
            valueFormatter: (value) => `${Number(value || 0).toLocaleString("fr-FR", {
              minimumFractionDigits: 1, maximumFractionDigits: 1,
            })} km`,
          }
        : {
            title: "Séances hebdomadaires",
            subtitle: "",
            dataKey: "count",
            name: "Séances",
            unit: "",
            fill: "#355886",
            trendLabel: "Tendance 4 sem.",
            trendColor: "#F97316",
            valueFormatter: (value) => `${Number(value || 0).toLocaleString("fr-FR", {
              minimumFractionDigits: Number.isInteger(Number(value || 0)) ? 0 : 1,
              maximumFractionDigits: 1,
            })} séance(s)`,
          }
    ),
    [analyticsWeeklyMetric],
  );

  // ---------------------------------------------------------------------------
  // Handlers filtres
  // ---------------------------------------------------------------------------

  const handleSharedPresetChange = (preset) => {
    if (preset === "custom") {
      setOption("sharedPeriodPreset", "custom");
      if (!options.sharedCustomDateFrom) setOption("sharedCustomDateFrom", sharedRange.dateFrom);
      if (!options.sharedCustomDateTo) setOption("sharedCustomDateTo", sharedRange.dateTo);
      return;
    }
    setOption("sharedPeriodPreset", preset);
  };

  const handleResetSharedFilters = () => {
    resetFilters();
    setOption("groupSports", true);
    setOption("sharedPeriodPreset", "90d");
    setOption("sharedCustomDateFrom", "");
    setOption("sharedCustomDateTo", "");
    setOption("comparisonMetric", "load");
    setOption("comparisonSelectedYears", []);
    setOption("analyticsHeartRateDistributionMetric", "load");
    setOption("analyticsVolumeGrouping", "rolling");
  };

  // ---------------------------------------------------------------------------
  // Onglet actif (hash URL)
  // ---------------------------------------------------------------------------

  const hash = location.hash.replace(/^#/, "");
  const activeTabId = ANALYTICS_TABS.some((t) => t.id === hash) ? hash : "overview";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppShell
      eyebrow="Analyse"
      title="Analyse"
      subtitle="Lecture détaillée de votre entraînement et de votre récupération."
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !safeActivities.length ? (
        <div className="card section">Chargement des analyses…</div>
      ) : null}

      <AnalyticsCompactFilters
        search={filters.search}
        sportGroup={filters.sportGroup}
        preset={options.sharedPeriodPreset}
        periodLabel={sharedRange.label}
        availableSports={availableSports}
        filteredCount={analyticsActivities.length}
        totalCount={analyticsScopeActivities.length}
        onSearchChange={(value) => setFilter("search", value)}
        onSportChange={(value) => setFilter("sportGroup", value)}
        onPresetChange={handleSharedPresetChange}
        onReset={handleResetSharedFilters}
      />

      <SubTabs tabs={ANALYTICS_TABS} defaultTabId="overview" />

      {activeTabId === "overview" ? (
        <AnalyticsOverviewTab
          trainingState={trainingState}
          trainingLoadModel={trainingLoadModel}
          efficiencyModel={efficiencyModel}
          intensityModel={intensityModel}
          loadDynamicsProfile={loadDynamicsProfile}
          weeklySummary={weeklySummary}
          analyticsActivities={analyticsActivities}
        />
      ) : null}

      {activeTabId === "charges" ? (
        <AnalyticsChargesTab
          trainingLoadModel={trainingLoadModel}
          loadVarianceModel={loadVarianceModel}
          polarizationModel={polarizationModel}
          loadDynamicsProfile={loadDynamicsProfile}
          criticalSpeedModel={criticalSpeedModel}
          signalInfo={TRAINING_MVP_ADVANCED_SIGNAL_INFO}
          loadDynamicsInfo={TRAINING_MVP_LOAD_DYNAMICS_SIGNAL_INFO}
          dynamicsCardInfo={TRAINING_MVP_SECTION_INFO.dynamicsGrid}
          loadChartInfo={TRAINING_MVP_SECTION_INFO.loadChart}
          loadChartNarrative={loadChartNarrative}
        />
      ) : null}

      {activeTabId === "tendances" ? (
        <AnalyticsTrendsTab
          weeklyChartData={weeklyChartData}
          weeklyTrendSourceData={weeklyTrendSourceData}
          weeklyChartConfig={weeklyChartConfig}
          weeklySupportInfo={TRAINING_MVP_SECTION_INFO.weeklySupport}
          weeklyNarrative={weeklyNarrative}
          weeklyMetric={analyticsWeeklyMetric}
          onWeeklyMetricChange={(value) => setOption("analyticsWeeklyMetric", value)}

          monthlySeries={monthlySeries}
          monthlyAxisGranularity={monthlyAxisGranularity}
          monthlyMetric={analyticsMonthlyMetric}
          monthlySupportInfo={TRAINING_MVP_SECTION_INFO.monthlySupport}
          monthlyNarrative={monthlyNarrative}
          onMonthlyMetricChange={(value) => setOption("analyticsMonthlyMetric", value)}

          efficiencyModel={efficiencyModel}
          efficiencyInfo={TRAINING_MVP_SECTION_INFO.efficiencyChart}
          efficiencyNarrative={efficiencyNarrative}

          trailAnalytics={trailAnalytics}
          trailInfo={TRAINING_MVP_SECTION_INFO.trailSpecificity}
          analyticsConfidence={analyticsConfidence}

          comparisonActivities={analyticsScopeActivities}
          comparisonRange={sharedRange}
          comparisonMetric={options.comparisonMetric}
          comparisonSelectedYears={options.comparisonSelectedYears}
          comparisonSettings={trainingAnalyticsSettings}
          comparisonScopeText={comparisonScopeText}
          comparisonInfo={TRAINING_MVP_SECTION_INFO.comparison}
          onComparisonMetricChange={(value) => setOption("comparisonMetric", value)}
          onComparisonYearsChange={(value) => setOption("comparisonSelectedYears", value)}

          volumeGroupingValue={analyticsVolumeGrouping}
          onVolumeGroupingChange={(value) => setOption("analyticsVolumeGrouping", value)}
        />
      ) : null}

      {activeTabId === "intensites" ? (
        <AnalyticsIntensitiesTab
          intensityModel={intensityModel}
          polarizationModel={polarizationModel}
          intensityInfo={TRAINING_MVP_SECTION_INFO.intensity}
          intensityNarrative={intensityNarrative}
          selectedMetric={analyticsIntensityMetric}
          metricOptions={[
            { value: "load",     label: "Charge" },
            { value: "duration", label: "Durée" },
          ]}
          onMetricChange={(value) => setOption("analyticsHeartRateDistributionMetric", value)}
        />
      ) : null}

      {activeTabId === "recuperation" ? (
        <AnalyticsRecoveryTab
          recoveryVm={recoveryVm}
          recoveryCorrelation={recoveryCorrelation}
          activities={analyticsScopeActivities}
          snapshots={recoverySnapshots}
        />
      ) : null}
    </AppShell>
  );
}
