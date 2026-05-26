import { memo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * ProgressionMonthlyChart — Mockup p.17 Row 3 gauche.
 *
 * Bar chart 12 mois (Distance bleu + D+ violet groupes).
 */
function ProgressionMonthlyChart({ data = {} }) {
  const year = data?.year || new Date().getFullYear();
  const points = Array.isArray(data?.points) ? data.points : [];
  return (
    <section className="progression-panel progression-monthly-card">
      <div className="progression-panel-head">
        <h3>Progression mensuelle</h3>
        <span className="progression-panel-sub">{year}</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e5edf7" }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => `${v}k`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
            formatter={(value, name) => [
              name === "distanceKm"
                ? `${Number(value).toFixed(1).replace(".", ",")} km`
                : `${Math.round(value)} m`,
              name === "distanceKm" ? "Distance" : "Dénivelé+",
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(k) => (k === "distanceKm" ? "Distance (km)" : "Dénivelé+ (m)")} />
          <Bar yAxisId="left" dataKey="distanceKm" fill="#1268f3" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar yAxisId="right" dataKey="elevationM" fill="#a855f7" radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

export default memo(ProgressionMonthlyChart);
