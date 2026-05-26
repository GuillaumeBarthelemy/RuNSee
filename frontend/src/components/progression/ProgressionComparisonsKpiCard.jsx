import { memo } from "react";

const ICONS = {
  trend: <path d="m4 17 6-6 4 4 6-7M14 8h6v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  clock: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  mountain: <path d="m3 20 6-10 4 6 2-3 6 7Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  balance: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M12 3v18M3 12h18" fill="none" stroke="currentColor" strokeWidth="1.6" /></>,
};

/**
 * ProgressionComparisonsKpiCard — Mockup p.20 Row 1.
 */
function ProgressionComparisonsKpiCard({ kpi = {} }) {
  const tone = kpi.tone || "neutral";
  return (
    <article className={`progression-comparisons-kpi-card progression-comparisons-kpi-card-${tone}`}>
      <span className="progression-comparisons-kpi-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22">{ICONS[kpi.iconKey] || ICONS.trend}</svg>
      </span>
      <div className="progression-comparisons-kpi-body">
        <small className="progression-comparisons-kpi-label">{kpi.label}</small>
        <div className="progression-comparisons-kpi-value-row">
          <strong className="progression-comparisons-kpi-value">{kpi.formattedValue}</strong>
          {kpi.sublabel ? <span className="progression-comparisons-kpi-sublabel">{kpi.sublabel}</span> : null}
        </div>
        {kpi.formattedHint ? (
          <span className={`progression-comparisons-kpi-hint tone-${tone}`}>{kpi.formattedHint}</span>
        ) : null}
      </div>
    </article>
  );
}

export default memo(ProgressionComparisonsKpiCard);
