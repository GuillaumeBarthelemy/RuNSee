import { memo } from "react";
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

const COLOR = "#7c3aed";

function PerformanceVdotHistoryChart({ history = [] }) {
  const data = Array.isArray(history)
    ? history.filter((p) => Number.isFinite(Number(p?.value)) && Number(p.value) > 0)
    : [];

  if (data.length < 2) {
    return (
      <section className="performance-panel performance-vdot-history-card">
        <div className="performance-panel-head">
          <h3>Évolution sur 90 jours</h3>
        </div>
        <PerformanceEmptyState message="Pas assez de points pour tracer l'évolution VDOT." />
      </section>
    );
  }

  return (
    <section className="performance-panel performance-vdot-history-card">
      <div className="performance-panel-head">
        <h3>Évolution sur 90 jours</h3>
        <span className="performance-panel-sub">(VDOT estimé)</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="perf-vdot-history" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR} stopOpacity={0.22} />
              <stop offset="100%" stopColor={COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e5edf7" }}
            minTickGap={20}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => Number(v).toFixed(1)}
            tickLine={false}
            axisLine={false}
            width={42}
            domain={["dataMin", "dataMax"]}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
            formatter={(value) => [Number(value).toFixed(1), "VDOT"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={COLOR}
            strokeWidth={2.5}
            fill="url(#perf-vdot-history)"
            dot={{ r: 2.5, stroke: COLOR, strokeWidth: 2, fill: "#fff" }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}

export default memo(PerformanceVdotHistoryChart);
