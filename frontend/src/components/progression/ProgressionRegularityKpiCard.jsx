import { memo } from "react";

const ICONS = {
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M3 9h18M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  flame: <path d="M12 3c2 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4-1 4 3 5 3 5s-3-4 0-11Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  shoe: <path d="M3 16h13l3-1c1 0 2 1 2 2v2H3v-3Zm0-3 5-7 4 1 1-2 4 2v6H3v0Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  check: <><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8 13l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></>,
};

/**
 * ProgressionRegularityKpiCard — Mockup p.19 Row 1.
 *
 * KPI : icone + label + valeur + hint (tone color).
 */
function ProgressionRegularityKpiCard({ kpi = {} }) {
  const tone = kpi.tone || "neutral";
  return (
    <article className={`progression-regularity-kpi-card progression-regularity-kpi-card-${tone}`}>
      <span className="progression-regularity-kpi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22">{ICONS[kpi.iconKey] || ICONS.calendar}</svg>
      </span>
      <div className="progression-regularity-kpi-body">
        <small className="progression-regularity-kpi-label">{kpi.label}</small>
        <strong className="progression-regularity-kpi-value">{kpi.formattedValue || "—"}</strong>
        {kpi.hint ? <span className={`progression-regularity-kpi-hint tone-${tone}`}>{kpi.hint}</span> : null}
      </div>
    </article>
  );
}

export default memo(ProgressionRegularityKpiCard);
