import { memo } from "react";

/**
 * PerformancePaceComparisonBars — Mockup p.14 milieu gauche.
 *
 * Table avec colonnes : Allure | Allure /km | Écart à l'allure facile | (bar horizontale).
 * Bar horizontale colorée représente l'écart vs facile. Plus c'est rapide,
 * plus la barre est longue vers la droite.
 */
function PerformancePaceComparisonBars({ rows = [] }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  // Max absolute delta pour normaliser les longueurs de barres.
  const maxDelta = Math.max(...rows.map((r) => Math.abs(Number(r.deltaSeconds) || 0)), 1);

  return (
    <section className="performance-panel performance-pace-comparison-bars">
      <div className="performance-panel-head">
        <h3>Comparaison des allures de référence</h3>
      </div>
      <table className="performance-pace-comparison-table">
        <thead>
          <tr>
            <th>Allure</th>
            <th>Allure /km</th>
            <th>Écart à l'allure facile</th>
            <th aria-label="Visualisation" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const delta = Number(row.deltaSeconds) || 0;
            // Toutes les paces sauf facile sont plus rapides => delta négatif.
            // On affiche la barre proportionnellement vers la droite (plus c'est rapide,
            // plus la barre est longue).
            const widthPct = delta === 0 ? 2 : Math.min(100, (Math.abs(delta) / maxDelta) * 95);
            return (
              <tr key={row.key}>
                <td>
                  <span className="performance-pace-comparison-row-label">
                    <span className="performance-pace-comparison-row-dot" style={{ background: row.color }} aria-hidden="true" />
                    {row.label} <small>({row.zoneLabel?.replace("Zone ", "")?.replace("Entre ", "")})</small>
                  </span>
                </td>
                <td><b>{row.formattedPace}</b></td>
                <td><em className={`performance-pace-comparison-delta ${delta < 0 ? "is-faster" : ""}`}>{row.formattedDelta}</em></td>
                <td>
                  <div className="performance-pace-comparison-track">
                    <span
                      className="performance-pace-comparison-fill"
                      style={{ width: `${widthPct}%`, background: row.color }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="performance-pace-comparison-axis">← Allure plus rapide</p>
    </section>
  );
}

export default memo(PerformancePaceComparisonBars);
