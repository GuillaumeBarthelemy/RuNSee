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
import { filterActivities } from "../utils/activityAggregations.js";
import { buildRegularitySummary } from "../utils/activityInsights.js";
import { getAnalyticsGranularity } from "../utils/analyticsPeriods.js";
import {
  buildConsolidatedIntensityDistributionModel,
  buildEfficiencyHistoryModel,
  buildTrainingLoadStateModel,
} from "../utils/trainingMetrics.js";
import { buildLoadDynamicsProfile } from "../utils/loadDynamics.js";
import { buildRecoveryViewModel } from "../utils/recoveryViewModel.js";
import { getGarminRecoverySnapshots } from "../services/externalProvider.service.js";
// computeTrainingStateScore conservé dans utils mais plus consommé par Vue
// d'ensemble (bandeau retiré, décision §1). Util laissé en place pour usage
// futur éventuel sans casser la base scientifique.

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

  // Onglet actif (hash URL) — calcule tot pour ne construire QUE les modeles
  // du sous-onglet affiche (perf : evite de calculer 7 modeles sur 980
  // activites a chaque ouverture).
  const hash = location.hash.replace(/^#/, "");
  const activeTabId = ANALYTICS_TABS.some((t) => t.id === hash) ? hash : "overview";
  const needOverview = activeTabId === "overview";

  // ---------------------------------------------------------------------------
  // View models (calculs métier intacts) — calcul paresseux par sous-onglet
  // ---------------------------------------------------------------------------

  const trainingLoadModel = useMemo(
    () => (needOverview ? buildTrainingLoadStateModel(analyticsScopeActivities, {
      startDate: sharedRange.start,
      endDate: sharedRange.end,
      granularity: chartGranularity,
      weekStartsOn: options.userWeekStartsOn,
      settings: trainingAnalyticsSettings,
    }) : null),
    [needOverview, analyticsScopeActivities, chartGranularity, options.userWeekStartsOn, sharedRange.end, sharedRange.start, trainingAnalyticsSettings],
  );

  // Modèle de charge sur 1 an glissant pour l'onglet Charges : permet au
  // sélecteur local (6 sem / 3 mois / 6 mois / 1 an) de filtrer indépendamment
  // de la période globale "1-31 mai". Le coût est négligeable (même calcul
  // que ci-dessus mais sur un range plus large).
  const chargesTrainingLoadModel = useMemo(
    () => (activeTabId === "charges" ? buildTrainingLoadStateModel(analyticsScopeActivities, {
      startDate: addDays(sharedRange.end, -365),
      endDate: sharedRange.end,
      granularity: "day",
      weekStartsOn: options.userWeekStartsOn,
      settings: trainingAnalyticsSettings,
    }) : null),
    [activeTabId, analyticsScopeActivities, options.userWeekStartsOn, sharedRange.end, trainingAnalyticsSettings],
  );

  const efficiencyModel = useMemo(
    () => (needOverview ? buildEfficiencyHistoryModel(analyticsScopeActivities, {
      startDate: sharedRange.start,
      endDate: sharedRange.end,
      granularity: chartGranularity,
      settings: trainingAnalyticsSettings,
      weekStartsOn: options.userWeekStartsOn,
    }) : null),
    [needOverview, analyticsScopeActivities, chartGranularity, options.userWeekStartsOn, sharedRange.end, sharedRange.start, trainingAnalyticsSettings],
  );

  const intensityModel = useMemo(
    () => ((needOverview || activeTabId === "intensites") ? buildConsolidatedIntensityDistributionModel(analyticsActivities, {
      startDate: sharedRange.start,
      endDate: sharedRange.end,
      settings: trainingAnalyticsSettings,
    }) : null),
    [needOverview, activeTabId, analyticsActivities, sharedRange.end, sharedRange.start, trainingAnalyticsSettings],
  );

  const periodWeeks = Math.max(1, Math.ceil(sharedRange.days / 7));
  const analyticsVolumeGrouping = options.analyticsVolumeGrouping === "calendar" ? "calendar" : "rolling";
  const weeklySummary = useMemo(
    () => ((needOverview || activeTabId === "charges") ? buildRegularitySummary(analyticsScopeActivities, {
      weeks: periodWeeks,
      startDate: sharedRange.start,
      endDate: sharedRange.end,
      weekStartsOn: options.userWeekStartsOn,
      viewMode: analyticsVolumeGrouping,
      settings: trainingAnalyticsSettings,
    }) : null),
    [needOverview, activeTabId, analyticsScopeActivities, analyticsVolumeGrouping, options.userWeekStartsOn, periodWeeks, sharedRange.end, sharedRange.start, trainingAnalyticsSettings],
  );

  const loadDynamicsProfile = useMemo(
    () => (needOverview ? buildLoadDynamicsProfile({ loadModel: trainingLoadModel, efficiencyModel }) : null),
    [needOverview, trainingLoadModel, efficiencyModel],
  );

  const recoveryVm = useMemo(
    () => (activeTabId === "recuperation" ? buildRecoveryViewModel(recoverySnapshots) : null),
    [activeTabId, recoverySnapshots],
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
          trainingLoadModel={trainingLoadModel}
          efficiencyModel={efficiencyModel}
          intensityModel={intensityModel}
          loadDynamicsProfile={loadDynamicsProfile}
          weeklySummary={weeklySummary}
          analyticsActivities={analyticsActivities}
          sharedRangeEnd={sharedRange.end}
        />
      ) : null}

      {activeTabId === "charges" ? (
        <AnalyticsChargesTab
          trainingLoadModel={chargesTrainingLoadModel}
          weeklySummary={weeklySummary}
          sharedRangeEnd={sharedRange.end}
        />
      ) : null}

      {activeTabId === "tendances" ? (
        <AnalyticsTrendsTab
          activities={analyticsScopeActivities}
          sharedRange={sharedRange}
          sharedRangeEnd={sharedRange.end}
        />
      ) : null}

      {activeTabId === "intensites" ? (
        <AnalyticsIntensitiesTab
          intensityModel={intensityModel}
          activities={analyticsScopeActivities}
          sharedRange={sharedRange}
          sharedRangeEnd={sharedRange.end}
          trainingAnalyticsSettings={trainingAnalyticsSettings}
        />
      ) : null}

      {activeTabId === "recuperation" ? (
        <AnalyticsRecoveryTab
          recoveryVm={recoveryVm}
          snapshots={recoverySnapshots}
          sharedRangeEnd={sharedRange.end}
        />
      ) : null}
    </AppShell>
  );
}
