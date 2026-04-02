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
import InfoTooltip from "./InfoTooltip.jsx";

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

export default function MonthlyVolumeChart({
  data = [],
  title = "Analyse mensuelle",
  subtitle = "Tous les mois de la periode choisie restent visibles, meme a 0.",
  info = [],
  metric = "distanceKm",
  display = "line",
  months = 6,
  showControls = true,
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
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          <p className="card-subtitle">{subtitle}</p>
        </div>
        {showControls ? (
          <div className="chart-controls">
            <label className="inline-field">
              <span className="field-label inline-label">Affichage</span>
              <select className="field-input field-input-small" value={safeDisplay} onChange={(event) => onDisplayChange(event.target.value)}>
                <option value="line">Courbe</option>
                <option value="bar">Barres</option>
              </select>
            </label>
            <label className="inline-field">
              <span className="field-label inline-label">Metrique</span>
              <select className="field-input field-input-small" value={safeMetric} onChange={(event) => onMetricChange(event.target.value)}>
                <option value="distanceKm">Distance (km)</option>
                <option value="load">Charge</option>
                <option value="elevationGain">Denivele positif</option>
                <option value="movingHours">Temps de deplacement</option>
                <option value="count">Activites</option>
              </select>
            </label>
            <label className="inline-field">
              <span className="field-label inline-label">Periode</span>
              <select className="field-input field-input-small" value={safeMonths} onChange={(event) => onMonthsChange(Number(event.target.value))}>
                <option value={6}>6 mois</option>
                <option value={12}>12 mois</option>
                <option value={18}>18 mois</option>
                <option value={24}>24 mois</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>
      {safeData.length ? (
        <div className="chart-box chart-box-large">
          <ResponsiveContainer width="100%" height="100%">
            {safeDisplay === "bar" ? (
              <BarChart data={safeData} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="period" interval={0} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip metric={safeMetric} />} />
                <Bar dataKey="value" name={metricConfig.label} fill="#F97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={safeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="period" interval={0} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip metric={safeMetric} />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={metricConfig.label}
                  stroke="#F97316"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: "#FB923C", stroke: "#F97316" }}
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
