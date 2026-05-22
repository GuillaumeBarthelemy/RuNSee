import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";
import PerformanceFcKpiCard from "./PerformanceFcKpiCard.jsx";
import PerformanceFcKeyEffortsTable from "./PerformanceFcKeyEffortsTable.jsx";
import PerformanceFcSeuilEvolutionChart from "./PerformanceFcSeuilEvolutionChart.jsx";
import PerformanceFcDecouplingSampleCard from "./PerformanceFcDecouplingSampleCard.jsx";
import PerformanceFcReadingCard from "./PerformanceFcReadingCard.jsx";
import OverviewIntensityDonut from "../analytics/OverviewIntensityDonut.jsx";

// Icones SVG simples pour les 3 KPI cards
const ICONS = {
  seuil: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3 12h4l3-8 4 16 3-8h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  max: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M12 21s-7-4.7-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.3-7 11-7 11Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  decoupling: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3 17l5-5 4 4 5-7 4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/**
 * PerformanceFcPerformanceTab — Onglet `Performance > FC de performance`
 * (mockup p.15, spec section 10).
 *
 * Layout 2 colonnes :
 *   Centre :
 *     Row 1 : 3 KPI FC (Seuil / Max / Derive)
 *     Row 2 : FC dans efforts cles | Evolution FC seuil
 *     Row 3 : Exemple derive stable | Donut intensite (legere)
 *   Rail droit :
 *     - Lecture de l'effort (texte coach + FC repos + warning)
 */
function PerformanceFcPerformanceTab({ model = {}, intensityModel = null }) {
  if (!model?.hasData) {
    return (
      <div className="performance-fc-performance-tab">
        <PerformanceEmptyState message={model.emptyReason || "FC de performance indisponible : ajoute des sorties récentes avec FC."} />
      </div>
    );
  }

  const { kpi, keyEffortsHr, fcSeuilEvolution, stableSample, readingParagraphs, fcRepos, warning } = model;

  return (
    <div className="performance-fc-performance-tab">
      <div className="performance-fc-layout">
        <div className="performance-fc-central">
          {/* Row 1 : 3 KPI cards */}
          <div className="performance-fc-kpi-row">
            <PerformanceFcKpiCard label="FC seuil estimée" icon={ICONS.seuil} kpi={kpi?.fcSeuil || {}} />
            <PerformanceFcKpiCard label="FC max estimée" icon={ICONS.max} kpi={kpi?.fcMax || {}} />
            <PerformanceFcKpiCard label="Dérive cardiaque" icon={ICONS.decoupling} kpi={kpi?.decoupling || {}} />
          </div>

          {/* Row 2 : FC dans efforts cles | Evolution FC seuil */}
          <div className="performance-fc-row-mid">
            <PerformanceFcKeyEffortsTable rows={keyEffortsHr} fcMax={kpi?.fcMax?.value || 0} />
            <PerformanceFcSeuilEvolutionChart points={fcSeuilEvolution} />
          </div>

          {/* Row 3 : Exemple derive | Donut intensite (synthese legere) */}
          <div className="performance-fc-row-bottom">
            <PerformanceFcDecouplingSampleCard sample={stableSample} />
            {intensityModel?.hasData ? (
              <section className="performance-panel performance-fc-intensity-card">
                <div className="performance-panel-head">
                  <h3>Synthèse intensité cardiaque</h3>
                  <span className="performance-panel-sub">(légère, vue complète en Analyse &gt; Intensités)</span>
                </div>
                <OverviewIntensityDonut intensityModel={intensityModel} linkTo="/analytics#intensites" />
              </section>
            ) : null}
          </div>
        </div>

        <aside className="performance-fc-right-rail">
          <PerformanceFcReadingCard
            paragraphs={readingParagraphs || []}
            fcRepos={fcRepos}
            warning={warning}
          />
        </aside>
      </div>
    </div>
  );
}

export default memo(PerformanceFcPerformanceTab);
