import { memo, useMemo } from "react";
import { buildInfoBlocks } from "../content/analyticsCopy.js";
import { buildActivityItems } from "../utils/activityInsights.js";
import {
  formatEfficiencyValue,
  formatTrainingLoadValue,
} from "../utils/trainingMetrics.js";
import InfoTooltip from "./InfoTooltip.jsx";

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatPace(secondsPerKm) {
  const safe = Math.round(Number(secondsPerKm) || 0);

  if (safe <= 0) {
    return "-";
  }

  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

function getPaceDeltaLabel(paceSecondsPerKm, gapSecondsPerKm) {
  const pace = toNumber(paceSecondsPerKm);
  const gap = toNumber(gapSecondsPerKm);

  if (pace <= 0 || gap <= 0) {
    return "Pente non exploitable";
  }

  const delta = Math.round(gap - pace);

  if (Math.abs(delta) <= 2) {
    return "Profil proche du plat";
  }

  return delta < 0
    ? `${Math.abs(delta)} s/km plus rapide ajuste`
    : `${delta} s/km plus lent ajuste`;
}

const PERFORMANCE_INFO = {
  load: buildInfoBlocks({
    role: "Charge estimee pour cette seance.",
    calculation: "RunNSee utilise la cascade de charge existante : TRIMP si la cardio est exploitable, puis RPE, puis repli documente.",
    interpretation: "Compare cette valeur aux autres seances similaires plutot qu'a une distance brute.",
    glossaryKey: "trimp",
  }),
  efficiency: buildInfoBlocks({
    role: "Relation entre vitesse mecanique et reponse cardiaque.",
    calculation: "Sur les sorties comparables, on divise la vitesse moyenne par la FC moyenne.",
    interpretation: "Une valeur qui monte a conditions comparables suggere une meilleure efficience.",
  }),
  pace: buildInfoBlocks({
    role: "Allure moyenne observee sur la seance.",
    calculation: "Allure calculee a partir du temps de mouvement et de la distance.",
    interpretation: "C'est l'allure brute, non ajustee au relief.",
  }),
  gap: buildInfoBlocks({
    role: "Allure ajustee selon la pente.",
    calculation: "Le GAP convertit l'effet du relief en equivalent allure sur terrain plus neutre.",
    interpretation: "Utile pour comparer une sortie vallonnee a une sortie plus plate, avec prudence.",
    glossaryKey: "gap",
  }),
};

function PerformanceTile({ title, info, value, detail, tone = "neutral" }) {
  return (
    <section className={`intra-session-block activity-performance-tile intra-session-block-${tone}`.trim()}>
      <header className="intra-session-block-header">
        <div className="title-with-info">
          <h4 className="intra-session-block-title">{title}</h4>
          <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
        </div>
      </header>
      <strong className="intra-session-block-value">{value}</strong>
      <span className="small-text">{detail}</span>
    </section>
  );
}

function ActivityPerformanceStrip({
  activity = {},
  trainingInsights = {},
  trainingAnalyticsSettings = null,
}) {
  const activityItem = useMemo(
    () => buildActivityItems([activity || {}], { settings: trainingAnalyticsSettings })[0] || {},
    [activity, trainingAnalyticsSettings],
  );
  const observedPace = toNumber(activityItem.__paceSecondsPerKm);
  const gradeAdjustedPace = toNumber(activityItem.__gradeAdjustedPaceSecondsPerKm);

  return (
    <section className="activity-performance-strip">
      <div className="activity-performance-title-row">
        <div>
          <h3 className="subcard-title">Performance de cette seance</h3>
          <p className="card-subtitle">Charge, efficience et allures utiles sans alourdir la tete de fiche.</p>
        </div>
      </div>

      <div className="activity-performance-grid">
        <PerformanceTile
          title="Charge"
          info={PERFORMANCE_INFO.load}
          value={formatTrainingLoadValue(trainingInsights?.load)}
          detail="Charge de seance"
          tone="neutral"
        />
        <PerformanceTile
          title="Efficience"
          info={PERFORMANCE_INFO.efficiency}
          value={trainingInsights?.efficiencyEligible ? formatEfficiencyValue(trainingInsights?.efficiency) : "-"}
          detail={trainingInsights?.efficiencyEligible ? "Sortie comparable" : trainingInsights?.efficiencyReason || "Non eligible"}
          tone="neutral"
        />
        <PerformanceTile
          title="Allure observee"
          info={PERFORMANCE_INFO.pace}
          value={formatPace(observedPace)}
          detail="Allure brute"
          tone="neutral"
        />
        <PerformanceTile
          title="GAP"
          info={PERFORMANCE_INFO.gap}
          value={formatPace(gradeAdjustedPace)}
          detail={getPaceDeltaLabel(observedPace, gradeAdjustedPace)}
          tone="neutral"
        />
      </div>
    </section>
  );
}

export default memo(ActivityPerformanceStrip);
