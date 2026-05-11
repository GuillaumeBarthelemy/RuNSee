import { memo } from "react";
import WeeklyVolumeChart from "../WeeklyVolumeChart.jsx";
import MonthlyVolumeChart from "../MonthlyVolumeChart.jsx";
import PerformanceTrendChart from "../PerformanceTrendChart.jsx";
import TrailSpecificityCard from "../TrailSpecificityCard.jsx";
import PeriodComparisonSection from "../PeriodComparisonSection.jsx";

/**
 * AnalyticsTrendsTab — onglet "Tendances" (Lot 04, plan §4).
 *
 * Vue d'évolution :
 *   - Volume hebdomadaire
 *   - Volume mensuel
 *   - Efficience allure/FC (PerformanceTrendChart)
 *   - Trail specificity (conditionnel, si données trail dispo)
 *   - Comparaison historique (ex-YTD renommé)
 *
 * Aucun calcul métier modifié — réutilisation des composants existants.
 *
 * Note : "YTD" est interdit en libellé utilisateur (V5 §7). La section
 * intro utilise "Comparaison historique". Si le composant
 * PeriodComparisonSection contient "YTD" en interne, c'est un écart
 * séparé du périmètre de cette tab (à corriger dans le composant directement).
 */
function AnalyticsTrendsTab({
  weeklyChartData = [],
  weeklyTrendSourceData = [],
  weeklyChartConfig = {},
  weeklySupportInfo = {},
  weeklyNarrative = "",
  weeklyMetric = "count",
  onWeeklyMetricChange = () => {},

  monthlySeries = [],
  monthlyAxisGranularity = "month",
  monthlyMetric = "distanceKm",
  monthlySupportInfo = {},
  monthlyNarrative = "",
  onMonthlyMetricChange = () => {},

  efficiencyModel = {},
  efficiencyInfo = {},
  efficiencyNarrative = {},

  trailAnalytics = null,
  trailInfo = {},
  analyticsConfidence = null,

  comparisonActivities = [],
  comparisonRange = {},
  comparisonMetric = "distanceKm",
  comparisonSelectedYears = [],
  comparisonSettings = {},
  comparisonScopeText = "",
  comparisonInfo = {},
  onComparisonMetricChange = () => {},
  onComparisonYearsChange = () => {},

  volumeGroupingValue = "rolling",
  onVolumeGroupingChange = () => {},
}) {
  return (
    <div className="alpine-analytics-tab alpine-analytics-tab--trends">
      <div className="alpine-analytics-tab-section alpine-analytics-tab-section--header-row">
        <div>
          <span className="eyebrow">Volume + efficience</span>
          <h2 className="card-title">Volume, régularité et efficience</h2>
          <p className="card-subtitle">Évolution du volume et rendement cardio.</p>
        </div>
        <label className="inline-field">
          <span className="field-label inline-label">Découpage</span>
          <select
            className="field-input field-input-small"
            value={volumeGroupingValue}
            onChange={(e) => onVolumeGroupingChange(e.target.value)}
          >
            <option value="rolling">Glissante</option>
            <option value="calendar">Début de semaine / mois</option>
          </select>
        </label>
      </div>

      <div className="alpine-analytics-tab-section">
        <div className="grid two-columns">
          <WeeklyVolumeChart
            data={weeklyChartData}
            trendSourceData={weeklyTrendSourceData}
            title={weeklyChartConfig.title}
            subtitle={weeklyChartConfig.subtitle}
            info={weeklySupportInfo}
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
              { value: "count", label: "Séances" },
              { value: "distanceKm", label: "Km" },
            ]}
            selectedMetric={weeklyMetric}
            onMetricChange={onWeeklyMetricChange}
            insight={weeklyNarrative}
          />

          <MonthlyVolumeChart
            data={monthlySeries}
            title="Analyse mensuelle"
            subtitle=""
            info={monthlySupportInfo}
            metric={monthlyMetric}
            granularity={monthlyAxisGranularity}
            display="bar"
            months={monthlySeries.length}
            showControls
            showMetricControl
            showDisplayControl={false}
            showMonthsControl={false}
            metricControlLabel="Mesure"
            allowedMetrics={["distanceKm", "load"]}
            onMetricChange={onMonthlyMetricChange}
            insight={monthlyNarrative}
          />
        </div>

        <div className="top-gap-lg">
          <PerformanceTrendChart
            data={efficiencyModel.chartData}
            title="Efficience allure / FC"
            subtitle="Ratio allure / FC : tendance d'efficience aérobie."
            info={efficiencyInfo}
            granularity={efficiencyModel.granularity}
            insight={efficiencyNarrative.headline}
          />
        </div>
      </div>

      {trailAnalytics && trailAnalytics.hasData ? (
        <div className="alpine-analytics-tab-section">
          <div className="analysis-section-intro">
            <span className="eyebrow">Trail</span>
            <h2 className="card-title">Spécificité trail</h2>
            <p className="card-subtitle">Lecture terrain et charge musculaire potentielle.</p>
          </div>
          <TrailSpecificityCard
            model={trailAnalytics}
            info={trailInfo}
            confidence={analyticsConfidence}
          />
        </div>
      ) : null}

      <div className="alpine-analytics-tab-section">
        <div className="analysis-section-intro">
          <span className="eyebrow">Comparaison historique</span>
          <h2 className="card-title">Comparaison historique</h2>
          <p className="card-subtitle">Vos années comparées à date — cumul annuel.</p>
        </div>
        <PeriodComparisonSection
          activities={comparisonActivities}
          currentRange={comparisonRange}
          chartMetric={comparisonMetric}
          selectedYears={comparisonSelectedYears}
          settings={comparisonSettings}
          scopeText={comparisonScopeText}
          info={comparisonInfo}
          onChartMetricChange={onComparisonMetricChange}
          onSelectedYearsChange={onComparisonYearsChange}
        />
      </div>
    </div>
  );
}

export default memo(AnalyticsTrendsTab);
