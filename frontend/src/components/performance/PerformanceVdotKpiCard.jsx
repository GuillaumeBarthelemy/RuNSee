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
              { label: "Calcul", text: "Score Daniels 1979 calculé à partir de tes meilleures performances route récentes." },
              { label: "Lecture", text: "Indicateur de niveau aérobie, pas une mesure laboratoire." },
            ]}
            compact
            label="Aide VDOT"
          />
        </span>
      </header>
      <strong className="performance-vdot-kpi-value">{kpi.formattedVdot || "—"}</strong>
      <span className={`performance-vdot-kpi-hint tone-${kpi.level?.tone || "neutral"}`}>
        {kpi.level?.label || "Profil estimé"}
      </span>

      <span className="performance-vdot-kpi-evolution-label">Évolution sur 90 jours</span>

      {data.length >= 2 ? (
        <div className="performance-vdot-kpi-chart">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="perf-vdot-kpi-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={toneColor} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={toneColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e5edf7" }}
                minTickGap={28}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={(v) => Number(v).toFixed(0)}
                tickLine={false}
                axisLine={false}
                width={28}
                domain={["dataMin - 1", "dataMax + 1"]}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
                formatter={(value) => [Number(value).toFixed(1), "VDOT"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={toneColor}
                strokeWidth={2.2}
                fill="url(#perf-vdot-kpi-area)"
                dot={false}
                activeDot={{ r: 4 }}
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
