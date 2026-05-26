import { memo } from "react";

/**
 * ProgressionKpiCard — Mockup p.18 Progression > Volume (4 KPIs).
 *
 * Carte simple : icone + label + valeur + delta (vs annee precedente).
 * Tone : positive (vert), warning (orange), neutral (gris).
 */

const ICONS = {
  location: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"
        fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  mountain: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="m3 20 6-10 4 6 2-3 6 7Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

function ProgressionKpiCard({ kpi = {} }) {
  const icon = ICONS[kpi.iconKey] || null;
  const tone = kpi.deltaTone || "neutral";
  return (
    <article className={`progression-kpi-card progression-kpi-card-${tone}`}>
      <header className="progression-kpi-card-head">
        {icon ? <span className="progression-kpi-card-icon" aria-hidden="true">{icon}</span> : null}
        <span className="progression-kpi-card-label">{kpi.label}</span>
      </header>
      <strong className="progression-kpi-card-value">{kpi.formattedValue || "—"}</strong>
      <span className={`progression-kpi-card-delta tone-${tone}`}>
        {kpi.deltaLabel || ""}
      </span>
    </article>
  );
}

export default memo(ProgressionKpiCard);
