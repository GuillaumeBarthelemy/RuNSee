import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMetricValue, getMetricConfig } from "../utils/activityAggregations.js";

const noop = () => {};

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <div>{formatMetricValue(payload[0].value, metric)}</div>
    </div>
  );
}

export default function MonthlyVolumeChart({
  data = [],
  metric = "distanceKm",
  display = "line",
  months = 6,
  onMetricChange = noop,
  onDisplayChange = noop,
  onMonthsChange = noop,
}) {
  const safeData = Array.isArray(data) ? data : [];
  const safeMetric = metric || "distanceKm";
  const safeDisplay = display === "bar" ? "bar" : "line";
  const safeMonths = [6, 12, 18, 24].includes(Number(months)) ? Number(months) : 6;
  const metricConfig = getMetricConfig(safeMetric);

  return (
    <section className="card chart-card">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <h2 className="card-title">Analyse mensuelle</h2>
          <p className="card-subtitle">Tous les mois de la période choisie restent visibles, même à 0.</p>
        </div>
        <div className="chart-controls">
          <label className="inline-field"><span className="field-label inline-label">Affichage</span>
            <select className="field-input field-input-small" value={safeDisplay} onChange={(event) => onDisplayChange(event.target.value)}>
              <option value="line">Courbe</option>
              <option value="bar">Barres</option>
            </select>
          </label>
          <label className="inline-field"><span className="field-label inline-label">Métrique</span>
            <select className="field-input field-input-small" value={safeMetric} onChange={(event) => onMetricChange(event.target.value)}>
              <option value="distanceKm">Distance (km)</option>
              <option value="elevationGain">Dénivelé positif</option>
              <option value="movingHours">Temps de déplacement</option>
              <option value="count">Activités</option>
            </select>
          </label>
          <label className="inline-field"><span className="field-label inline-label">Période</span>
            <select className="field-input field-input-small" value={safeMonths} onChange={(event) => onMonthsChange(Number(event.target.value))}>
              <option value={6}>6 mois</option>
              <option value={12}>12 mois</option>
              <option value={18}>18 mois</option>
              <option value={24}>24 mois</option>
            </select>
          </label>
        </div>
      </div>
      {safeData.length ? (
        <div className="chart-box chart-box-large">
          <ResponsiveContainer width="100%" height="100%">
            {safeDisplay === "bar" ? (
              <BarChart data={safeData} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
                <XAxis dataKey="period" interval={0} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip metric={safeMetric} />} />
                <Legend />
                <Bar dataKey="value" name={metricConfig.label} fill="#5b7fff" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={safeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9e2f0" />
                <XAxis dataKey="period" interval={0} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip metric={safeMetric} />} />
                <Legend />
                <Line type="monotone" dataKey="value" name={metricConfig.label} stroke="#0b5fff" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">Aucune donnée disponible sur cette plage.</div>
      )}
    </section>
  );
}
