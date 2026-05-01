import { memo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useChartViewport from "../hooks/useChartViewport.js";
import { formatMetricValue, getMetricConfig } from "../utils/activityAggregations.js";

const noop = () => {};
const GRID_STROKE = "rgba(123, 140, 163, 0.16)";

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <div>{formatMetricValue(payload[0].value, metric)}</div>
    </div>
  );
}

function WeekdayDistributionChart({ data = [], metric = "count", onMetricChange = noop }) {
  const { axisTick, chartWidth } = useChartViewport();
  const safeData = Array.isArray(data) ? data : [];
  const safeMetric = metric || "count";
  const metricConfig = getMetricConfig(safeMetric);
  const yAxisWidth = chartWidth > 0 && chartWidth < 520 ? 80 : 100;

  return (
    <section className="card chart-card">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <h2 className="card-title">Repartition par jour de semaine</h2>
          <p className="card-subtitle">Vue complementaire pour repérer les jours les plus charges sans dupliquer le volume hebdomadaire.</p>
        </div>
        <label className="inline-field">
          <span className="field-label inline-label">Metrique</span>
          <select className="field-input field-input-small" value={safeMetric} onChange={(event) => onMetricChange(event.target.value)}>
            <option value="count">Activites</option>
            <option value="distanceKm">Distance (km)</option>
            <option value="elevationGain">Denivele positif</option>
            <option value="movingHours">Temps de deplacement</option>
          </select>
        </label>
      </div>
      {safeData.length ? (
        <div className="chart-box chart-box-large">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
              <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis dataKey="label" type="category" width={yAxisWidth} tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip metric={safeMetric} />} />
              <Bar dataKey="value" name={metricConfig.label} fill="#F97316" radius={[0, 8, 8, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Aucune donnee disponible sur cette plage.</div>
      )}
    </section>
  );
}

export default memo(WeekdayDistributionChart);
