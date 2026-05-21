import { memo } from "react";

/**
 * PerformanceProfileIndicatifCard — Mockup p.13.
 *
 * Info box explicative à droite du radar.
 */
function PerformanceProfileIndicatifCard() {
  return (
    <section className="performance-panel performance-profile-indicatif-card">
      <div className="performance-profile-indicatif-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 8h.01M11 12h1v4h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="performance-profile-indicatif-body">
        <strong>Profil indicatif</strong>
        <p>
          Ce profil est estimé à partir de tes performances et peut varier
          selon ta fatigue, ton terrain et tes conditions d'entraînement.
        </p>
      </div>
    </section>
  );
}

export default memo(PerformanceProfileIndicatifCard);
