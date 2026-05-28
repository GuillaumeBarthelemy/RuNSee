import { memo } from "react";
import ProgressionKpiCard from "./ProgressionKpiCard.jsx";
import ProgressionWeeklyChart from "./ProgressionWeeklyChart.jsx";
import ProgressionCompositionChart from "./ProgressionCompositionChart.jsx";
import ProgressionPolarisationCard from "./ProgressionPolarisationCard.jsx";
import ProgressionTakeawayCard from "./ProgressionTakeawayCard.jsx";
import EmptyState from "../visuals/alpine/EmptyState.jsx";

/**
 * ProgressionVolumeTab — Mockup p.18 Progression > Volume.
 *
 * Layout 4 sections :
 *   Row 1 : 4 KPI cards (distance / temps / D+ / sorties)
 *   Row 2 : Charts hebdo (Distance | Temps | Denivele)  3 cols + rail droit "À retenir"
 *   Row 3 : Composition du volume 12 semaines (full width)
 */
function ProgressionVolumeTab({ model = {} }) {
  if (!model?.hasData) {
    return (
      <div className="progression-volume-tab">
        <EmptyState
          icon="🏔️"
          title="Pas encore assez de données"
          description={model?.emptyReason || "Ajoute des sorties pour construire l'historique de volume."}
        />
      </div>
    );
  }

  return (
    <div className="progression-volume-tab">
      <div className="progression-kpi-row">
        {(model.kpi || []).map((k) => (
          <ProgressionKpiCard key={k.key} kpi={k} />
        ))}
      </div>

      <div className="progression-charts-row">
        <div className="progression-charts-stack">
          <ProgressionWeeklyChart
            title="Volume hebdomadaire (distance)"
            subtitle="Distance hebdo + moyenne glissante 4 semaines"
            data={model.charts?.distance || []}
            barColor="#1268f3"
            lineColor="#0f172a"
            unit="km"
            formatValue={(n) => (Number.isFinite(n) ? n.toFixed(1).replace(".", ",") : "—")}
          />
          <ProgressionWeeklyChart
            title="Temps hebdomadaire"
            subtitle="Temps hebdo + moyenne glissante 4 semaines"
            data={model.charts?.time || []}
            barColor="#7c3aed"
            lineColor="#0f172a"
            unit="h"
            formatValue={(n) => (Number.isFinite(n) ? n.toFixed(1).replace(".", ",") : "—")}
          />
          <ProgressionWeeklyChart
            title="Dénivelé hebdomadaire"
            subtitle="D+ hebdo + moyenne glissante 4 semaines"
            data={model.charts?.elevation || []}
            barColor="#15803d"
            lineColor="#0f172a"
            unit="m"
            formatValue={(n) => (Number.isFinite(n) ? Math.round(n).toString() : "—")}
          />
        </div>
        <ProgressionTakeawayCard items={model.takeaways || []} />
      </div>

      <ProgressionCompositionChart
        data={model.composition || []}
        meta={model.compositionMeta || {}}
        intensityData={model.compositionByIntensity || []}
        intensityMeta={model.compositionByIntensityMeta || {}}
      />

      <ProgressionPolarisationCard polarisation={model.polarisation || {}} />
    </div>
  );
}

export default memo(ProgressionVolumeTab);
