import { memo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * ProgressionMonthlyComparisonChart — Mockup p.20 Row 2 gauche.
 *
 * Line chart 12 mois : annee courante vs N-1 + footer YTD/projection.
 */
// Palette distincte (hues différentes) pour identifier chaque année historique.
// L'année comparée active (previous) reste en gris foncé (#94a3b8).
// Les autres années (overlay) utilisent des couleurs distinctes mais subtiles.
const OVERLAY_PALETTE = [
  "#7c3aed", // violet (N-2)
  "#f97316", // orange (N-3)
  "#14b8a6", // teal (N-4)
];

function ProgressionMonthlyComparisonChart({ data = {} }) {
  const overlayYears = Array.isArray(data?.overlayYears) ? data.overlayYears : [];
  // Tri pour qu'on affiche les + recentes en premier (couleur + foncee)
  const sortedOverlays = [...overlayYears].sort((a, b) => b - a);
  return (
    <section className="progression-panel progression-monthly-comparison-card">
      <div className="progression-panel-head">
        <h3>Volume mensuel — {data?.year} vs {data?.prevYear} <small>(km)</small></h3>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data?.points || []} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e5edf7" }} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} width={36} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {/* Overlay annees historiques (gris clairs, en dessous) */}
          {sortedOverlays.map((y, idx) => (
            <Line
              key={y}
              type="monotone"
              dataKey={`overlay_${y}`}
              stroke={OVERLAY_PALETTE[Math.min(idx, OVERLAY_PALETTE.length - 1)]}
              strokeWidth={1.6}
              dot={false}
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              name={String(y)}
            />
          ))}
          <Line type="monotone" dataKey="previous" stroke="#94a3b8" strokeWidth={1.6} dot={false} strokeDasharray="4 3" name={String(data?.prevYear || "")} />
          <Line type="monotone" dataKey="current" stroke="#1268f3" strokeWidth={2.2} dot={{ r: 3, fill: "#1268f3" }} name={String(data?.year || "")} />
        </LineChart>
      </ResponsiveContainer>
      <div className="progression-monthly-comparison-footer">
        <div className="progression-monthly-comparison-cell">
          <small>{data?.ytdMonthLabel || ""}</small>
          <strong>{data?.formattedYtdCurrent || "—"}</strong>
          <span>vs {data?.formattedYtdPrev || "—"} en {data?.prevYear}</span>
          <span className={`tone-${data?.ytdDeltaTone || "neutral"}`}>{data?.formattedYtdDelta || ""}</span>
        </div>
        <div className="progression-monthly-comparison-cell">
          <small>Projection annuelle</small>
          <strong>{data?.formattedProjection || "—"}</strong>
          <span>vs {data?.formattedTotalPrev || "—"} en {data?.prevYear}</span>
          <span className={`tone-${data?.projectionDeltaTone || "neutral"}`}>{data?.formattedProjectionDelta || ""}</span>
        </div>
      </div>
    </section>
  );
}

export default memo(ProgressionMonthlyComparisonChart);
