import { memo } from "react";

/**
 * PerformancePaceZonesTable — Mockup p.14 bottom centre.
 *
 * Tableau Daniels Z1-Z5 : Zone | Plage allure /km | Utilisation recommandée.
 * Dot couleur par zone.
 */
function PerformancePaceZonesTable({ zones = [] }) {
  return (
    <section className="performance-panel performance-pace-zones-card">
      <div className="performance-panel-head">
        <h3>Zones d'allure</h3>
        <span className="performance-panel-sub">Allure /km</span>
      </div>
      <table className="performance-pace-zones-table">
        <thead>
          <tr>
            <th>Zone</th>
            <th>Plage</th>
            <th>Utilisation recommandée</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((zone) => (
            <tr key={zone.key}>
              <td>
                <span className="performance-pace-zone-label">
                  <span className="performance-pace-zone-dot" style={{ background: zone.color }} aria-hidden="true" />
                  <strong>{zone.label}</strong>
                </span>
              </td>
              <td><b>{zone.formattedRange}</b></td>
              <td><span>{zone.usage}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="performance-pace-zones-footer">
        Les zones d'allure sont des repères. Privilégie toujours la régularité, la sensation d'effort et la fréquence cardiaque.
      </p>
    </section>
  );
}

export default memo(PerformancePaceZonesTable);
