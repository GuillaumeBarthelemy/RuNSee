import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";

function formatRaceTime(seconds) {
  const n = Math.max(0, Math.round(Number(seconds) || 0));
  if (n <= 0) return "—";
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * FC dans efforts cles (spec section 10.3 obligatoire).
 * Table + barres : FC moyenne et max sur 5k/10k/semi/marathon recents.
 */
function PerformanceFcKeyEffortsTable({ rows = [], fcMax = 0 }) {
  const usable = (Array.isArray(rows) ? rows : []).filter((r) => r?.averageHr != null || r?.maxHr != null);

  return (
    <section className="performance-panel performance-fc-key-efforts-card">
      <div className="performance-panel-head">
        <h3>FC dans tes efforts clés</h3>
        <span className="performance-panel-sub">(records récents)</span>
      </div>
      {usable.length > 0 ? (
        <table className="performance-fc-key-efforts-table">
          <thead>
            <tr>
              <th>Effort</th>
              <th>Temps</th>
              <th>FC moy.</th>
              <th>FC max</th>
              <th aria-label="Charge FC" />
            </tr>
          </thead>
          <tbody>
            {usable.map((row) => {
              const ratio = fcMax > 0 && row.averageHr > 0 ? row.averageHr / fcMax : 0;
              const widthPct = Math.max(2, Math.min(100, ratio * 100));
              return (
                <tr key={row.key}>
                  <td><strong>{row.label}</strong></td>
                  <td>{formatRaceTime(row.elapsedSeconds)}</td>
                  <td>{row.averageHr ? `${row.averageHr} bpm` : "—"}</td>
                  <td>{row.maxHr ? `${row.maxHr} bpm` : "—"}</td>
                  <td>
                    <div className="performance-fc-key-efforts-track">
                      <span className="performance-fc-key-efforts-fill" style={{ width: `${widthPct}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <PerformanceEmptyState message="Pas encore d'efforts clés avec FC moyenne." />
      )}
    </section>
  );
}

export default memo(PerformanceFcKeyEffortsTable);
