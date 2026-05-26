import { memo } from "react";

const ICONS = {
  trend: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="m4 17 6-6 4 4 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8h6v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  mountain: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="m3 20 6-10 4 6 2-3 6 7Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="m12 3 2.7 6 6.3.6-4.8 4.4 1.4 6.2L12 17l-5.6 3.2 1.4-6.2L3 9.6l6.3-.6L12 3Z"
        fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
};

/**
 * ProgressionTakeawayCard — Mockup p.18 rail droit "À retenir".
 *
 * Liste de messages contextualises (tone : positive | warning | neutral).
 */
function ProgressionTakeawayCard({ items = [] }) {
  if (!items?.length) return null;
  return (
    <aside className="progression-panel progression-takeaway-card">
      <div className="progression-panel-head">
        <h3>À retenir</h3>
      </div>
      <ul className="progression-takeaway-list">
        {items.map((item) => (
          <li key={item.key} className={`progression-takeaway-item tone-${item.tone || "neutral"}`}>
            <span className="progression-takeaway-icon" aria-hidden="true">
              {ICONS[item.iconKey] || ICONS.trend}
            </span>
            <div className="progression-takeaway-body">
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default memo(ProgressionTakeawayCard);
