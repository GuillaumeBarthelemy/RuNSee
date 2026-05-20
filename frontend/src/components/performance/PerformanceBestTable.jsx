import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

// Pictos Alpine Light (mockup p.12) : run-figure pour route, montagne pour trail.
function RunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="14.5" cy="4.5" r="1.8" fill="currentColor" />
      <path
        d="M9 21l3-6 3 2 2-4M6 12l3-3 4 2 3 4 3-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function MountainIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M3 19 9 8l4 7 2-3 6 7H3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function PerformanceBestTable({ preview = {} }) {
  return (
    <section className="performance-panel performance-best-table-card">
      <div className="performance-panel-head">
        <div>
          <h3>Meilleures performances</h3>
        </div>
      </div>

      {preview?.hasData ? (
        <>
          <div className="performance-best-table">
            {preview.rows.map((row) => {
              const isTrail = row.iconKey === "climb" || /trail/i.test(row.key || "");
              const Icon = isTrail ? MountainIcon : RunIcon;
              return (
                <div className="performance-best-table-row" key={row.key}>
                  <span className="performance-best-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <strong>{row.label}</strong>
                  <b>{row.value}</b>
                  {row.deltaLabel ? (
                    <span className={`performance-best-delta-pill tone-${row.deltaTone || "neutral"}`}>
                      {row.deltaLabel}
                    </span>
                  ) : (
                    <em className="performance-best-meta">{row.meta || ""}</em>
                  )}
                </div>
              );
            })}
          </div>
          <a className="performance-best-cta-link" href="#records" role="link">Voir tous les records</a>
        </>
      ) : (
        <PerformanceEmptyState message={preview.emptyReason} />
      )}
    </section>
  );
}

export default memo(PerformanceBestTable);
