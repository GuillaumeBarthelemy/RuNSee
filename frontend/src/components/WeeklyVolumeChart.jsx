import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMetricLabel } from "../utils/activityAggregations.js";

const METRIC_OPTIONS = [
  { value: "count", label: "Activités" },
  { value: "distanceKm", label: "Distance (km)" },
  { value: "elevationGain", label: "D+ (m)" },
  { value: "movingHours", label: "Temps (h)" },
];

export default function WeeklyVolumeChart({ data, metricKey, onMetricChange }) {
  const metricLabel = getMetricLabel(metricKey);

  return (
    <section className="card chart-card">
      <div className="card-header-row align-center wrap-on-mobile">
        <div>
          <h2 className="card-title">Répartition par jour de semaine</h2>
          <p className="card-subtitle">Une vue complémentaire pour repérer tes jours forts sans dupliquer le volume mensuel.</p>
        </div>
        <label className="inline-field">
          <span className="field-label inline-label">Métrique</span>
          <select className="field-input field-input-small" value={metricKey} onChange={(event) => onMetricChange(event.target.value)}>
            {METRIC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      {data?.length ? (
        <div className="chart-box">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d9e2f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="dayLabel" width={90} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend />
              <Bar dataKey="value" name={metricLabel} fill="#5b7fff" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Aucune donnée disponible sur cette plage.</div>
      )}
    </section>
  );
}
