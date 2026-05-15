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

// Icônes sémantiques par key (mockup PDF page 7) :
//   - charge   → ✓ check (rond avec coche)
//   - fatigue  → ⚡ éclair
//   - volume   → 📈 flèche montante
// Couleur dérivée du tone (CSS .tone-N) sur le container.
const ICON_CHECK = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M7 12 L11 16 L17 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);
const ICON_BOLT = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M13 3 L7 13 L11 13 L10 21 L17 10 L13 10 Z" fill="currentColor" />
  </svg>
);
const ICON_TREND_UP = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M7 16 L11 12 L13 14 L17 8 M14 8 L17 8 L17 11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);
const ICON_TREND_DOWN = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M7 8 L11 12 L13 10 L17 16 M14 16 L17 16 L17 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);
const ICON_MINUS = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

function pickIcon(bullet) {
  if (!bullet) return ICON_MINUS;
  // Sémantique par key
  if (bullet.key === "charge") {
    // Charge maîtrisée ou modérée → check ; sinon éclair
    return bullet.tone <= 2 ? ICON_CHECK : ICON_BOLT;
  }
  if (bullet.key === "fatigue") {
    // Fatigue basse → check ; modérée/élevée → éclair
    return bullet.tone <= 2 ? ICON_CHECK : ICON_BOLT;
  }
  if (bullet.key === "volume") {
    // Volume en hausse → flèche up ; baisse → flèche down ; stable → minus
    if (bullet.tone === 1) return ICON_TREND_UP;
    if (bullet.tone === 4 || bullet.tone === 5) return ICON_TREND_DOWN;
    return ICON_MINUS;
  }
  return ICON_MINUS;
}

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
                {pickIcon(b)}
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
        <Link to={linkTo} className="alpine-overview-cta-button">
          Voir l'analyse complète
        </Link>
      ) : null}
    </article>
  );
}

export default memo(OverviewTakeawayBullets);
