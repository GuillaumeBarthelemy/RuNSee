import { memo } from "react";

/**
 * ActivityTakeawaysCard — Carte "À retenir" synthetique de la seance.
 * @param {Array} items — [{ key, icon, text, tone }]
 */
function ActivityTakeawaysCard({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <section className="activity-takeaways-card">
      <h4 className="activity-takeaways-title">À retenir</h4>
      <ul className="activity-takeaways-list">
        {items.map((it) => (
          <li key={it.key} className={`activity-takeaway activity-takeaway-${it.tone || "neutral"}`}>
            <span className="activity-takeaway-icon" aria-hidden="true">{it.icon}</span>
            <span className="activity-takeaway-text">{it.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default memo(ActivityTakeawaysCard);
