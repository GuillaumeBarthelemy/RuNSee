import { memo } from "react";

/**
 * ProgressionInsightsCards — Mockup p.20 Row 4.
 *
 * "Ce qui progresse" (vert) | "À surveiller" (orange).
 */
function ProgressionInsightsCards({ progressItems = [], watchItems = [] }) {
  return (
    <div className="progression-insights-row">
      <section className="progression-insights-card progression-insights-progress">
        <header>
          <span className="progression-insights-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="m4 17 6-6 4 4 6-7M14 8h6v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h3>Ce qui progresse</h3>
        </header>
        <ul>
          {progressItems.map((text, i) => (
            <li key={i}>
              <span className="progression-insights-bullet" aria-hidden="true">✓</span>
              {text}
            </li>
          ))}
        </ul>
      </section>
      <section className="progression-insights-card progression-insights-watch">
        <header>
          <span className="progression-insights-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 7v6m0 3v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <h3>À surveiller</h3>
        </header>
        <ul>
          {watchItems.map((text, i) => (
            <li key={i}>
              <span className="progression-insights-bullet" aria-hidden="true">●</span>
              {text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default memo(ProgressionInsightsCards);
