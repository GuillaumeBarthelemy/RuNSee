import { memo } from "react";

/**
 * Lecture de l'effort — mockup p.15.
 * Structure :
 *   - icone bouclier
 *   - résumé tone-aware
 *   - section "Pour progresser :" avec checks ✓ contextualisés
 *   - footer "Confiance de l'estimation : Élevée"
 */
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M12 2.5 4 5v6.2c0 4.6 3.2 8.6 8 10.3 4.8-1.7 8-5.7 8-10.3V5l-8-2.5Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m9.2 12.2 2.1 2.1 3.6-4.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8 12 3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PerformanceFcReadingCard({ reading = null, confidence = null, warning = "" }) {
  if (!reading) return null;

  return (
    <section className="performance-panel performance-fc-reading-card">
      <div className="performance-panel-head">
        <h3>Lecture de l'effort</h3>
      </div>
      <div className="performance-fc-reading-body">
        <span className="performance-fc-reading-shield" aria-hidden="true">
          <ShieldIcon />
        </span>
        <div>
          <p className="performance-fc-reading-summary">{reading.summary}</p>
          {Array.isArray(reading.checks) && reading.checks.length ? (
            <>
              <strong className="performance-fc-reading-checks-title">Pour progresser :</strong>
              <ul className="performance-fc-reading-checks">
                {reading.checks.map((c, idx) => (
                  <li key={`fc-check-${idx}`}>
                    <span className="performance-fc-reading-check-icon" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
      {confidence ? (
        <div className="performance-fc-reading-confidence">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>Confiance de l'estimation : <strong>{(confidence.label || "—").replace(/^Confiance\s+/i, "").replace(/^./, (c) => c.toUpperCase())}</strong></span>
        </div>
      ) : null}
      {warning ? <p className="performance-fc-reading-warning">{warning}</p> : null}
    </section>
  );
}

export default memo(PerformanceFcReadingCard);
