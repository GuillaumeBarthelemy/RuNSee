import { memo } from "react";
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
import { formatEfficiencyValue } from "../utils/trainingMetrics.js";
import InfoTooltip from "./InfoTooltip.jsx";

const GRID_STROKE = "rgba(123, 140, 163, 0.16)";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload || {};
  const efficiencyEntry = payload.find((item) => item.dataKey === "efficiency");

  return (
    <div className="chart-tooltip">
      <strong>{entry.fullLabel || label}</strong>
      {efficiencyEntry ? (
        <div>
          {efficiencyEntry.name} : {formatEfficiencyValue(efficiencyEntry.value)}
        </div>
      ) : null}
      {Number(entry?.activityCount || 0) > 0 ? (
        <div>{entry.activityCount} activite(s) comparables</div>
      ) : (
        <div>Aucune activite comparable</div>
      )}
    </div>
  );
}

function PerformanceTrendChart({
  data = [],
  info = [],
  title = "Efficience allure / FC",
  subtitle = "Lecture temporelle de la relation entre vitesse et frequence cardiaque sur les sorties comparables.",
  granularity = "weekly",
  insight = "",
  detail = "",
}) {
  const { containerRef, chartWidth, axisTick, isCompact, showLegend } = useChartViewport();
  const safeData = Array.isArray(data) ? data : [];
  const hasEfficiency = safeData.some((entry) => Number(entry?.efficiency) > 0);
  const axisConfig = buildTemporalAxisConfig({
    data: safeData,
    width: chartWidth,
    granularity,
    dateKey: "periodDate",
    fallbackKey: "label",
  });
  const yAxisWidth = chartWidth > 0 && chartWidth < 520 ? 48 : chartWidth > 0 && chartWidth < 860 ? 56 : 68;

  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          {insight ? <div className="chart-insight">{insight}</div> : null}
          {detail ? <p className="small-text chart-legend-note">{detail}</p> : null}
        </div>
      </div>
      {safeData.length && hasEfficiency ? (
        <div className="chart-box chart-box-large" ref={containerRef}>
          <ResponsiveContainer width="100%" height="100%">
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
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatEfficiencyValue(value)}
                width={yAxisWidth}
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend ? <Legend /> : null}
              <Line
                type="monotone"
                dataKey="efficiency"
                name="Efficience allure / FC"
                stroke="#355886"
                strokeWidth={isCompact ? 2.25 : 2.5}
                dot={false}
                activeDot={{ r: 4, fill: "#355886", stroke: "#223A5E" }}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Pas assez de sorties course comparables pour suivre l'efficience sur la periode.</div>
      )}
    </section>
  );
}

export default memo(PerformanceTrendChart);
