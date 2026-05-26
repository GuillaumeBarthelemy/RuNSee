import { memo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * ProgressionTwelveWeeksChart — Mockup p.20 Row 2 droite.
 *
 * Bar chart 12 semaines : periode actuelle vs precedente + footer ecart.
 */
function ProgressionTwelveWeeksChart({ data = {} }) {
  return (
    <section className="progression-panel progression-twelve-weeks-card">
      <div className="progression-panel-head">
        <h3>Bloc de 12 semaines — Comparaison <small>(km)</small></h3>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data?.points || []} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e5edf7" }} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} width={32} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="current" fill="#1268f3" radius={[3, 3, 0, 0]} maxBarSize={16} name={data?.currentLabel || "Période actuelle"} />
          <Bar dataKey="previous" fill="#bfdbfe" radius={[3, 3, 0, 0]} maxBarSize={16} name={data?.previousLabel || "Période précédente"} />
        </BarChart>
      </ResponsiveContainer>
      <div className="progression-twelve-weeks-footer">
        <div>
          <small>Période actuelle</small>
          <strong>{data?.formattedCurrent || "—"}</strong>
        </div>
        <div>
          <small>Période précédente</small>
          <strong>{data?.formattedPrevious || "—"}</strong>
        </div>
        <div>
          <small>Écart</small>
          <strong className={`tone-${data?.deltaTone || "neutral"}`}>{data?.formattedDelta || ""}</strong>
          <span className={`tone-${data?.deltaTone || "neutral"}`}>{data?.formattedDeltaPct || ""}</span>
        </div>
      </div>
    </section>
  );
}

export default memo(ProgressionTwelveWeeksChart);
