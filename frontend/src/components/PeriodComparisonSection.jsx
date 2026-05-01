import { memo, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useChartViewport from "../hooks/useChartViewport.js";
import { buildTemporalAxisConfig } from "../utils/chartAxis.js";
import {
  buildPeriodComparisonModel,
  formatPeriodComparisonMetricValue,
  normalizePeriodComparisonMetric,
  PERIOD_COMPARISON_METRIC_OPTIONS,
} from "../utils/periodComparison.js";
import { buildPeriodComparisonNarrative } from "../utils/performanceNarratives.js";
import InfoTooltip from "./InfoTooltip.jsx";

const noop = () => {};

function toAlphaColor(hexColor, alpha) {
  const safeHex = String(hexColor || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(safeHex)) {
    return `rgba(53, 88, 134, ${alpha})`;
  }

  const red = Number.parseInt(safeHex.slice(0, 2), 16);
  const green = Number.parseInt(safeHex.slice(2, 4), 16);
  const blue = Number.parseInt(safeHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function DeltaCell({ value, metric }) {
  if (value === null || value === undefined) {
    return <span className="comparison-empty-value">Ø</span>;
  }

  return (
    <span className={value >= 0 ? "delta-positive" : "delta-negative"}>
      {formatPeriodComparisonMetricValue(value, metric, { signed: true, emptyValue: "Ø" })}
    </span>
  );
}

function ComparisonTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0]?.payload || {};

  return (
    <div className="chart-tooltip comparison-tooltip">
      <strong>{entry.fullLabel || entry.label || label}</strong>
      <div className="comparison-tooltip-list">
        {payload.map((item) => (
          <div key={item.dataKey} className="comparison-tooltip-item">
            <span className="comparison-tooltip-dot" style={{ background: item.color }} />
            <span>{item.name}</span>
            <strong>{formatPeriodComparisonMetricValue(item.value || 0, metric)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function PeriodComparisonSection({
  activities = [],
  currentRange = null,
  chartMetric = "distanceKm",
  selectedYears = [],
  settings = null,
  scopeText = "",
  info = [],
  onChartMetricChange = noop,
  onSelectedYearsChange = noop,
}) {
  const { containerRef, chartWidth, axisTick, showLegend } = useChartViewport();
  const safeChartMetric = normalizePeriodComparisonMetric(chartMetric);
  const model = useMemo(
    () => buildPeriodComparisonModel(activities, {
      currentRange,
      chartMetric: safeChartMetric,
      selectedYears,
      settings,
    }),
    [activities, currentRange, safeChartMetric, selectedYears, settings],
  );
  const narrative = useMemo(() => buildPeriodComparisonNarrative(model), [model]);

  const hasRows = model.rows.length > 0;
  const axisConfig = useMemo(
    () => buildTemporalAxisConfig({
      data: model.chartData,
      width: chartWidth,
      granularity: model.chartGranularity || "daily",
      dateKey: "periodDate",
      fallbackKey: "label",
    }),
    [chartWidth, model.chartData, model.chartGranularity],
  );
  const yAxisWidth = chartWidth > 0 && chartWidth < 520 ? 42 : chartWidth > 0 && chartWidth < 860 ? 50 : 64;

  const handleYearToggle = (year) => {
    if (year === model.anchorYear) {
      return;
    }

    const nextYears = model.selectedYears.includes(year)
      ? model.selectedYears.filter((selectedYear) => selectedYear !== year)
      : [...model.selectedYears, year].sort((left, right) => right - left);

    onSelectedYearsChange(nextYears);
  };

  return (
    <section className="card chart-card comparison-card-shell">
      <div className="card-header-row wrap-on-mobile comparison-header-row">
        <div className="comparison-header-copy">
          <div className="title-with-info">
            <h2 className="card-title">Comparaison YTD</h2>
            <InfoTooltip title="Comparaison YTD" content={info} label="Afficher l'aide pour la comparaison YTD" />
          </div>
          <p className="card-subtitle">Du 1er janvier au {model.cutoffLabel || "jour de coupure"}.</p>
          {scopeText ? <p className="comparison-scope">{scopeText}</p> : null}
        </div>

        <div className="chart-controls comparison-controls">
          <label className="inline-field">
            <span className="field-label inline-label">Mesure</span>
            <select className="field-input field-input-small" value={safeChartMetric} onChange={(event) => onChartMetricChange(event.target.value)}>
              {PERIOD_COMPARISON_METRIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {model.availableYears.length ? (
        <div className="comparison-year-filter">
          <span className="comparison-year-filter-label">Annees YTD</span>
          {model.availableYears.map((year) => {
            const period = model.periods.find((entry) => entry.year === year);
            const color = period?.color || "#7B8CA3";
            const isSelected = model.selectedYears.includes(year);
            const isLocked = year === model.anchorYear;

            return (
              <button
                key={year}
                type="button"
                className={`comparison-year-pill ${isSelected ? "is-active" : ""} ${isLocked ? "is-locked" : ""}`.trim()}
                style={{
                  "--comparison-year-color": color,
                  "--comparison-year-bg": toAlphaColor(color, isSelected ? 0.14 : 0.08),
                  "--comparison-year-border": toAlphaColor(color, isSelected ? 0.34 : 0.14),
                }}
                onClick={() => handleYearToggle(year)}
                disabled={isLocked}
                aria-pressed={isSelected}
                aria-label={isLocked ? `Annee de reference ${year}` : `Afficher ou masquer ${year}`}
              >
                <span className="comparison-year-pill-dot" />
                <span>{year}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {narrative ? <div className="alert alert-info comparison-insight-banner">{narrative}</div> : null}

      {!model.hasData || !hasRows ? (
        <div className="empty-state">Aucune donnee exploitable pour comparer les annees en YTD sur ce perimetre.</div>
      ) : (
        <div className="comparison-stack">
          <div className="comparison-panel comparison-summary-panel">
            <div className="comparison-panel-head">
              <div>
                <h3 className="subcard-title">Tableau de comparaison</h3>
                <p className="card-subtitle">Ecarts par annee.</p>
              </div>
            </div>

            <div className="table-wrapper comparison-table-shell">
              <table className="table compact-table comparison-table comparison-table-summary">
                <thead>
                  <tr>
                    <th>Annee</th>
                    <th>{model.chartLabel}</th>
                    <th>Delta annee prec.</th>
                    <th>Delta vs {model.anchorYear}</th>
                  </tr>
                </thead>
                <tbody>
                  {model.rows.map((row) => (
                    <tr key={row.key}>
                      <td>
                        <div className="comparison-year-cell" style={{ "--comparison-row-color": row.color }}>
                          <span className="comparison-year-cell-dot" />
                          <strong className="comparison-year-cell-label">{row.year}</strong>
                        </div>
                      </td>
                      <td>{formatPeriodComparisonMetricValue(row.value, model.chartMetric)}</td>
                      <td><DeltaCell value={row.deltaPrevYear} metric={model.chartMetric} /></td>
                      <td><DeltaCell value={row.deltaWithCurrentYear} metric={model.chartMetric} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="comparison-mobile-cards">
              {model.rows.map((row) => (
                <article key={row.key} className="comparison-mobile-card">
                  <div className="comparison-mobile-header">
                    <div className="comparison-year-cell" style={{ "--comparison-row-color": row.color }}>
                      <span className="comparison-year-cell-dot" />
                      <strong className="comparison-year-cell-label">{row.year}</strong>
                    </div>
                  </div>

                  <div className="comparison-mobile-grid">
                    <div className="comparison-mobile-item">
                      <span className="comparison-mobile-label">{model.chartLabel}</span>
                      <strong className="comparison-mobile-value">{formatPeriodComparisonMetricValue(row.value, model.chartMetric)}</strong>
                    </div>
                    <div className="comparison-mobile-item">
                      <span className="comparison-mobile-label">Delta annee prec.</span>
                      <DeltaCell value={row.deltaPrevYear} metric={model.chartMetric} />
                    </div>
                    <div className="comparison-mobile-item">
                      <span className="comparison-mobile-label">Delta vs {model.anchorYear}</span>
                      <DeltaCell value={row.deltaWithCurrentYear} metric={model.chartMetric} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="comparison-panel comparison-chart-panel">
            <div className="comparison-panel-head">
              <div>
                <h3 className="subcard-title">Graphe YTD</h3>
              </div>
            </div>

            <div className="chart-box large-chart comparison-chart-shell" ref={containerRef}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={model.chartData}>
                  <CartesianGrid strokeDasharray="4 7" vertical={false} stroke="rgba(123, 140, 163, 0.16)" />
                  <XAxis
                    dataKey={axisConfig.dataKey}
                    ticks={axisConfig.ticks}
                    tickFormatter={axisConfig.tickFormatter}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={axisConfig.minTickGap}
                    tickMargin={axisConfig.tickMargin}
                    interval={axisConfig.interval}
                    angle={axisConfig.angle}
                    textAnchor={axisConfig.textAnchor}
                    height={axisConfig.height}
                    allowDuplicatedCategory={false}
                  />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={yAxisWidth} />
                  <Tooltip content={<ComparisonTooltip metric={model.chartMetric} />} />
                  {showLegend ? <Legend iconType="circle" wrapperStyle={{ paddingTop: 18 }} /> : null}
                  {model.periods.map((period) => (
                    <Line
                      key={period.key}
                      type="linear"
                      dataKey={period.key}
                      name={period.label}
                      stroke={period.color}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(PeriodComparisonSection);
