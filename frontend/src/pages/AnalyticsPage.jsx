import { useMemo } from "react";
import AnalyticsFiltersBar from "../components/AnalyticsFiltersBar.jsx";
import DynamicsGrid from "../components/DynamicsGrid.jsx";
import MonthlyVolumeChart from "../components/MonthlyVolumeChart.jsx";
import PerformanceTrendChart from "../components/PerformanceTrendChart.jsx";
import PeriodComparisonSection from "../components/PeriodComparisonSection.jsx";
import RollingLoadChart from "../components/RollingLoadChart.jsx";
import TrainingSummaryKpiGrid from "../components/TrainingSummaryKpiGrid.jsx";
import WeeklyVolumeChart from "../components/WeeklyVolumeChart.jsx";
import ZoneLoadDistributionCard from "../components/ZoneLoadDistributionCard.jsx";
import { SHARED_FILTER_COPY } from "../content/analyticsCopy.js";
import {
  TRAINING_MVP_ADVANCED_SIGNAL_INFO,
  TRAINING_MVP_KPI_INFO,
  TRAINING_MVP_LOAD_DYNAMICS_SIGNAL_INFO,
  TRAINING_MVP_SECTION_INFO,
} from "../content/trainingMvpCopy.js";
import useActivityViewModel from "../hooks/useActivityViewModel.js";
import AppShell from "../layouts/AppShell.jsx";
import { buildMonthlySeries, filterActivities } from "../utils/activityAggregations.js";
import { buildCurrentAccountModel } from "../utils/accountPresentation.js";
import {
  buildCriticalSpeed,
  buildRegularitySummary,
} from "../utils/activityInsights.js";
import { getAnalyticsGranularity, getAnalyticsPresetLabel } from "../utils/analyticsPeriods.js";
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

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export default function AnalyticsPage() {
  const {
    athlete,
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
  } = useActivityViewModel({
    includeActivities: true,
  });

  const account = useMemo(
    () => buildCurrentAccountModel({ athlete, options }),
    [athlete, options],
  );

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

  const weeklyChartData = useMemo(
    () => weeklySummary.weeklySeries,
    [weeklySummary.weeklySeries],
  );

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

  const loadChartNarrative = useMemo(
    () => buildLoadChartNarrative(trainingLoadModel),
    [trainingLoadModel],
  );
  const efficiencyNarrative = useMemo(
    () => buildEfficiencyInterpretation(efficiencyModel),
    [efficiencyModel],
  );
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
    () => buildLoadDynamicsProfile({
      loadModel: trainingLoadModel,
      efficiencyModel,
    }),
    [trainingLoadModel, efficiencyModel],
  );

  const scopeLabel = filters.sportGroup === "all" ? "tous les sports" : filters.sportGroup;
  const searchNote = filters.search ? ` Recherche active : "${filters.search}".` : "";
  const scopeNote = `Perimetre actuel : ${scopeLabel}.${searchNote} Donnees recalculees sur la selection.`;
  const comparisonScopeText = useMemo(() => {
    const cutoffLabel = sharedRange.end.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return `YTD au ${cutoffLabel} - ${scopeLabel}.${searchNote}`;
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
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })} km`,
          }
        : {
            title: "Seances hebdomadaires",
            subtitle: "",
            dataKey: "count",
            name: "Seances",
            unit: "",
            fill: "#355886",
            trendLabel: "Tendance 4 sem.",
            trendColor: "#F97316",
            valueFormatter: (value) => `${Number(value || 0).toLocaleString("fr-FR", {
              minimumFractionDigits: Number.isInteger(Number(value || 0)) ? 0 : 1,
              maximumFractionDigits: 1,
            })} seance(s)`,
          }
    ),
    [analyticsWeeklyMetric],
  );

  const handleSharedPresetChange = (preset) => {
    if (preset === "custom") {
      setOption("sharedPeriodPreset", "custom");
      if (!options.sharedCustomDateFrom) {
        setOption("sharedCustomDateFrom", sharedRange.dateFrom);
      }
      if (!options.sharedCustomDateTo) {
        setOption("sharedCustomDateTo", sharedRange.dateTo);
      }
      return;
    }

    setOption("sharedPeriodPreset", preset);
  };

  const handleSharedCustomDateChange = (name, value) => {
    setOption("sharedPeriodPreset", "custom");
    setOption(name, value);
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

  return (
    <AppShell
      eyebrow="Tendance"
      title="Tendance"
      subtitle={`Charge, fraicheur, volume et intensites sur ${getAnalyticsPresetLabel(options.sharedPeriodPreset)}.`}
      account={account}
    >
      {error ? <div className="alert alert-error section">{error}</div> : null}
      {isLoading && !safeActivities.length ? <div className="card section">Chargement des analyses...</div> : null}

      <div className="section">
        <AnalyticsFiltersBar
          title="Filtres d'analyse"
          subtitle={SHARED_FILTER_COPY.subtitle}
          resetLabel={SHARED_FILTER_COPY.resetLabel}
          infoContent={SHARED_FILTER_COPY.info}
          preset={options.sharedPeriodPreset}
          rangeLabel={sharedRange.label}
          customDateFrom={options.sharedCustomDateFrom}
          customDateTo={options.sharedCustomDateTo}
          search={filters.search}
          sportGroup={filters.sportGroup}
          groupSports={options.groupSports}
          availableSports={availableSports}
          filteredCount={analyticsActivities.length}
          totalCount={analyticsScopeActivities.length}
          onPresetChange={handleSharedPresetChange}
          onCustomDateChange={handleSharedCustomDateChange}
          onSearchChange={(value) => setFilter("search", value)}
          onSportChange={(value) => setFilter("sportGroup", value)}
          onGroupSportsChange={(value) => setOption("groupSports", value)}
          onReset={handleResetSharedFilters}
          scopeNote={scopeNote}
        />
      </div>

      <div className="analysis-page-stack">
        <div className="section analysis-section-shell">
          <div className="analysis-section-intro">
            <span className="eyebrow analysis-section-kicker">Charge</span>
            <h2 className="card-title">Charge et fraicheur</h2>
            <p className="card-subtitle">Socle, fatigue et marge d'absorption.</p>
          </div>
          <div className="analysis-section-stack">
            <RollingLoadChart
              data={trainingLoadModel.chartData}
              metric="load"
              granularity={trainingLoadModel.granularity}
              title="Charge, base, fatigue et fraicheur"
              subtitle=""
              info={TRAINING_MVP_SECTION_INFO.loadChart}
              shortKey="atl"
              longKey="ctl"
              freshnessKey="tsb"
              shortLabel="Fatigue recente"
              longLabel="Base de fond"
              freshnessLabel="Fraicheur"
              barKey="load"
              barLabel="Charge jour"
              showFreshness
              showBar
              showFreshnessZones
              insight={loadChartNarrative}
            />

            <TrainingSummaryKpiGrid
              loadModel={trainingLoadModel}
              efficiencyModel={efficiencyModel}
              infoMap={TRAINING_MVP_KPI_INFO}
              includeEfficiency={false}
              className="kpi-grid kpi-grid-primary"
              showHints={false}
              showMeta={false}
            />
          </div>
        </div>

        <div className="section analysis-section-shell">
          <DynamicsGrid
            loadVarianceModel={loadVarianceModel}
            polarizationModel={polarizationModel}
            loadDynamicsProfile={loadDynamicsProfile}
            criticalSpeedModel={criticalSpeedModel}
            signalInfo={TRAINING_MVP_ADVANCED_SIGNAL_INFO}
            loadDynamicsInfo={TRAINING_MVP_LOAD_DYNAMICS_SIGNAL_INFO}
            cardInfo={TRAINING_MVP_SECTION_INFO.dynamicsGrid}
          />
        </div>

        <div className="section analysis-section-shell">
          <div className="analysis-section-header-row">
            <div className="analysis-section-intro">
              <span className="eyebrow analysis-section-kicker">Volume + efficience</span>
              <h2 className="card-title">Volume, regularite et efficience</h2>
              <p className="card-subtitle">Volume et rendement cardio.</p>
            </div>
            <div className="analysis-section-controls">
              <label className="inline-field">
                <span className="field-label inline-label">Decoupage</span>
                <select
                  className="field-input field-input-small"
                  value={analyticsVolumeGrouping}
                  onChange={(event) => setOption("analyticsVolumeGrouping", event.target.value)}
                >
                  <option value="rolling">Glissante</option>
                  <option value="calendar">Debut de semaine / mois</option>
                </select>
              </label>
            </div>
          </div>
          <div className="grid two-columns">
            <WeeklyVolumeChart
              data={weeklyChartData}
              trendSourceData={weeklyTrendSourceData}
              title={weeklyChartConfig.title}
              subtitle={weeklyChartConfig.subtitle}
              info={TRAINING_MVP_SECTION_INFO.weeklySupport}
              dataKey={weeklyChartConfig.dataKey}
              name={weeklyChartConfig.name}
              unit={weeklyChartConfig.unit}
              fill={weeklyChartConfig.fill}
              showTrendLine
              trendWindow={4}
              requireFullTrendWindow
              trendLabel={weeklyChartConfig.trendLabel}
              trendColor={weeklyChartConfig.trendColor}
              valueFormatter={weeklyChartConfig.valueFormatter}
              showMetricControl
              metricControlLabel="Mesure"
              metricOptions={[
                { value: "count", label: "Seances" },
                { value: "distanceKm", label: "Km" },
              ]}
              selectedMetric={analyticsWeeklyMetric}
              onMetricChange={(value) => setOption("analyticsWeeklyMetric", value)}
              insight={weeklyNarrative}
            />
            <MonthlyVolumeChart
              data={monthlySeries}
              title="Analyse mensuelle"
              subtitle=""
              info={TRAINING_MVP_SECTION_INFO.monthlySupport}
              metric={analyticsMonthlyMetric}
              granularity={monthlyAxisGranularity}
              display="bar"
              months={monthlySeries.length}
              showControls
              showMetricControl
              showDisplayControl={false}
              showMonthsControl={false}
              metricControlLabel="Mesure"
              allowedMetrics={["distanceKm", "load"]}
              onMetricChange={(value) => setOption("analyticsMonthlyMetric", value)}
              insight={monthlyNarrative}
            />
          </div>
          <div className="top-gap-lg">
            <PerformanceTrendChart
              data={efficiencyModel.chartData}
              title="Efficience allure / FC"
              subtitle=""
              info={TRAINING_MVP_SECTION_INFO.efficiencyChart}
              granularity={efficiencyModel.granularity}
              insight={efficiencyNarrative.headline}
            />
          </div>
        </div>

        <div className="section analysis-section-shell">
          <div className="analysis-section-intro">
            <span className="eyebrow analysis-section-kicker">Intensites</span>
            <h2 className="card-title">Repartition des intensites</h2>
            <p className="card-subtitle">Charge ou duree par zone.</p>
          </div>
          <ZoneLoadDistributionCard
            model={intensityModel}
            title="Repartition des intensites"
            subtitle=""
            info={TRAINING_MVP_SECTION_INFO.intensity}
            accentColor="#F97316"
            selectedMetric={analyticsIntensityMetric}
            metricControlLabel="Mesure"
            metricOptions={[
              { value: "load", label: "Charge" },
              { value: "duration", label: "Duree" },
            ]}
            onMetricChange={(value) => setOption("analyticsHeartRateDistributionMetric", value)}
            insight={intensityNarrative}
          />
        </div>

        <div className="section analysis-section-shell">
          <div className="analysis-section-intro">
            <span className="eyebrow analysis-section-kicker">Comparaison YTD</span>
            <h2 className="card-title">Comparaison historique / YTD</h2>
            <p className="card-subtitle">Tes annees comparees a date.</p>
          </div>
          <PeriodComparisonSection
            activities={analyticsScopeActivities}
            currentRange={sharedRange}
            chartMetric={options.comparisonMetric}
            selectedYears={options.comparisonSelectedYears}
            settings={trainingAnalyticsSettings}
            scopeText={comparisonScopeText}
            info={TRAINING_MVP_SECTION_INFO.comparison}
            onChartMetricChange={(value) => setOption("comparisonMetric", value)}
            onSelectedYearsChange={(value) => setOption("comparisonSelectedYears", value)}
          />
        </div>

      </div>
    </AppShell>
  );
}
