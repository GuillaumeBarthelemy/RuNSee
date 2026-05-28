import { memo, useMemo } from "react";
import OverviewIndicatorCard from "./OverviewIndicatorCard.jsx";
import OverviewPaceAdjustedCard from "./OverviewPaceAdjustedCard.jsx";
import OverviewDecouplingCard from "./OverviewDecouplingCard.jsx";
import OverviewEpocCard from "./OverviewEpocCard.jsx";
import OverviewChargeFatigueRow from "./OverviewChargeFatigueRow.jsx";
import OverviewTakeawayBullets from "./OverviewTakeawayBullets.jsx";
import OverviewIntensityDonut from "./OverviewIntensityDonut.jsx";
import CoachAdviceBar from "../visuals/alpine/CoachAdviceBar.jsx";
import {
  buildPeriodPaceAdjustedSummary,
  buildPeriodDecouplingSummary,
  buildPeriodEpocSummary,
  buildOverviewTakeaways,
  buildFourWeeksBackComparison,
} from "../../utils/analyticsFocus.js";

/**
 * AnalyticsOverviewTab — onglet "Vue d'ensemble" (Lot 04 V5, PDF page 7).
 *
 * Refonte v2 :
 *  - Bandeau "État d'entraînement" compact RETIRÉ (décision §1).
 *  - Range bars horizontales graduées partout (décision §8).
 *  - Comparaison "vs 28 avr - 4 mai" (décision §4) : 4 semaines précédentes.
 *  - Histogrammes 7 derniers jours par jour avec moyenne (décision §5).
 *  - Carte État actuel CTL + ATL + ratio ATL/CTL (décision §6).
 *  - CoachAdviceBar bas de page (décision §7).
 *  - EPOC : temps de récupération Garmin au centre (décision §3).
 *  - Unité "UA" partout (décision §2).
 */

function formatHours(h) {
  if (!Number.isFinite(h) || h <= 0) return "—";
  const hours = Math.floor(h);
  const m = Math.round((h - hours) * 60);
  return `${hours}h ${String(m).padStart(2, "0")}`;
}

