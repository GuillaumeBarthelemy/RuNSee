import { memo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * ProgressionWeeklyFrequencyChart — Mockup p.19 Row 3 gauche.
 *
 * Bar chart 26 dernieres semaines (nb sorties) + ligne moyenne glissante 4 sem.
 */
function ProgressionWeeklyFrequencyChart({ data = [] }) {
  return (
    <section className="progression-panel progression-weekly-frequency-card">
      <div className="progression-panel-head">
        <h3>Fréquence hebdomadaire</h3>
        <span className="progression-panel-sub">26 dernières semaines</span>
      </div>
      <ResponsiveContainer width="100%" height="100%" minHeight={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e5edf7" }} minTickGap={20} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={28} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
            formatter={(value, name) => [
              name === "count" ? `${Math.round(value)} sortie${value > 1 ? "s" : ""}` : `${Number(value).toFixed(1)} sorties/sem.`,
              name === "count" ? "Sorties" : "Moy. 4 sem.",
            ]}
          />
          <Bar dataKey="count" fill="#bfdbfe" radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Line type="monotone" dataKey="rolling" stroke="#1268f3" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
}

export default memo(ProgressionWeeklyFrequencyChart);
