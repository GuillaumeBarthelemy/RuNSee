import { memo } from "react";
import { Link } from "react-router-dom";
import { clampTone } from "../../utils/tonePicker.js";

/**
 * OverviewTakeawayBullets — Right rail "À retenir" PDF page 7.
 *
 * 3 puces narratives colorées (Charge / Fatigue / Volume) + lien analyse.
 *
 * Props :
 *  - bullets : sortie de buildOverviewTakeaways
 *  - linkTo : string optionnel
 */

const ICONS = {
  1: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M7 12 L11 16 L17 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  2: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M7 12 L11 16 L17 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  3: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  4: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 L22 21 L2 21 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <line x1="12" y1="10" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  5: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

function OverviewTakeawayBullets({ bullets = [], linkTo = "/analytics#charges" }) {
  return (
    <article className="alpine-overview-takeaway">
      <header className="alpine-overview-takeaway-head">
        <h3 className="alpine-overview-takeaway-title">À retenir</h3>
      </header>
      <ul className="alpine-overview-takeaway-list">
        {bullets.map((b) => {
          const tone = clampTone(b.tone || 3);
          return (
            <li key={b.key} className={`alpine-overview-takeaway-item tone-${tone}`}>
              <span className={`alpine-overview-takeaway-icon tone-${tone}`}>
                {ICONS[tone] || ICONS[3]}
              </span>
              <div className="alpine-overview-takeaway-content">
                <strong className={`alpine-overview-takeaway-item-title tone-${tone}`}>
                  {b.title}
                </strong>
                <p className="alpine-overview-takeaway-item-text">{b.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {linkTo ? (
        <Link to={linkTo} className="alpine-overview-takeaway-link">
          Voir l'analyse complète →
        </Link>
      ) : null}
    </article>
  );
}

export default memo(OverviewTakeawayBullets);
