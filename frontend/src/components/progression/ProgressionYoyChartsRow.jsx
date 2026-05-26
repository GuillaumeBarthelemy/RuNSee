import { memo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * ProgressionYoyChartsRow — Mockup p.17 Row 4.
 *
 * 3 charts cumules (Distance / D+ / Temps) avec lignes 2025 vs 2024 vs Objectif.
 */
function ProgressionYoyChartsRow({ charts = [] }) {
  return (
    <section className="progression-panel progression-yoy-card">
      <div className="progression-panel-head">
        <h3>Évolution depuis le début de l'année</h3>
      </div>
      <div className="progression-yoy-grid">
        {charts.map((ch) => (
          <div key={ch.key} className="progression-yoy-cell">
            <header>
              <strong>{ch.label}</strong>
              <span className="progression-yoy-current">{ch.formattedCurrent}</span>
            </header>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={ch.points || []} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e5edf7" }} minTickGap={24} />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5edf7" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="current" stroke={ch.color || "#1268f3"} strokeWidth={2} dot={false} name={String(new Date().getFullYear())} />
                <Line type="monotone" dataKey="previous" stroke={ch.colorPrevious || "#94a3b8"} strokeWidth={1.5} dot={false} name={String(new Date().getFullYear() - 1)} />
                <Line type="monotone" dataKey="objective" stroke={ch.colorObjective || "#cbd5e1"} strokeWidth={1.2} strokeDasharray="4 3" dot={false} name="Objectif" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </section>
  );
}

export default memo(ProgressionYoyChartsRow);
