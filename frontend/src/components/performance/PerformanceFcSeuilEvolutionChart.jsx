import { memo, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

const COLOR = "#dc2626";

/**
 * Évolution FC seuil (spec section 10.3 obligatoire, tendance lissee).
 */
function PerformanceFcSeuilEvolutionChart({ points = [] }) {
  const { yTicks, yDomain } = useMemo(() => {
    const values = (points || [])
      .map((p) => Number(p?.value))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (values.length < 2) return { yTicks: undefined, yDomain: ["dataMin", "dataMax"] };
    const minV = Math.floor(Math.min(...values));
    const maxV = Math.ceil(Math.max(...values));
    const span = Math.max(1, maxV - minV);
    const step = Math.max(1, Math.ceil(span / 4));
    const ticks = [];
    for (let v = minV; v <= maxV; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] !== maxV) ticks.push(maxV);
    return { yTicks: ticks, yDomain: [minV - 2, maxV + 2] };
  }, [points]);

  if (!Array.isArray(points) || points.length < 2) {
    return (
      <section className="performance-panel performance-fc-seuil-evolution-card">
        <div className="performance-panel-head">
          <h3>Évolution de ta FC seuil</h3>
        </div>
        <PerformanceEmptyState message="Pas encore assez de sorties au seuil pour tracer la tendance." />
      </section>
    );
  }

  return (
    <section className="performance-panel performance-fc-seuil-evolution-card">
      <div className="performance-panel-head">
        <h3>Évolution de ta FC seuil</h3>
        <span className="performance-panel-sub">(bpm, sorties au seuil)</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="perf-fc-seuil-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR} stopOpacity={0.2} />
              <stop offset="100%" stopColor={COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e5edf7" }}
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => `${v}`}
            tickLine={false}
            axisLine={false}
            width={42}
            domain={yDomain}
            ticks={yTicks}
            interval={0}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
            formatter={(value) => [`${value} bpm`, "FC seuil"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={COLOR}
            strokeWidth={3}
            fill="url(#perf-fc-seuil-area)"
            dot={false}
            activeDot={{ r: 5, stroke: COLOR, strokeWidth: 2, fill: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}

export default memo(PerformanceFcSeuilEvolutionChart);
