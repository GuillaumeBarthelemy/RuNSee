import { memo, useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useChartViewport from "../hooks/useChartViewport.js";
import { buildTemporalAxisConfig } from "../utils/chartAxis.js";
import InfoTooltip from "./InfoTooltip.jsx";

const GRID_STROKE = "rgba(123, 140, 163, 0.16)";
const noop = () => {};

function defaultFormatValue(value, unit = "") {
  if (unit) {
    return `${Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} ${unit}`;
  }

  return value;
}

function buildTrendData(data = [], dataKey = "value", windowSize = 4, options = {}) {
  const safeWindowSize = Math.max(2, Number(windowSize || 4));
  const requireFullWindow = options.requireFullWindow === true;

  return data.map((entry, index) => {
    const sliceStart = index - safeWindowSize + 1;
    const hasFullWindow = sliceStart >= 0;
    const effectiveSliceStart = Math.max(0, sliceStart);
    const windowValues = data
      .slice(effectiveSliceStart, index + 1)
      .map((item) => Number(item?.[dataKey] || 0))
      .filter((value) => Number.isFinite(value));
    const trendValue = requireFullWindow && !hasFullWindow
      ? null
      : windowValues.length
        ? windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length
        : null;

    return {
      ...entry,
      __trendValue: trendValue,
    };
  });
}

function countFiniteTrendPoints(data = []) {
  return data.reduce(
    (count, entry) => (typeof entry?.__trendValue === "number" && Number.isFinite(entry.__trendValue) ? count + 1 : count),
    0,
  );
}

function getTrendEntryKey(entry = {}, index = 0) {
  return entry?.periodDate || entry?.period || `row-${index}`;
}

function WeeklyTooltip({
  active,
  payload,
  label,
  dataKey,
  formatValue,
  name,
  showTrendLine,
  trendLabel,
}) {
  if (!active || !payload?.length) return null;

  const entry = payload[0]?.payload || {};
  const valueEntry = payload.find((item) => item.dataKey === dataKey) || payload[0];
  const trendEntry = payload.find((item) => item.dataKey === "__trendValue");
  const rawValue = valueEntry?.value ?? entry?.[dataKey] ?? 0;
  const rawTrendValue = trendEntry?.value ?? entry?.__trendValue ?? null;

  return (
    <div className="chart-tooltip">
      <strong>{entry.period || label}</strong>
      <div>{name} : {formatValue(rawValue)}</div>
      {showTrendLine && Number.isFinite(rawTrendValue) ? (
        <div>{trendLabel} : {formatValue(rawTrendValue)}</div>
      ) : null}
      {entry?.isPartial ? (
        <div>{entry?.viewMode === "calendar" ? "Semaine partielle" : "Fenetre partielle"} : {entry.coverageLabel || "periode tronquee"}</div>
      ) : null}
    </div>
  );
}

function WeeklyVolumeChart({
  data = [],
  title = "Volume hebdomadaire",
  subtitle = "Toutes les semaines de la periode affichee sont conservees, meme a 0.",
  info = [],
  dataKey = "distanceKm",
  name = "Distance (km)",
  unit = "km",
  fill = "#F97316",
  emptyMessage = "Aucune donnee disponible sur cette plage.",
  valueFormatter = null,
  showTrendLine = false,
  trendWindow = 4,
  trendLabel = "Tendance",
  trendColor = "#7B8CA3",
  trendSourceData = null,
  requireFullTrendWindow = false,
  showMetricControl = false,
  metricControlLabel = "Mesure",
  metricOptions = [],
  selectedMetric = "",
  onMetricChange = noop,
  showViewControl = false,
  viewControlLabel = "Decoupage",
  viewOptions = [],
  selectedView = "",
  onViewChange = noop,
  insight = "",
}) {
  const { containerRef, chartWidth, axisTick } = useChartViewport();
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const safeTrendSourceData = useMemo(() => (Array.isArray(trendSourceData) && trendSourceData.length ? trendSourceData : safeData), [safeData, trendSourceData]);
  const formatValue = valueFormatter || ((value) => defaultFormatValue(value, unit));
  const chartData = useMemo(
    () => {
      if (!showTrendLine) {
        return safeData;
      }

      const strictTrendData = buildTrendData(safeTrendSourceData, dataKey, trendWindow, {
        requireFullWindow: requireFullTrendWindow,
      });
      const mergeTrendBack = (source) => {
        const trendMap = new Map(
          source.map((entry, index) => [getTrendEntryKey(entry, index), entry.__trendValue]),
        );

        return safeData.map((entry, index) => ({
          ...entry,
          __trendValue: trendMap.get(getTrendEntryKey(entry, index)) ?? null,
        }));
      };
      const strictVisibleData = mergeTrendBack(strictTrendData);

      if (!requireFullTrendWindow || countFiniteTrendPoints(strictVisibleData) >= 2) {
        return strictVisibleData;
      }

      // On les fenetres courtes, on garde une tendance lisible plutot qu'une ligne vide.
      return mergeTrendBack(
        buildTrendData(safeTrendSourceData, dataKey, trendWindow, { requireFullWindow: false }),
      );
    },
    [dataKey, requireFullTrendWindow, safeData, safeTrendSourceData, showTrendLine, trendWindow],
  );
  const axisConfig = useMemo(
    () => buildTemporalAxisConfig({
      data: safeData,
      width: chartWidth,
      granularity: "week",
      dateKey: "periodDate",
      fallbackKey: "period",
    }),
    [chartWidth, safeData],
  );
  const yAxisWidth = chartWidth > 0 && chartWidth < 520 ? 38 : chartWidth > 0 && chartWidth < 860 ? 48 : 58;
  const safeMetricOptions = Array.isArray(metricOptions) && metricOptions.length
    ? metricOptions
    : [{ value: dataKey, label: name }];
  const safeSelectedMetric = selectedMetric || dataKey;
  const safeViewOptions = Array.isArray(viewOptions) ? viewOptions : [];
  const safeSelectedView = selectedView || safeViewOptions[0]?.value || "";

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
        {showMetricControl || showViewControl ? (
          <div className="chart-controls">
            {showMetricControl ? (
              <label className="inline-field">
                <span className="field-label inline-label">{metricControlLabel}</span>
                <select className="field-input field-input-small" value={safeSelectedMetric} onChange={(event) => onMetricChange(event.target.value)}>
                  {safeMetricOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {showViewControl ? (
              <label className="inline-field">
                <span className="field-label inline-label">{viewControlLabel}</span>
                <select className="field-input field-input-small" value={safeSelectedView} onChange={(event) => onViewChange(event.target.value)}>
                  {safeViewOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
      </div>
      {safeData.length ? (
        <div className="chart-box" ref={containerRef}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} barCategoryGap="18%">
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
              <Tooltip
                content={(
                  <WeeklyTooltip
                    dataKey={dataKey}
                    formatValue={formatValue}
                    name={name}
                    showTrendLine={showTrendLine}
                    trendLabel={trendLabel}
                  />
                )}
              />
              <Bar dataKey={dataKey} name={name} fill={fill} radius={[8, 8, 0, 0]} isAnimationActive={false} />
              {showTrendLine ? (
                <Line
                  type="linear"
                  dataKey="__trendValue"
                  name={trendLabel}
                  stroke={trendColor}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  strokeDasharray="6 4"
                  isAnimationActive={false}
                  connectNulls
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">{emptyMessage}</div>
      )}
    </section>
  );
}

export default memo(WeeklyVolumeChart);
