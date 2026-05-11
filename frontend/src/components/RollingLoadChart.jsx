import { memo, useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useChartViewport from "../hooks/useChartViewport.js";
import { formatMetricValue } from "../utils/activityAggregations.js";
import { buildTemporalAxisConfig } from "../utils/chartAxis.js";
import InfoTooltip from "./InfoTooltip.jsx";

const GRID_STROKE = "rgba(123, 140, 163, 0.16)";

function defaultValueFormatter(value, metric) {
  return formatMetricValue(value, metric);
}

function CustomTooltip({
  active,
  payload,
  label,
  metric,
  valueFormatter,
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload || {};

  return (
    <div className="chart-tooltip">
      <strong>{entry.fullLabel || entry.label || label}</strong>
      {payload.map((item) => (
        <div key={item.dataKey}>
          {item.name} : {valueFormatter(item.value, metric)}
        </div>
      ))}
    </div>
  );
}

function RollingLoadChart({
  data = [],
  metric = "load",
  title = "Charge glissante 7 j / 42 j",
  subtitle = "Visualise la dynamique recente de pression, de base de charge et de balance de charge.",
  info = [],
  shortKey = "acuteLoad",
  longKey = "fitness",
  freshnessKey = "freshness",
  shortLabel = "Pression recente",
  longLabel = "Base de charge",
  freshnessLabel = "Balance de charge",
  barKey = "load",
  barLabel = "Charge",
  barColor = "rgba(249, 115, 22, 0.4)",
  xKey = "label",
  granularity = "day",
  showFreshness = true,
  showBar = true,
  valueFormatter = defaultValueFormatter,
  yDomain = undefined,
  yTicks = undefined,
  yTickFormatter = undefined,
  insight = "",
  legendNote = "",
  readingSteps = [],
  showFreshnessZones = false,
}) {
  const { containerRef, chartWidth, axisTick, isCompact, showLegend } = useChartViewport();
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const axisConfig = useMemo(
    () => buildTemporalAxisConfig({
      data: safeData,
      width: chartWidth,
      granularity,
      dateKey: "periodDate",
      fallbackKey: xKey,
    }),
    [chartWidth, granularity, safeData, xKey],
  );
  const yAxisWidth = chartWidth > 0 && chartWidth < 520 ? 38 : chartWidth > 0 && chartWidth < 860 ? 48 : 58;
  const minPointSize = safeData.length > 120 ? 1 : safeData.length > 60 ? 2 : 3;
  const dataExtents = useMemo(() => {
    const values = safeData.flatMap((entry) => [
      Number(entry?.[barKey]),
      Number(entry?.[shortKey]),
      Number(entry?.[longKey]),
      Number(entry?.[freshnessKey]),
    ]).filter((value) => Number.isFinite(value));

    if (!values.length) {
      return null;
    }

    return {
      min: Math.min(...values, 0),
      max: Math.max(...values, 0),
    };
  }, [barKey, freshnessKey, longKey, safeData, shortKey]);

  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          {readingSteps.length ? (
            <div className="chart-reading-steps" aria-label="Ordre de lecture du graphique">
              {readingSteps.map((step, index) => (
                <span className="chart-reading-step" key={step}>
                  <strong>{index + 1}</strong>
                  {step}
                </span>
              ))}
            </div>
          ) : null}
          {insight ? <div className="chart-insight">{insight}</div> : null}
          {legendNote ? <p className="small-text chart-legend-note">{legendNote}</p> : null}
        </div>
      </div>
      {safeData.length ? (
        <div className="chart-box chart-box-large" ref={containerRef}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={safeData} barCategoryGap={safeData.length > 90 ? "36%" : "18%"}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
              {showFreshness && showFreshnessZones && dataExtents && dataExtents.max > 0 ? (
                <ReferenceArea y1={0} y2={dataExtents.max} fill="rgba(34, 197, 94, 0.04)" ifOverflow="extendDomain" />
              ) : null}
              {showFreshness && showFreshnessZones && dataExtents && dataExtents.min < 0 ? (
                <ReferenceArea y1={dataExtents.min} y2={0} fill="rgba(239, 68, 68, 0.04)" ifOverflow="extendDomain" />
              ) : null}
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
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={yAxisWidth}
                domain={yDomain}
                ticks={yTicks}
                tickFormatter={yTickFormatter}
              />
              <Tooltip content={<CustomTooltip metric={metric} valueFormatter={valueFormatter} />} />
              {showLegend ? <Legend /> : null}
              {showFreshness ? <ReferenceLine y={0} stroke="rgba(123, 140, 163, 0.32)" strokeDasharray="5 5" /> : null}
              {showBar ? (
                <Bar
                  dataKey={barKey}
                  name={barLabel}
                  fill={barColor}
                  stroke="#F97316"
                  strokeOpacity={0.85}
                  minPointSize={minPointSize}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
              ) : null}
              <Line type="monotone" dataKey={shortKey} name={shortLabel} stroke="#F97316" strokeWidth={isCompact ? 2.25 : 2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey={longKey} name={longLabel} stroke="#355886" strokeWidth={isCompact ? 2.25 : 2.5} dot={false} isAnimationActive={false} />
              {showFreshness ? (
                <Line type="monotone" dataKey={freshnessKey} name={freshnessLabel} stroke="#22C55E" strokeWidth={isCompact ? 2.25 : 2.5} dot={false} isAnimationActive={false} />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="empty-state">Pas assez de données pour calculer l'état d'entraînement sur cette période.</div>}
    </section>
  );
}

export default memo(RollingLoadChart);
