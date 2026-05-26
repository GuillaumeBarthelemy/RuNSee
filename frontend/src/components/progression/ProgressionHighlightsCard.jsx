import { memo } from "react";

const ICONS = {
  trophy: <path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 0 1-10 0V4Zm-2 0h2v3a3 3 0 0 1-3-3V4Zm14 0h-2v3a3 3 0 0 0 3-3V4Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  ruler: <><rect x="3" y="9" width="18" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M7 9v3M11 9v4M15 9v3M19 9v4" stroke="currentColor" strokeWidth="1.6" /></>,
  mountain: <path d="m3 20 6-10 4 6 2-3 6 7Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
};

/**
 * ProgressionHighlightsCard — Mockup p.17 Row 2 droite "Faits marquants".
 */
function ProgressionHighlightsCard({ items = [] }) {
  return (
    <aside className="progression-panel progression-highlights-card">
      <div className="progression-panel-head">
        <h3>Faits marquants</h3>
      </div>
      <ul className="progression-highlights-list">
        {items.map((it) => (
          <li key={it.key} className="progression-highlights-item">
            <span className="progression-highlights-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20">{ICONS[it.iconKey] || ICONS.trophy}</svg>
            </span>
            <div className="progression-highlights-body">
              <small>{it.title}</small>
              <strong>{it.mainText}</strong>
            </div>
            <span className="progression-highlights-side">{it.sideText}</span>
          </li>
        ))}
      </ul>
      <a className="progression-highlights-link" href="/performance#records">Voir tous les records</a>
    </aside>
  );
}

export default memo(ProgressionHighlightsCard);