function formatHoursDelta(deltaHours, rangeLabel) {
  if (!Number.isFinite(deltaHours) || deltaHours === 0) return "";
  const sign = deltaHours > 0 ? "+" : "-";
  const abs = Math.abs(deltaHours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  const value = h === 0 ? `${m} min` : `${h}h ${String(m).padStart(2, "0")}`;
  return rangeLabel ? `${sign}${value} vs ${rangeLabel}` : `${sign}${value}`;
}

function AnalyticsOverviewTab({
  trainingLoadModel = {},
  efficiencyModel = {},
  intensityModel = {},
  // loadDynamicsProfile retiré du rendu Vue d'ensemble (ratio ATL/CTL utilisé à la place)
  weeklySummary = {},
  analyticsActivities = [],
  sharedRangeEnd = new Date(),
}) {
  const summary = trainingLoadModel?.summary || {};
  const chartData = useMemo(
    () => (Array.isArray(trainingLoadModel?.chartData) ? trainingLoadModel.chartData : []),
    [trainingLoadModel?.chartData],
  );

  // --- Charge 7j (somme load) ---
  const last7Points = chartData.slice(-7);
  const charge7d = last7Points.reduce((s, p) => s + (Number(p?.load) || 0), 0);

  // --- Fatigue ATL (dernière valeur) ---
  const fatigueValue = Number(summary?.atl) || 0;

  // --- Volume 7j (heures) ---
  // buildRegularitySummary expose `movingHours` (pas `hours`) sur les
  // éléments weeklySeries — bug initial corrigé : on lit le bon champ.
  const lastWeek = weeklySummary?.weeklySeries?.slice(-1)?.[0];
  const volumeHours = Number(lastWeek?.movingHours ?? lastWeek?.hours) || 0;

  // --- Comparaison 4 semaines avant ---
  const fourWeeksBack = useMemo(
    () => buildFourWeeksBackComparison({
      chartData,
      weeklySeries: weeklySummary?.weeklySeries || [],
      currentEnd: sharedRangeEnd,
    }),
    [chartData, weeklySummary?.weeklySeries, sharedRangeEnd],
  );

  // --- Deltas formatés ---
  const chargeDeltaPct = fourWeeksBack.chargeRef > 0
    ? Math.round(((charge7d - fourWeeksBack.chargeRef) / fourWeeksBack.chargeRef) * 100)
    : null;
  const chargeDeltaText = chargeDeltaPct != null
    ? `${chargeDeltaPct > 0 ? "+" : ""}${chargeDeltaPct} % vs ${fourWeeksBack.rangeLabel}`
    : "";

  const atlDelta = fourWeeksBack.atlRef > 0 ? fatigueValue - fourWeeksBack.atlRef : null;
  const atlDeltaText = atlDelta != null && Math.abs(atlDelta) > 0
    ? `${atlDelta > 0 ? "+" : ""}${Math.round(atlDelta)} vs ${fourWeeksBack.rangeLabel}`
    : "";

  const volumeDeltaH = fourWeeksBack.volumeRefHours > 0
    ? volumeHours - fourWeeksBack.volumeRefHours
    : null;
  const volumeDeltaText = volumeDeltaH != null
    ? formatHoursDelta(volumeDeltaH, fourWeeksBack.rangeLabel)
    : "";

  // --- Tones ---
  const chargeTone = charge7d >= 600 ? 5 : charge7d >= 400 ? 4 : charge7d >= 200 ? 2 : 3;
  const fatigueTone = fatigueValue >= 60 ? 4 : fatigueValue >= 35 ? 3 : 2;
  const volumeTone = (volumeDeltaH ?? 0) > 0.25 ? 1 : (volumeDeltaH ?? 0) < -0.25 ? 4 : 3;

  // --- Focus Performance ---
  const paceAdjusted = useMemo(
    () => buildPeriodPaceAdjustedSummary(efficiencyModel),
    [efficiencyModel],
  );
  const decoupling = useMemo(
    () => buildPeriodDecouplingSummary(analyticsActivities),
    [analyticsActivities],
  );
  const epoc = useMemo(
    () => buildPeriodEpocSummary(analyticsActivities),
    [analyticsActivities],
  );

  // --- À retenir narratif ---
  const takeawayBullets = useMemo(
    () => buildOverviewTakeaways({
      charge7d,
      chargeDelta: chargeDeltaPct,
      fatigueValue,
      fatigueDelta: atlDelta,
      volumeHours,
      volumeHoursDelta: volumeDeltaH,
      activities: analyticsActivities,
    }),
    [charge7d, chargeDeltaPct, fatigueValue, atlDelta, volumeHours, volumeDeltaH, analyticsActivities],
  );

  // --- Conseil bas de page (CoachAdviceBar) ---
  const coachMessage = (() => {
    if (charge7d >= 600 && fatigueValue >= 60) {
      return "Charge élevée + fatigue marquée. Privilégie la récupération active dans les prochains jours.";
    }
    if (charge7d >= 200 && charge7d < 600 && fatigueValue < 60) {
      return "Tu construis une bonne charge. Garde un œil sur la fatigue et privilégie la récupération active.";
    }
    if (charge7d < 200) {
      return "Volume léger sur la période. Bonne fenêtre pour reconstruire progressivement la base.";
    }
    return "Continue d'écouter ton corps et de maintenir un rythme d'entraînement cohérent.";
  })();
  const coachTone = chargeTone >= 4 ? "warning" : "info";

  return (
    <div className="alpine-analytics-tab alpine-analytics-tab--overview-v2">
      <div className="alpine-overview-layout">
        {/* === Colonne principale === */}
        <main className="alpine-overview-main">

          {/* Section INDICATEURS CLÉS */}
          <section className="alpine-overview-section">
            <h2 className="alpine-overview-section-title">Indicateurs clés</h2>
            <div className="alpine-overview-indicators-row">
              <OverviewIndicatorCard
                label="Charge d'entraînement (7 j)"
                value={charge7d > 0 ? Math.round(charge7d) : "—"}
                unit="UA"
                hint={charge7d >= 600 ? "Très élevée" : charge7d >= 400 ? "Élevée" : charge7d >= 200 ? "Standard" : "Légère"}
                delta={chargeDeltaText}
                tone={chargeTone}
                rangeBar={{
                  value: charge7d,
                  min: 0,
                  max: 900,
                  ticks: [
                    { value: 0,   label: "0" },
                    { value: 300, label: "300" },
                    { value: 600, label: "600" },
                    { value: 900, label: "900" },
                  ],
                  gradient: "warm",
                }}
              />
              <OverviewIndicatorCard
                label="Fatigue (ATL)"
                value={fatigueValue > 0 ? Math.round(fatigueValue) : "—"}
                unit="UA"
                hint={fatigueValue >= 60 ? "Élevée" : fatigueValue >= 35 ? "Modérée" : "Basse"}
                delta={atlDeltaText}
                tone={fatigueTone}
                rangeBar={{
                  value: fatigueValue,
                  min: 0,
                  max: 150,
                  ticks: [
                    { value: 0,   label: "0" },
                    { value: 50,  label: "50" },
                    { value: 100, label: "100" },
                    { value: 150, label: "150" },
                  ],
                  gradient: "warm",
                }}
              />
              <OverviewIndicatorCard
                label="Volume (7 j)"
                value={volumeHours > 0 ? formatHours(volumeHours) : "—"}
                hint={volumeHours >= 8 ? "Élevé" : volumeHours >= 5 ? "Soutenu" : volumeHours >= 2 ? "Régulier" : "Léger"}
                delta={volumeDeltaText}
                tone={volumeTone}
                rangeBar={{
                  value: volumeHours,
                  min: 0,
                  max: 10,
                  ticks: [
                    { value: 0,  label: "0" },
                    { value: 3,  label: "3h" },
                    { value: 6,  label: "6h" },
                    { value: 10, label: "10h" },
                  ],
                  gradient: "cool",
                }}
              />
            </div>
          </section>

          {/* Section FOCUS PERFORMANCE & EFFICIENCE */}
          <section className="alpine-overview-section">
            <h2 className="alpine-overview-section-title">Focus performance &amp; efficience</h2>
            <div className="alpine-overview-focus-row">
              <OverviewPaceAdjustedCard
                summary={paceAdjusted}
                comparisonLabel={fourWeeksBack.rangeLabel}
              />
              <OverviewDecouplingCard
                summary={decoupling}
                comparisonLabel={fourWeeksBack.rangeLabel}
              />
              <OverviewEpocCard summary={epoc} linkTo="/analytics#charges" />
            </div>
          </section>

          {/* Section CHARGE & FATIGUE (synthèse 7 jours par jour) */}
          <section className="alpine-overview-section">
            <h2 className="alpine-overview-section-title">Charge &amp; fatigue</h2>
            <OverviewChargeFatigueRow
              trainingLoadModel={trainingLoadModel}
              referenceEnd={sharedRangeEnd}
            />
          </section>

        </main>

        {/* === Right rail === */}
        <aside className="alpine-overview-rail">
          <OverviewTakeawayBullets bullets={takeawayBullets} linkTo="/analytics#charges" />
          <OverviewIntensityDonut intensityModel={intensityModel} linkTo="/analytics#intensites" />
        </aside>
      </div>

      {/* Bandeau coach bas de page (décision §7) */}
      <CoachAdviceBar tone={coachTone} icon="🏔️">
        {coachMessage}
      </CoachAdviceBar>
    </div>
  );
}

export default memo(AnalyticsOverviewTab);
