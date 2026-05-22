import { memo } from "react";
import PerformanceEmptyState from "./PerformanceEmptyState.jsx";
import PerformancePaceCard from "./PerformancePaceCard.jsx";
import PerformancePaceComparisonBars from "./PerformancePaceComparisonBars.jsx";
import PerformanceThresholdEvolutionChart from "./PerformanceThresholdEvolutionChart.jsx";
import PerformancePaceEquivalencesTable from "./PerformancePaceEquivalencesTable.jsx";
import PerformancePaceZonesTable from "./PerformancePaceZonesTable.jsx";
import PerformancePaceUsageCard from "./PerformancePaceUsageCard.jsx";

/**
 * PerformanceAlluresReferenceTab — Onglet `Performance > Allures de référence`
 * (mockup p.14).
 *
 * Layout vertical (4 sections empilees) :
 *   Section 1 : Card 'Tes allures de référence' + 7 paceCards en grid horizontale
 *   Section 2 : Comparaison (2/3) + Évolution seuil (1/3)
 *   Section 3 : Équivalences (1/3) + Zones (1/3) + Comment utiliser (1/3)
 *   Footer    : Avertissement obligatoire (deja dans les tables)
 */
function PerformanceAlluresReferenceTab({ model = {} }) {
  if (!model?.hasData) {
    return (
      <div className="performance-allures-reference-tab">
        <PerformanceEmptyState message={model.emptyReason || "Tes allures s'afficheront ici dès que ton VDOT sera estimable."} />
      </div>
    );
  }

  return (
    <div className="performance-allures-reference-tab">
      {/* Section 1 : Header card + 7 paceCards */}
      <section className="performance-panel performance-allures-header">
        <div className="performance-panel-head">
          <div className="performance-allures-header-title">
            <h3>{model.title}</h3>
            <small>{model.subtitle}</small>
          </div>
          <div className="performance-allures-header-vdot">
            <small>VDOT estimé</small>
            <strong>{model.formattedVdot}</strong>
          </div>
        </div>
        <div className="performance-allures-pace-grid">
          {model.paceCards.map((card) => (
            <PerformancePaceCard key={card.key} card={card} />
          ))}
        </div>
      </section>

      {/* Section 2 : Comparaison + Évolution seuil */}
      <div className="performance-allures-row-comparison">
        <PerformancePaceComparisonBars rows={model.comparisonRows} />
        <PerformanceThresholdEvolutionChart evolution={model.thresholdEvolution} />
      </div>

      {/* Section 3 : Équivalences + Zones + Comment utiliser */}
      <div className="performance-allures-row-tables">
        <PerformancePaceEquivalencesTable equivalences={model.equivalences} warning={model.warning} />
        <PerformancePaceZonesTable zones={model.zones} />
        <PerformancePaceUsageCard tips={model.usageTips} />
      </div>
    </div>
  );
}

export default memo(PerformanceAlluresReferenceTab);
