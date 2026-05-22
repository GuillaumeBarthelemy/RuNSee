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
import InfoTooltip from "../InfoTooltip.jsx";

/**
 * PerformanceVdotKpiCard — Mockup p.13 row 1 col 1.
 *
 * Combine en une seule card :
 *   - VDOT estimé (gros) + hint tone
 *   - "Évolution sur 90 jours" + mini chart
 *   - Delta pill "+1 vs 90 jours précédents (fév. - avr.)"
 */
function PerformanceVdotKpiCard({ kpi = {}, history = [], deltaLabel = "", deltaTone = "neutral" }) {
  const data = Array.isArray(history)
    ? history.filter((p) => Number.isFinite(Number(p?.value)) && Number(p.value) > 0)
    : [];

  const toneColor = kpi.level?.tone === "warning" ? "#ea580c"
    : kpi.level?.tone === "danger" ? "#dc2626"
      : "#16a34a";

  return (
    <section className="performance-panel performance-vdot-kpi-card">
      <header className="performance-vdot-kpi-head">
        <span className="performance-vdot-kpi-label">
          VDOT estimé
          <InfoTooltip
            title="VDOT estimé"
            content={[
              { label: "Source", text: kpi.source === "garmin"
                ? "Valeur Garmin (wellness quotidien Firstbeat). Validation labo Knaier 2019 r=0.93 vs VO₂max mesurée."
                : "Estimation Daniels 1979 calculée à partir de tes meilleures performances route récentes." },
              { label: "Lecture", text: "Indicateur de niveau aérobie, pas une mesure laboratoire." },
            ]}
            compact
            label="Aide VDOT"
          />
        </span>
      </header>
      <div className="performance-vdot-kpi-value-row">
        <strong className="performance-vdot-kpi-value">{kpi.formattedVdot || "—"}</strong>
        {kpi.sourceLabel ? (
          <em className="performance-vdot-kpi-source">via {kpi.sourceLabel}</em>
        ) : null}
      </div>
      <span className={`performance-vdot-kpi-hint tone-${kpi.level?.tone || "neutral"}`}>
        {kpi.level?.label || "Profil estimé"}
      </span>

      <span className="performance-vdot-kpi-evolution-label">Évolution sur 90 jours</span>

      {data.length >= 2 ? (
        <div className="performance-vdot-kpi-chart">
          <ResponsiveContainer width="100%" height="100%" minHeight={140}>
            <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="perf-vdot-kpi-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={toneColor} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={toneColor} stopOpacity={0} />
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
                width={36}
                domain={["dataMin", "dataMax"]}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
                formatter={(value) => [Number(value).toFixed(1), "VDOT"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={toneColor}
                strokeWidth={3}
                fill="url(#perf-vdot-kpi-area)"
                // Pas de pastille sur chaque point (90 jours = trop dense).
                // Aligne sur PerformanceMiniTrend (Vue d'ensemble) : courbe
                // pure, pastille visible uniquement au hover.
                dot={false}
                activeDot={{ r: 5, stroke: toneColor, strokeWidth: 2, fill: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {deltaLabel ? (
        <span className={`performance-vdot-kpi-delta tone-${deltaTone}`}>{deltaLabel}</span>
      ) : null}
    </section>
  );
}

export default memo(PerformanceVdotKpiCard);
