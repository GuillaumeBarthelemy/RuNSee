import { memo } from "react";

// Icones SVG simples pour les 4 conseils mockup p.14.
const ICONS = {
  terrain: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M3 19 9 8l4 7 2-3 6 7H3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  fc: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M12 21s-7-4.7-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.3-7 11-7 11Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  plan: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  reeval: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

function PerformancePaceUsageCard({ tips = [] }) {
  return (
    <section className="performance-panel performance-pace-usage-card">
      <div className="performance-panel-head">
        <h3>Comment utiliser tes allures</h3>
      </div>
      <ul className="performance-pace-usage-list">
        {tips.map((tip) => (
          <li key={tip.key}>
            <span className="performance-pace-usage-icon" aria-hidden="true">
              {ICONS[tip.key] || ICONS.reeval}
            </span>
            <div>
              <strong>{tip.title}</strong>
              <p>{tip.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default memo(PerformancePaceUsageCard);
