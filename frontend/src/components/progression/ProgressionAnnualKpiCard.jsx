import { memo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

const ICONS = {
  location: <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  clock: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  mountain: <path d="m3 20 6-10 4 6 2-3 6 7Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  runner: <path d="M13 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-2 6 3 1 2 4 2-1m-9 7 3-5 3 2-1 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M3 9h18M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  heart: <path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
};

/**
 * ProgressionAnnualKpiCard — Mockup p.17 Cumul annuel.
 *
 * KPI compact avec icone + valeur + delta + sparkline 12 mois.
 */
function ProgressionAnnualKpiCard({ kpi = {} }) {
  const points = Array.isArray(kpi.sparkline) ? kpi.sparkline : [];
  const tone = kpi.tone || "neutral";
  return (
    <article className={`progression-annual-kpi-card progression-annual-kpi-card-${tone}`}>
      <header className="progression-annual-kpi-head">
        <span className="progression-annual-kpi-icon" style={{ color: kpi.color || "#1268f3" }} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">{ICONS[kpi.iconKey] || null}</svg>
        </span>
        <span className="progression-annual-kpi-label">{kpi.label}</span>
      </header>
      <strong className="progression-annual-kpi-value">{kpi.formattedValue || "—"}</strong>
      <span className={`progression-annual-kpi-delta tone-${tone}`}>{kpi.formattedDelta || ""}</span>
      <div className="progression-annual-kpi-spark">
        {points.length > 0 ? (
          <ResponsiveContainer width="100%" height={36}>
            <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${kpi.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={kpi.color || "#1268f3"} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={kpi.color || "#1268f3"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="y" stroke={kpi.color || "#1268f3"} strokeWidth={1.6} fill={`url(#spark-${kpi.key})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </article>
  );
}

export default memo(ProgressionAnnualKpiCard);
