import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

const ICONS = {
  record: "↗",
  speed: "⌁",
  distance: "⌖",
  climb: "△",
};

function PerformanceBestTable({ preview = {} }) {
  return (
    <section className="performance-panel performance-best-table-card">
      <div className="performance-panel-head">
        <div>
          <span className="performance-panel-kicker">Repères</span>
          <h3>Meilleures performances</h3>
        </div>
      </div>

      {preview?.hasData ? (
        <div className="performance-best-table">
          {preview.rows.map((row) => (
            <div className="performance-best-table-row" key={row.key}>
              <span className="performance-best-icon" aria-hidden="true">
                {ICONS[row.iconKey] || "•"}
              </span>
              <div>
                <strong>{row.label}</strong>
                <small>{row.title}</small>
              </div>
              <b>{row.value}</b>
              <em>{row.meta || ""}</em>
            </div>
          ))}
        </div>
      ) : (
        <PerformanceEmptyState message={preview.emptyReason} />
      )}
    </section>
  );
}

export default memo(PerformanceBestTable);
