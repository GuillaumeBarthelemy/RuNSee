import { memo } from "react";

function PerformanceLimitsCard({ limits = [] }) {
  return (
    <section className="performance-panel performance-limits-card">
      <div className="performance-panel-head">
        <h3>Limites de lecture</h3>
        <span className="performance-panel-sub">(à garder en tête)</span>
      </div>
      <ul className="performance-limits-list">
        {(Array.isArray(limits) ? limits : []).map((limit) => (
          <li key={limit.title}>
            <strong>{limit.title}</strong>
            <p>{limit.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default memo(PerformanceLimitsCard);
