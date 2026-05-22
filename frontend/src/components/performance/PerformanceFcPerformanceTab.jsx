import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";
import PerformanceFcKpiCard from "./PerformanceFcKpiCard.jsx";
import PerformanceFcKeyEffortsTable from "./PerformanceFcKeyEffortsTable.jsx";
import PerformanceFcDecouplingSampleCard from "./PerformanceFcDecouplingSampleCard.jsx";
import PerformanceFcReadingCard from "./PerformanceFcReadingCard.jsx";
import OverviewIntensityDonut from "../analytics/OverviewIntensityDonut.jsx";

// Icones SVG pour les 4 KPI cards (mockup p.15)
const ICONS = {
  seuil: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M3 12h4l3-8 4 16 3-8h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  max: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M3 17l5-5 4 4 5-7 4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  decoupling: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  repos: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7-4.7-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.3-7 11-7 11Z" />
    </svg>
  ),
};

/**
 * PerformanceFcPerformanceTab — Mockup p.15 (refactor 2026-05-22).
 *
 * Layout vertical 3 rows :
 *   Row 1 : 4 KPI cards (FC seuil / Max / Derive / FC repos)
 *   Row 2 : FC dans efforts cles (table par TYPE) | Evolution FC seuil (chart)
 *   Row 3 : Derive stable | Lecture coach | Repartition intensite (donut)
 */
function PerformanceFcPerformanceTab({ model = {}, intensityModel = null, confidence = null }) {
  if (!model?.hasData) {
    return (
      <div className="performance-fc-performance-tab">
        <PerformanceEmptyState message={model.emptyReason || "FC de performance indisponible : ajoute des sorties récentes avec FC."} />
      </div>
    );
  }

  const { kpi, effortsByType, stableSample, reading, warning } = model;

  return (
    <div className="performance-fc-performance-tab">
      {/* Row 1 : 4 KPI cards (FC seuil mini-trend = evolution -> pas de chart separe) */}
      <div className="performance-fc-kpi-row">
        <PerformanceFcKpiCard label="FC seuil estimée" icon={ICONS.seuil} kpi={kpi?.fcSeuil || {}} />
        <PerformanceFcKpiCard label="FC max estimée" icon={ICONS.max} kpi={kpi?.fcMax || {}} />
        <PerformanceFcKpiCard label="Dérive cardiaque" icon={ICONS.decoupling} kpi={kpi?.decoupling || {}} />
        <PerformanceFcKpiCard label="FC repos" icon={ICONS.repos} kpi={kpi?.fcRepos || {}} />
      </div>

      {/* Row 2 : FC dans efforts cles (large) | Exemple derive stable */}
      <div className="performance-fc-row-mid">
        <PerformanceFcKeyEffortsTable rows={effortsByType} />
        <PerformanceFcDecouplingSampleCard sample={stableSample} />
      </div>

      {/* Row 3 : Lecture coach | Repartition intensite (donut) */}
      <div className="performance-fc-row-bottom-two">
        <PerformanceFcReadingCard reading={reading} confidence={confidence} warning={warning} />
        {intensityModel?.hasData ? (
          <section className="performance-panel performance-fc-intensity-card">
            <div className="performance-panel-head">
              <h3>Répartition du temps par intensité cardiaque</h3>
            </div>
            <OverviewIntensityDonut intensityModel={intensityModel} linkTo="/analytics#intensites" />
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default memo(PerformanceFcPerformanceTab);
