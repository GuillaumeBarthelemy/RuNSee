import { memo, useMemo, useState } from "react";
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

const SPORT_STACK_KEYS = ["trail", "route", "sortie_longue", "recuperation", "autre"];
const INTENSITY_STACK_KEYS = ["low", "mid", "high"];

/**
 * ProgressionCompositionChart — Mockup p.18 Progression > Volume bas.
 *
 * Stacked bars 12 dernieres semaines, % par categorie.
 * Toggle : composition par TYPE DE SORTIE (sport) ou par INTENSITE
 * (classification user low/mid/high).
 */
function ProgressionCompositionChart({
  data = [],
  meta = {},
  intensityData = [],
  intensityMeta = {},
}) {
  const hasIntensity = Array.isArray(intensityData)
    && intensityData.some((d) => (d.low || 0) + (d.mid || 0) + (d.high || 0) > 0);
  const [mode, setMode] = useState("sport");

  const activeMode = hasIntensity ? mode : "sport";
  const { chartData, stackKeys, chartMeta } = useMemo(() => {
    if (activeMode === "intensity") {
      return { chartData: intensityData, stackKeys: INTENSITY_STACK_KEYS, chartMeta: intensityMeta };
    }
    return { chartData: data, stackKeys: SPORT_STACK_KEYS, chartMeta: meta };
  }, [activeMode, data, meta, intensityData, intensityMeta]);

  return (
    <section className="progression-panel progression-composition-chart">
      <div className="progression-panel-head">
        <h3>Composition de ton volume (12 dernières semaines)</h3>
        <span className="progression-panel-sub">
          {activeMode === "intensity"
            ? "Répartition par intensité (% distance)"
            : "Répartition par type de sortie (%)"}
        </span>
        {hasIntensity ? (
          <div className="progression-composition-toggle" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === "sport"}
              className={`progression-composition-toggle-btn ${activeMode === "sport" ? "is-active" : ""}`}
              onClick={() => setMode("sport")}
            >
              Type de sortie
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === "intensity"}
              className={`progression-composition-toggle-btn ${activeMode === "intensity" ? "is-active" : ""}`}
              onClick={() => setMode("intensity")}
            >
              Intensité
            </button>
          </div>
        ) : null}
      </div>
      <div className="progression-composition-chart-body">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
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
              formatter={(value, key) => [`${value}%`, chartMeta[key]?.label || key]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(key) => chartMeta[key]?.label || key}
            />
            {stackKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="composition"
                fill={chartMeta[key]?.color || "#94a3b8"}
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
