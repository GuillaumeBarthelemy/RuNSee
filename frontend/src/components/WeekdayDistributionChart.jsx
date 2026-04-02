import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMetricValue, getMetricConfig } from "../utils/activityAggregations.js";

const noop = () => {};
const GRID_STROKE = "rgba(123, 140, 163, 0.16)";
const AXIS_TICK = { fontSize: 12, fill: "#7B8CA3" };

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <div>{formatMetricValue(payload[0].value, metric)}</div>
    </div>
  );
}

export default function WeekdayDistributionChart({ data = [], metric = "count", onMetricChange = noop }) {
  const safeData = Array.isArray(data) ? data : [];
  const safeMetric = metric || "count";
  const metricConfig = getMetricConfig(safeMetric);

  return (
    <section className="card chart-card">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <h2 className="card-title">Répartition par jour de semaine</h2>
          <p className="card-subtitle">Une vue complémentaire pour repérer tes jours forts sans dupliquer le volume mensuel.</p>
        </div>
        <label className="inline-field">
          <span className="field-label inline-label">Métrique</span>
          <select className="field-input field-input-small" value={safeMetric} onChange={(event) => onMetricChange(event.target.value)}>
            <option value="count">Activités</option>
            <option value="distanceKm">Distance (km)</option>
            <option value="elevationGain">Dénivelé positif</option>
            <option value="movingHours">Temps de déplacement</option>
          </select>
        </label>
      </div>
      {safeData.length ? (
        <div className="chart-box chart-box-large">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID_STROKE} />
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis dataKey="label" type="category" width={100} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip metric={safeMetric} />} />
              <Bar dataKey="value" name={metricConfig.label} fill="#F97316" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Aucune donnée disponible sur cette plage.</div>
      )}
    </section>
  );
}
