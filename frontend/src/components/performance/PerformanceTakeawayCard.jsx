import { memo } from "react";
import AnalysisConfidenceBadge from "../AnalysisConfidenceBadge.jsx";

// Mockup p.12 : pictogramme bouclier (Alpine Light) au lieu du losange.
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d="M12 2.5 4 5v6.2c0 4.6 3.2 8.6 8 10.3 4.8-1.7 8-5.7 8-10.3V5l-8-2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="m9.2 12.2 2.1 2.1 3.6-4.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PerformanceTakeawayCard({ takeaway = {}, confidence = null }) {
  const paragraphs = Array.isArray(takeaway.paragraphs) && takeaway.paragraphs.length
    ? takeaway.paragraphs
    : [takeaway.text || "Les signaux disponibles doivent être lus avec le contexte terrain."];

  return (
    <section className={`performance-takeaway-card performance-tone-${takeaway.tone || "neutral"}`}>
      <h3 className="performance-takeaway-title">À retenir</h3>
      <div className="performance-takeaway-body">
        <span className="performance-takeaway-shield" aria-hidden="true">
          <ShieldIcon />
        </span>
        <div>
          <strong className="performance-takeaway-subtitle">{takeaway.title || "Lecture prudente"}</strong>
          {paragraphs.map((paragraph, index) => (
            <p key={`takeaway-p-${index}`}>{paragraph}</p>
          ))}
        </div>
      </div>

      {confidence ? (
        <div className="performance-takeaway-confidence">
          <small className="performance-takeaway-confidence-label">Confiance de l'estimation</small>
          <AnalysisConfidenceBadge confidence={confidence} compact />
        </div>
      ) : null}
    </section>
  );
}

export default memo(PerformanceTakeawayCard);
