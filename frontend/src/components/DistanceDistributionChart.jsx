import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import InfoTooltip from "./InfoTooltip.jsx";

const GRID_STROKE = "rgba(123, 140, 163, 0.16)";
const AXIS_TICK = { fontSize: 12, fill: "#7B8CA3" };

export default function DistanceDistributionChart({
  data = [],
  title = "Profil des distances de sorties",
  subtitle = "Repere la place des sorties courtes, intermediaires et longues dans l'entrainement recent.",
  info = [],
}) {
  const safeData = Array.isArray(data) ? data.filter((entry) => entry?.label) : [];

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
        <div className="chart-box chart-box-medium">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [`${value}`, "Nombre d'activites"]} />
              <Bar dataKey="value" name="Nombre d'activites" fill="#FB923C" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="empty-state">Aucune activite disponible pour repartir les distances.</div>}
    </section>
  );
}
