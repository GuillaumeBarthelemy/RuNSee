import { memo, useMemo, useState } from "react";
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

const TREND_COLOR = "#7c3aed"; // violet mockup p.12

function PerformanceTrendChart({ trend = {} }) {
  const availableSignals = useMemo(
    () => (Array.isArray(trend.availableSignals) ? trend.availableSignals : []),
    [trend.availableSignals],
  );
  const [selectedKey, setSelectedKey] = useState("");

  const activeSignal = useMemo(() => {
    if (!availableSignals.length) return null;
    return availableSignals.find((s) => s.key === selectedKey) || availableSignals[0];
  }, [availableSignals, selectedKey]);

  const chartData = useMemo(() => {
    const seriesToPlot = activeSignal?.series || trend.series || [];
    if (!Array.isArray(seriesToPlot)) return [];
    return seriesToPlot
      .map((point) => ({
        label: point?.label || "",
        value: Number(point?.value),
      }))
      .filter((point) => Number.isFinite(point.value));
  }, [activeSignal, trend.series]);

  if (!trend?.hasData || chartData.length < 2) {
    return (
      <section className="performance-panel performance-trend-chart-card">
        <h3>Tendances de performance</h3>
        <PerformanceEmptyState message="Les tendances ont besoin de plusieurs signaux comparables." />
      </section>
    );
  }

  return (
    <section className="performance-panel performance-trend-chart-card">
      <div className="performance-trend-chart-head">
        <div>
          <h3>Tendances de performance</h3>
        </div>
        <div className="performance-trend-chart-head-value">
          <small>{activeSignal?.label || trend.primaryLabel || "Signal"}</small>
          <strong>{activeSignal?.formattedValue || trend.primaryValue}</strong>
          {(activeSignal?.hint || trend.primaryHint) ? (
            <span className={`performance-trend-hint tone-${activeSignal?.hintTone || trend.primaryHintTone || "neutral"}`}>
              {activeSignal?.hint || trend.primaryHint}
            </span>
          ) : null}
        </div>
        {availableSignals.length > 1 ? (
          <select
            className="performance-trend-signal-select"
            value={activeSignal?.key || availableSignals[0]?.key || ""}
            onChange={(event) => setSelectedKey(event.target.value)}
            aria-label="Signal de tendance"
          >
            {availableSignals.map((signal) => (
              <option key={signal.key} value={signal.key}>{signal.label}</option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="performance-trend-chart-recharts">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="performance-trend-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TREND_COLOR} stopOpacity={0.25} />
                <stop offset="100%" stopColor={TREND_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e5edf7" }}
              minTickGap={16}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              width={36}
              domain={["dataMin", "dataMax"]}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
              formatter={(value) => [value, activeSignal?.label || "Valeur"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={TREND_COLOR}
              strokeWidth={3}
              fill="url(#performance-trend-area)"
              dot={{ r: 3, stroke: TREND_COLOR, strokeWidth: 2, fill: "#fff" }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <span className="performance-trend-caption">
        {trend.rows?.[0]?.value || trend.text}
      </span>
    </section>
  );
}

export default memo(PerformanceTrendChart);
