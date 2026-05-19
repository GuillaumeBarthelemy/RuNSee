import { memo } from "react";
import AnalysisConfidenceBadge from "../AnalysisConfidenceBadge.jsx";

function PerformanceTakeawayCard({ takeaway = {}, confidence = null }) {
  return (
    <section className={`performance-takeaway-card performance-tone-${takeaway.tone || "neutral"}`}>
      <span className="performance-panel-kicker">À retenir</span>
      <div className="performance-takeaway-body">
        <span className="performance-takeaway-shield" aria-hidden="true">◇</span>
        <div>
          <h3>{takeaway.title || "Lecture prudente"}</h3>
          <p>{takeaway.text || "Les signaux disponibles doivent être lus avec le contexte terrain."}</p>
        </div>
      </div>

      {confidence ? (
        <div className="performance-takeaway-confidence">
          <AnalysisConfidenceBadge confidence={confidence} compact />
        </div>
      ) : null}
    </section>
  );
}

export default memo(PerformanceTakeawayCard);
