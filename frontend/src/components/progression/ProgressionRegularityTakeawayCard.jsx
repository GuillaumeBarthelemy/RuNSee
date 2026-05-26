import { memo } from "react";

const ICONS = {
  leaf: <path d="M5 18s2-9 11-13c0 9-4 14-11 13Zm0 0c3-1 5-2 7-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  flame: <path d="M12 3c2 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4-1 4 3 5 3 5s-3-4 0-11Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  shoe: <path d="M3 16h13l3-1c1 0 2 1 2 2v2H3v-3Zm0-3 5-7 4 1 1-2 4 2v6H3v0Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M3 9h18M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  star: <path d="m12 3 2.7 6 6.3.6-4.8 4.4 1.4 6.2L12 17l-5.6 3.2 1.4-6.2L3 9.6l6.3-.6L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
};

/**
 * ProgressionRegularityTakeawayCard — Mockup p.19 rail droit "À retenir".
 */
function ProgressionRegularityTakeawayCard({ items = [], tipCard = null }) {
  return (
    <aside className="progression-regularity-rail">
      <div className="progression-panel progression-regularity-takeaway-panel">
        <div className="progression-panel-head">
          <h3>À retenir</h3>
        </div>
        <ul className="progression-regularity-takeaway-list">
          {items.map((it) => (
            <li key={it.key} className={`progression-regularity-takeaway-item tone-${it.tone || "neutral"}`}>
              <span className="progression-regularity-takeaway-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20">{ICONS[it.iconKey] || ICONS.leaf}</svg>
              </span>
              <div className="progression-regularity-takeaway-body">
                <strong>{it.title}</strong>
                <p>{it.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {tipCard ? (
        <div className="progression-regularity-tip-card">
          <span className="progression-regularity-tip-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">{ICONS.star}</svg>
          </span>
          <div>
            <strong>{tipCard.title}</strong>
            <p>{tipCard.text}</p>
            <a href="#conseils">Voir tous les conseils</a>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

export default memo(ProgressionRegularityTakeawayCard);
