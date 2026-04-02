import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMetricValue } from "../utils/activityAggregations.js";
import InfoTooltip from "./InfoTooltip.jsx";

const GRID_STROKE = "rgba(123, 140, 163, 0.16)";
const AXIS_TICK = { fontSize: 12, fill: "#7B8CA3" };

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

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={item.dataKey}>
          {item.name} : {valueFormatter(item.value, metric)}
        </div>
      ))}
    </div>
  );
}

export default function RollingLoadChart({
  data = [],
  metric = "load",
  title = "Charge glissante 7 j / 42 j",
  subtitle = "Visualise la dynamique recente de charge, de base de forme et de fraicheur.",
  info = [],
  shortKey = "acuteLoad",
  longKey = "fitness",
  freshnessKey = "freshness",
  shortLabel = "Charge 7 j",
  longLabel = "Fitness 42 j",
  freshnessLabel = "Forme",
  xKey = "label",
  showFreshness = true,
  valueFormatter = defaultValueFormatter,
}) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          <p className="card-subtitle">{subtitle}</p>
        </div>
      </div>
      {safeData.length ? (
        <div className="chart-box chart-box-large">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={safeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey={xKey} minTickGap={24} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip metric={metric} valueFormatter={valueFormatter} />} />
              <Legend />
              <Line type="monotone" dataKey={shortKey} name={shortLabel} stroke="#F97316" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey={longKey} name={longLabel} stroke="#355886" strokeWidth={2.5} dot={false} />
              {showFreshness ? (
                <Line type="monotone" dataKey={freshnessKey} name={freshnessLabel} stroke="#22C55E" strokeWidth={2.5} dot={false} />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="empty-state">Pas assez de donnees pour calculer l'etat d'entrainement sur cette periode.</div>}
    </section>
  );
}
