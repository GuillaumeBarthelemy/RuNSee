import { memo } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

/**
 * ProgressionWeekdayBreakdown — Mockup p.19 Row 3 droite.
 *
 * Radar chart (toile polaire) : % sorties par jour de la semaine.
 *
 * Le format radar revele en un coup d'oeil les jours preferes et les patterns
 * de pratique (equilibre, semaine vs weekend, etc.).
 */
function ProgressionWeekdayBreakdown({ data = {} }) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = Number(data?.total) || 0;
  const periodWeeks = Number(data?.periodWeeks) || 0;
  const subtitle = total > 0
    ? `Sur ${periodWeeks} semaines · ${total} sortie${total > 1 ? "s" : ""}`
    : "Pas encore de données sur la période";

  // Max pour l'echelle radiale (arrondi a la dizaine sup)
  const maxPct = items.reduce((m, it) => Math.max(m, it.percent), 0);
  const radialMax = Math.max(10, Math.ceil(maxPct / 10) * 10 + 5);

  // Top jour pour annotation
  const topItem = items.reduce((best, it) => (it.percent > (best?.percent ?? 0) ? it : best), null);

  return (
    <section className="progression-panel progression-weekday-breakdown">
      <div className="progression-panel-head">
        <h3>Répartition des jours</h3>
        <span className="progression-panel-sub">{subtitle}</span>
      </div>
      <div className="progression-weekday-breakdown-body">
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={items} outerRadius="80%" cx="50%" cy="50%">
            <PolarGrid stroke="#e5edf7" />
            <PolarAngleAxis
              dataKey="shortLabel"
              tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, radialMax]}
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              tickFormatter={(v) => `${v}%`}
              stroke="#e5edf7"
            />
            <Radar
              name="% sorties"
              dataKey="percent"
              stroke="#1268f3"
              fill="#1268f3"
              fillOpacity={0.35}
              strokeWidth={2}
              dot={{ r: 3, fill: "#1268f3", stroke: "#fff", strokeWidth: 1.5 }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf7" }}
              formatter={(value, _name, payload) => [
                `${value} % · ${payload?.payload?.count ?? 0} sortie${payload?.payload?.count > 1 ? "s" : ""}`,
                payload?.payload?.label ?? "",
              ]}
              labelFormatter={() => ""}
            />
          </RadarChart>
        </ResponsiveContainer>
        {topItem && topItem.percent > 0 ? (
          <p className="progression-weekday-breakdown-insight">
            Tu cours le plus souvent le <strong>{topItem.label.toLowerCase()}</strong> ({topItem.percent} %).
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default memo(ProgressionWeekdayBreakdown);
