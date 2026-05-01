import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMetricValue, getMetricConfig } from "../utils/activityAggregations.js";
import useChartViewport from "../hooks/useChartViewport.js";
import { buildTemporalAxisConfig } from "../utils/chartAxis.js";
import InfoTooltip from "./InfoTooltip.jsx";

const noop = () => {};
const GRID_STROKE = "rgba(123, 140, 163, 0.16)";
const METRIC_OPTIONS = [
  { value: "distanceKm", label: "Distance (km)" },
  { value: "load", label: "Charge" },
  { value: "elevationGain", label: "Denivele positif" },
  { value: "movingHours", label: "Temps de deplacement" },
  { value: "count", label: "Activites" },
];

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload || {};
  return (
    <div className="chart-tooltip">
      <strong>{entry.period || label}</strong>
      <div>{formatMetricValue(payload[0].value, metric)}</div>
      {entry?.isPartial ? <div>Mois partiel : {entry.coverageLabel || "periode tronquee"}</div> : null}
    </div>
  );
}

function MonthlyVolumeChart({
  data = [],
  title = "Analyse mensuelle",
  subtitle = "Tous les mois de la periode choisie restent visibles, meme a 0.",
  info = [],
  metric = "distanceKm",
  granularity = "month",
  display = "line",
  months = 6,
  showControls = true,
  showMetricControl = showControls,
  showDisplayControl = showControls,
  showMonthsControl = showControls,
  metricControlLabel = "Mesure",
  allowedMetrics = null,
  onMetricChange = noop,
  onDisplayChange = noop,
  onMonthsChange = noop,
  insight = "",
}) {
  const { containerRef, chartWidth, axisTick, isCompact } = useChartViewport();
  const safeData = Array.isArray(data) ? data : [];
  const metricOptions = Array.isArray(allowedMetrics) && allowedMetrics.length
    ? METRIC_OPTIONS.filter((option) => allowedMetrics.includes(option.value))
    : METRIC_OPTIONS;
  const fallbackMetric = metricOptions[0]?.value || "distanceKm";
  const safeMetric = metricOptions.some((option) => option.value === metric) ? metric : fallbackMetric;
  const safeDisplay = display === "bar" ? "bar" : "line";
  const safeMonths = [6, 12, 18, 24].includes(Number(months)) ? Number(months) : 6;
  const metricConfig = getMetricConfig(safeMetric);
  const hasControls = showControls && (showDisplayControl || showMetricControl || showMonthsControl);
  const axisConfig = buildTemporalAxisConfig({
    data: safeData,
    width: chartWidth,
    granularity,
    dateKey: "periodDate",
    fallbackKey: "shortLabel",
  });
  const yAxisWidth = chartWidth > 0 && chartWidth < 520 ? 36 : chartWidth > 0 && chartWidth < 860 ? 44 : 52;

  return (
    <section className="card chart-card">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          {insight ? <div className="chart-insight">{insight}</div> : null}
        </div>
        {hasControls ? (
          <div className="chart-controls">
            {showDisplayControl ? (
              <label className="inline-field">
                <span className="field-label inline-label">Affichage</span>
                <select className="field-input field-input-small" value={safeDisplay} onChange={(event) => onDisplayChange(event.target.value)}>
                  <option value="line">Courbe</option>
                  <option value="bar">Barres</option>
                </select>
              </label>
            ) : null}
            {showMetricControl ? (
              <label className="inline-field">
                <span className="field-label inline-label">{metricControlLabel}</span>
                <select className="field-input field-input-small" value={safeMetric} onChange={(event) => onMetricChange(event.target.value)}>
                  {metricOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {showMonthsControl ? (
              <label className="inline-field">
                <span className="field-label inline-label">Periode</span>
                <select className="field-input field-input-small" value={safeMonths} onChange={(event) => onMonthsChange(Number(event.target.value))}>
                  <option value={6}>6 mois</option>
                  <option value={12}>12 mois</option>
                  <option value={18}>18 mois</option>
                  <option value={24}>24 mois</option>
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
      </div>
      {safeData.length ? (
        <div className="chart-box chart-box-large" ref={containerRef}>
          <ResponsiveContainer width="100%" height="100%">
            {safeDisplay === "bar" ? (
              <BarChart data={safeData} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                <XAxis
                  dataKey={axisConfig.dataKey}
                  ticks={axisConfig.ticks}
                  tickFormatter={axisConfig.tickFormatter}
                  interval={axisConfig.interval}
                  angle={axisConfig.angle}
                  textAnchor={axisConfig.textAnchor}
                  height={axisConfig.height}
                  minTickGap={axisConfig.minTickGap}
                  tickMargin={axisConfig.tickMargin}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  allowDuplicatedCategory={false}
                />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={yAxisWidth} />
                <Tooltip content={<CustomTooltip metric={safeMetric} />} />
                <Bar dataKey="value" name={metricConfig.label} fill="#F97316" radius={[8, 8, 0, 0]} isAnimationActive={false} />
              </BarChart>
            ) : (
              <LineChart data={safeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                <XAxis
                  dataKey={axisConfig.dataKey}
                  ticks={axisConfig.ticks}
                  tickFormatter={axisConfig.tickFormatter}
                  interval={axisConfig.interval}
                  angle={axisConfig.angle}
                  textAnchor={axisConfig.textAnchor}
                  height={axisConfig.height}
                  minTickGap={axisConfig.minTickGap}
                  tickMargin={axisConfig.tickMargin}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  allowDuplicatedCategory={false}
                />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={yAxisWidth} />
                <Tooltip content={<CustomTooltip metric={safeMetric} />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={metricConfig.label}
                  stroke="#F97316"
                  strokeWidth={isCompact ? 2.25 : 2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: "#FB923C", stroke: "#F97316" }}
                  isAnimationActive={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Aucune donnee disponible sur cette plage.</div>
      )}
    </section>
  );
}

export default memo(MonthlyVolumeChart);
