import { memo } from "react";
import AnalysisConfidenceBadge from "../AnalysisConfidenceBadge.jsx";

function PerformanceTakeawayCard({ takeaway = {}, confidence = null }) {
  return (
    <section className={`performance-takeaway-card performance-tone-${takeaway.tone || "neutral"}`}>
      <h3 className="performance-takeaway-title">À retenir</h3>
      <div className="performance-takeaway-body">
        <span className="performance-takeaway-shield" aria-hidden="true">◇</span>
        <div>
          <strong className="performance-takeaway-subtitle">{takeaway.title || "Lecture prudente"}</strong>
          <p>{takeaway.text || "Les signaux disponibles doivent être lus avec le contexte terrain."}</p>
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
