import { memo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * ProgressionMonthlyChart — Progression mensuelle / hebdomadaire.
 *
 * Bar chart Distance (bleu) + D+ (violet) groupés, avec bascule
 * Mois / Semaine (mockup p.17 Row 3 gauche).
 */
function ProgressionMonthlyChart({ data = {} }) {
  const [granularity, setGranularity] = useState("month"); // "month" | "week"
  const year = data?.year || new Date().getFullYear();
  const monthlyPoints = Array.isArray(data?.points) ? data.points : [];
  const weeklyPoints = Array.isArray(data?.weeklyPoints) ? data.weeklyPoints : [];
  const isWeek = granularity === "week";
  const points = isWeek ? weeklyPoints : monthlyPoints;
  const hasWeekly = weeklyPoints.length > 0;

  return (
    <section className="progression-panel progression-monthly-card">
      <div className="progression-panel-head">
        <h3>{isWeek ? "Progression hebdomadaire" : "Progression mensuelle"}</h3>
        <div className="progression-monthly-head-right">
          <div className="progression-granularity-toggle" role="tablist" aria-label="Granularité">
            <button
              type="button"
              role="tab"
              aria-selected={!isWeek}
              className={!isWeek ? "is-active" : ""}
              onClick={() => setGranularity("month")}
            >
              Mois
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isWeek}
              className={isWeek ? "is-active" : ""}
              onClick={() => setGranularity("week")}
              disabled={!hasWeekly}
            >
              Semaine
            </button>
          </div>
          <span className="progression-panel-sub">{year}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%" minHeight={260}>
        <BarChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e5edf7" }}
            interval={isWeek ? "preserveStartEnd" : 0}
            minTickGap={isWeek ? 16 : 4}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => `${Math.round(v)}`}
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
            labelFormatter={(label) => (isWeek ? `Semaine du ${label}` : label)}
            formatter={(value, name) => [
              name === "distanceKm"
                ? `${Number(value).toFixed(1).replace(".", ",")} km`
                : `${Math.round(value)} m`,
              name === "distanceKm" ? "Distance" : "Dénivelé+",
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(k) => (k === "distanceKm" ? "Distance (km)" : "Dénivelé+ (m)")} />
          <Bar yAxisId="left" dataKey="distanceKm" fill="#1268f3" radius={[3, 3, 0, 0]} maxBarSize={isWeek ? 10 : 18} />
          <Bar yAxisId="right" dataKey="elevationM" fill="#a855f7" radius={[3, 3, 0, 0]} maxBarSize={isWeek ? 10 : 18} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

export default memo(ProgressionMonthlyChart);
