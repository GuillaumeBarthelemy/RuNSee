import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import InfoTooltip from "./InfoTooltip.jsx";

const GRID_STROKE = "rgba(123, 140, 163, 0.16)";
const AXIS_TICK = { fontSize: 12, fill: "#7B8CA3" };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const entry = payload[0]?.payload || {};

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {entry.rangeLabel ? <div>{entry.rangeLabel}</div> : null}
      <div>{Math.round(Number(entry.durationMinutes || 0))} min</div>
      <div>{Number(entry.durationHours || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h</div>
      <div>{Math.round(Number(entry.share || 0))} % du temps cardio suivi</div>
    </div>
  );
}

export default function IntensityDistributionChart({
  model = {},
  title = "Repartition de l'intensite",
  subtitle = "Estimation par temps passe dans des zones de FC course / trail.",
  info = [],
}) {
  const safeModel = model || {};
  const safeData = Array.isArray(safeModel.zones) ? safeModel.zones : [];
  const hasData = Boolean(safeModel.hasData) && safeData.some((entry) => Number(entry?.durationMinutes) > 0);
  const zoneSummary = safeData
    .filter((entry) => entry?.rangeLabel)
    .map((entry) => `${entry.shortLabel} ${entry.rangeLabel}`)
    .join(" | ");
  const maxHeartrateSource = safeModel.usingEstimatedMaxHeartrate
    ? `estimee sur ${safeModel.referenceMaxHeartrateSampleSize || 0} sortie(s) cardio exploitable(s)`
    : "personnalisee dans Administration";
  const zoneSource = safeModel.usingEstimatedZones ? "Zones utilisees : estimation active." : "Zones utilisees : configuration personnalisee.";

  return (
    <section className="card chart-card">
      <div className="card-header-row">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">{title}</h2>
            <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
          </div>
          <p className="card-subtitle">{subtitle}</p>
          {safeModel.referenceMaxHeartrate ? (
            <p className="small-text">
              FC max utilisee : {Math.round(Number(safeModel.referenceMaxHeartrate || 0))} bpm, {maxHeartrateSource}.
            </p>
          ) : null}
          {zoneSummary ? <p className="small-text">{zoneSource} {zoneSummary}</p> : null}
          {safeModel.estimationMessage ? (
            <div className="alert alert-info top-gap-sm">
              {safeModel.estimationMessage}
            </div>
          ) : null}
          {safeModel.trackedDurationMinutes ? (
            <p className="small-text">
              Temps suivi : {Math.round(Number(safeModel.trackedDurationMinutes || 0))} min. Detail fin sur {safeModel.detailedActivitiesCount || 0} activite(s), repli seance entiere sur {safeModel.fallbackActivitiesCount || 0}.
            </p>
          ) : null}
        </div>
      </div>
      {hasData ? (
        <div className="chart-box chart-box-medium">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="durationMinutes" fill="#F97316" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state">{safeModel.message || "Pas assez de donnees cardio pour estimer l'intensite."}</div>
      )}
    </section>
  );
}
