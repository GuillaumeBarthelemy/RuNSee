import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMetricValue, getMetricConfig } from "../utils/activityAggregations.js";

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <div>{formatMetricValue(payload[0].value, metric)}</div>
    </div>
  );
}

export default function WeekdayDistributionChart({ data, metric, onMetricChange }) {
  const metricConfig = getMetricConfig(metric);

  return (
    <section className="card chart-card">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <h2 className="card-title">Répartition par jour de semaine</h2>
          <p className="card-subtitle">Une vue complémentaire pour repérer tes jours forts sans dupliquer le volume mensuel.</p>
        </div>
        <label className="inline-field"><span className="field-label inline-label">Métrique</span>
          <select className="field-input field-input-small" value={metric} onChange={(event) => onMetricChange(event.target.value)}>
            <option value="count">Activités</option>
            <option value="distanceKm">Distance (km)</option>
            <option value="elevationGain">Dénivelé positif</option>
            <option value="movingHours">Temps de déplacement</option>
          </select>
        </label>
      </div>
      {data?.length ? (
        <div className="chart-box chart-box-large">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d9e2f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="label" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip metric={metric} />} />
              <Legend />
              <Bar dataKey="value" name={metricConfig.label} fill="#5b7fff" radius={[0, 12, 12, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Aucune donnée disponible sur cette plage.</div>
      )}
    </section>
  );
}
