import { memo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * ProgressionWeeklyChart — Mockup p.18 Progression > Volume.
 *
 * Bar chart hebdo + ligne moyenne glissante 4 sem.
 * Reutilise pour Distance / Temps / Denivele.
 *
 * Props :
 * - title       : string
 * - subtitle    : string
 * - data        : [{ label, value, rolling }]
 * - barColor    : couleur des barres
 * - lineColor   : couleur de la ligne moyenne
 * - unit        : string suffixe (km, h, m)
 * - formatValue : (n) => string
 */
function ProgressionWeeklyChart({
  title = "",
  subtitle = "",
  data = [],
  barColor = "#1268f3",
  lineColor = "#0f172a",
  unit = "",
  formatValue = (n) => (Number.isFinite(n) ? n.toFixed(1).replace(".", ",") : "—"),
}) {
  return (
    <section className="progression-panel progression-weekly-chart">
      <div className="progression-panel-head">
        <h3>{title}</h3>
        {subtitle ? <span className="progression-panel-sub">{subtitle}</span> : null}
      </div>
      <div className="progression-weekly-chart-body">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e5edf7" }}
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v) => formatValue(v)}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
              formatter={(value, name) => [
                `${formatValue(value)}${unit ? ` ${unit}` : ""}`,
                name === "value" ? "Hebdo" : "Moyenne 4 sem",
              ]}
            />
            <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Line
              type="monotone"
              dataKey="rolling"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 3"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default memo(ProgressionWeeklyChart);
