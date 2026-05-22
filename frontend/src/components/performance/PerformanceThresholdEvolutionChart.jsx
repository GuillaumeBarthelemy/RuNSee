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

const COLOR = "#f97316"; // Orange (mockup p.14)

function formatPaceTick(seconds) {
  const n = Math.max(0, Math.round(Number(seconds) || 0));
  if (n <= 0) return "";
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

/**
 * PerformanceThresholdEvolutionChart — Mockup p.14 milieu droite.
 *
 * Line chart 30 jours de l'allure seuil (Z4) avec side metrics :
 *   - Dernière valeur (gros)
 *   - Évolution sur 30 jours
 *   - Tendance (En amélioration / Stable / En retrait)
 */
function PerformanceThresholdEvolutionChart({ evolution = {} }) {
  if (!evolution?.hasData) {
    return (
      <section className="performance-panel performance-threshold-evolution-card">
        <div className="performance-panel-head">
          <h3>Évolution de ton allure seuil (Z4)</h3>
        </div>
        <PerformanceEmptyState message="Pas assez de données récentes pour tracer l'évolution de ton seuil." />
      </section>
    );
  }

  const summary = evolution.summary || {};

  return (
    <section className="performance-panel performance-threshold-evolution-card">
      <div className="performance-panel-head">
        <h3>Évolution de ton allure seuil (Z4)</h3>
        <span className="performance-panel-sub">Allure seuil (/km)</span>
      </div>
      <div className="performance-threshold-evolution-body">
        <div className="performance-threshold-evolution-chart">
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <AreaChart data={evolution.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="perf-threshold-area" x1="0" y1="0" x2="0" y2="1">
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
                minTickGap={28}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={formatPaceTick}
                tickLine={false}
                axisLine={false}
                width={48}
                domain={["dataMin", "dataMax"]}
                // Pour pace : valeur basse = plus rapide -> haut du chart
                reversed
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
                formatter={(value) => [formatPaceTick(value), "Allure seuil"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={COLOR}
                strokeWidth={3}
                fill="url(#perf-threshold-area)"
                dot={false}
                activeDot={{ r: 5, stroke: COLOR, strokeWidth: 2, fill: "#fff" }}
                baseValue="dataMax"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <aside className="performance-threshold-evolution-side">
          <div>
            <small>Dernière valeur</small>
            <strong>{summary.formattedLastValue || "—"}<small> /km</small></strong>
          </div>
          <div>
            <small>Évolution (30 jours)</small>
            <strong className={`tone-${summary.tone || "neutral"}`}>
              {summary.formattedDelta || "—"}<small> /km</small>
            </strong>
            {summary.tone === "positive" ? <em>Plus rapide</em> : null}
            {summary.tone === "warning" ? <em>Plus lent</em> : null}
          </div>
          <div>
            <small>Tendance</small>
            <strong className={`tone-${summary.tone || "neutral"}`}>{summary.trendLabel || "Stable"}</strong>
          </div>
        </aside>
      </div>
      {summary.formattedDelta ? (
        <span className={`performance-threshold-evolution-pill tone-${summary.tone || "neutral"}`}>
          {summary.formattedDelta} sur 30 jours
        </span>
      ) : null}
    </section>
  );
}

export default memo(PerformanceThresholdEvolutionChart);
