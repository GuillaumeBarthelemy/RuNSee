import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STACK_KEYS = ["trail", "route", "sortie_longue", "recuperation", "autre"];

/**
 * ProgressionCompositionChart — Mockup p.18 Progression > Volume bas.
 *
 * Stacked bars 12 dernieres semaines, % par categorie d'effort.
 */
function ProgressionCompositionChart({ data = [], meta = {} }) {
  return (
    <section className="progression-panel progression-composition-chart">
      <div className="progression-panel-head">
        <h3>Composition de ton volume (12 dernières semaines)</h3>
        <span className="progression-panel-sub">Répartition par type de sortie (%)</span>
      </div>
      <div className="progression-composition-chart-body">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e5edf7" }}
              minTickGap={16}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
              formatter={(value, key) => [`${value}%`, meta[key]?.label || key]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(key) => meta[key]?.label || key}
            />
            {STACK_KEYS.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="composition"
                fill={meta[key]?.color || "#94a3b8"}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default memo(ProgressionCompositionChart);
