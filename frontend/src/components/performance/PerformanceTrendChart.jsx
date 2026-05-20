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

const TREND_COLOR = "#7c3aed"; // violet mockup p.12

// Formatte les ticks de l'axe Y selon le signal actif.
// - adjustedPace : valeur en secondes/km -> "MM:SS"
// - autres : 1 decimale max
function formatYTick(value, signalKey) {
  if (!Number.isFinite(value)) return "";
  if (signalKey === "adjustedPace") {
    const s = Math.round(value);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  return Math.abs(value) >= 10 ? Math.round(value).toString() : value.toFixed(1);
}

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

  const hasTrend = trend?.hasData && availableSignals.length > 0;
  const hasEnoughPoints = chartData.length >= 2;

  return (
    <section className="performance-panel performance-trend-chart-card">
      <div className="performance-trend-chart-head">
        <div className="performance-trend-chart-title">
          <h3>Tendances de performance</h3>
          {/* Mockup p.12 : valeur active a GAUCHE sous le titre */}
          {activeSignal ? (
            <div className="performance-trend-chart-head-value">
              <strong>{activeSignal.formattedValue || "—"}</strong>
              {activeSignal.hint ? (
                <span className={`performance-trend-hint tone-${activeSignal.hintTone || "neutral"}`}>
                  {activeSignal.hint}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {/* Mockup p.12 : selecteur a DROITE inline avec le titre */}
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
        {hasTrend && hasEnoughPoints ? (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
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
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(value) => formatYTick(value, activeSignal?.key)}
                tickLine={false}
                axisLine={false}
                width={42}
                domain={["dataMin", "dataMax"]}
                // Pour adjustedPace : valeur basse (= allure rapide) = mieux,
                // donc on inverse l'axe pour que la courbe qui monte = progression.
                reversed={activeSignal?.key === "adjustedPace"}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
                formatter={(value) => [formatYTick(value, activeSignal?.key), activeSignal?.label || "Valeur"]}
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
        ) : (
          <div className="performance-trend-chart-empty">
            <strong>Pas assez de points</strong>
            <span>
              Ce signal a moins de 2 mesures exploitables sur la période. Choisis un autre
              indicateur ou élargis la période.
            </span>
          </div>
        )}
      </div>

      {activeSignal?.trendLabel ? (
        <span className={`performance-trend-caption tone-${activeSignal.hintTone || "neutral"}`}>
          {activeSignal.trendLabel}
        </span>
      ) : null}
    </section>
  );
}

export default memo(PerformanceTrendChart);
