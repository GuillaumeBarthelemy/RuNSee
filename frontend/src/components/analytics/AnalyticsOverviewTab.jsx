import { memo, useMemo } from "react";
import AnalyticsTakeawayCard from "./AnalyticsTakeawayCard.jsx";
import OverviewIndicatorCard from "./OverviewIndicatorCard.jsx";
import OverviewPaceAdjustedCard from "./OverviewPaceAdjustedCard.jsx";
import OverviewDecouplingCard from "./OverviewDecouplingCard.jsx";
import OverviewEpocCard from "./OverviewEpocCard.jsx";
import OverviewChargeFatigueRow from "./OverviewChargeFatigueRow.jsx";
import OverviewTakeawayBullets from "./OverviewTakeawayBullets.jsx";
import OverviewIntensityDonut from "./OverviewIntensityDonut.jsx";
import {
  buildPeriodPaceAdjustedSummary,
  buildPeriodDecouplingSummary,
  buildPeriodEpocSummary,
  buildOverviewTakeaways,
} from "../../utils/analyticsFocus.js";

/**
 * AnalyticsOverviewTab — onglet "Vue d'ensemble" (Lot 04 V5, PDF page 7).
 *
 * Layout 2 colonnes desktop, 1 col mobile :
 *
 *   [Bandeau compact Score composite]  (en haut, pleine largeur)
 *
 *   ┌──────────────────────────────┐  ┌────────────┐
 *   │ INDICATEURS CLÉS (3 cards)   │  │ À retenir  │
 *   │ FOCUS PERFO (3 cards)        │  │ Donut      │
 *   │ CHARGE & FATIGUE (2 charts + │  │ intensités │
 *   │   gauges)                    │  │            │
 *   └──────────────────────────────┘  └────────────┘
 *
 * Anti-régression : view models reçus en props, aucun calcul métier dans le tab.
 */

function formatHours(h) {
  if (!Number.isFinite(h) || h <= 0) return "—";
  const hours = Math.floor(h);
  const m = Math.round((h - hours) * 60);
  return `${hours}h ${String(m).padStart(2, "0")}`;
}

function AnalyticsOverviewTab({
  trainingState = null,
  trainingLoadModel = {},
  efficiencyModel = {},
  intensityModel = {},
  loadDynamicsProfile = {},
  weeklySummary = {},
  analyticsActivities = [],
}) {
  // --- Indicateurs CLÉS ---
  const summary = trainingLoadModel?.summary || {};
  const chartData = Array.isArray(trainingLoadModel?.chartData) ? trainingLoadModel.chartData : [];

  // Charge 7j = somme des `load` des 7 derniers points (granularité daily)
  const last7Load = chartData.slice(-7);
  const charge7d = last7Load.reduce((s, p) => s + (Number(p?.load) || 0), 0);
  const prev7Load = chartData.slice(-14, -7);
  const chargePrev7 = prev7Load.reduce((s, p) => s + (Number(p?.load) || 0), 0);
  const chargeDelta = charge7d - chargePrev7;

  const fatigueValue = Number(summary?.atl) || 0;
  const fatigueDelta = Number(summary?.atlDeltaValue) || 0;

  // Volume 7j (heures) depuis weeklySummary
  const lastWeek = weeklySummary?.weeklySeries?.slice(-1)?.[0];
  const prevWeek = weeklySummary?.weeklySeries?.slice(-2, -1)?.[0];
  const volumeHours = Number(lastWeek?.hours) || 0;
  const volumeHoursDelta = volumeHours - (Number(prevWeek?.hours) || 0);

  // Mini-bars (7 derniers points)
  const chargeSeries = last7Load.map((p) => Number(p?.load) || 0);
  const fatigueSeries = chartData.slice(-14).map((p) => Number(p?.atl) || 0);
  const volumeSeries = (weeklySummary?.weeklySeries || []).slice(-7).map((w) => Number(w?.hours) || 0);

  const chargeTone = charge7d >= 600 ? 5 : charge7d >= 400 ? 4 : charge7d >= 200 ? 2 : 3;
  const fatigueTone = fatigueValue >= 60 ? 4 : fatigueValue >= 35 ? 3 : 2;
  const volumeTone = volumeHoursDelta > 0.25 ? 1 : volumeHoursDelta < -0.25 ? 4 : 3;

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
      chargeDelta,
      fatigueValue,
      fatigueDelta,
      volumeHours,
      volumeHoursDelta,
    }),
    [charge7d, chargeDelta, fatigueValue, fatigueDelta, volumeHours, volumeHoursDelta],
  );

  return (
    <div className="alpine-analytics-tab alpine-analytics-tab--overview-v2">
      {/* Bandeau compact score composite (en haut) */}
      {trainingState ? (
        <AnalyticsTakeawayCard state={trainingState} variant="compact" />
      ) : null}

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
                unit="pts"
                hint={charge7d >= 600 ? "Très élevée" : charge7d >= 400 ? "Élevée" : charge7d >= 200 ? "Standard" : "Légère"}
                delta={chargeDelta !== 0 ? `${chargeDelta > 0 ? "+" : ""}${Math.round(chargeDelta)} vs S-1` : ""}
                tone={chargeTone}
                series={chargeSeries}
              />
              <OverviewIndicatorCard
                label="Fatigue (ATL)"
                value={fatigueValue > 0 ? Math.round(fatigueValue) : "—"}
                unit="pts"
                hint={fatigueValue >= 60 ? "Élevée" : fatigueValue >= 35 ? "Modérée" : "Basse"}
                delta={fatigueDelta !== 0 ? `${fatigueDelta > 0 ? "+" : ""}${Math.round(fatigueDelta)} vs hier` : ""}
                tone={fatigueTone}
                series={fatigueSeries}
              />
              <OverviewIndicatorCard
                label="Volume (7 j)"
                value={formatHours(volumeHours)}
                hint={volumeHours >= 8 ? "Élevé" : volumeHours >= 4 ? "Standard" : "Léger"}
                delta={Math.abs(volumeHoursDelta) > 0.05
                  ? `${volumeHoursDelta > 0 ? "+" : ""}${formatHours(Math.abs(volumeHoursDelta))} vs S-1`
                  : ""}
                tone={volumeTone}
                series={volumeSeries}
              />
            </div>
          </section>

          {/* Section FOCUS PERFORMANCE & EFFICIENCE */}
          <section className="alpine-overview-section">
            <h2 className="alpine-overview-section-title">Focus performance & efficience</h2>
            <div className="alpine-overview-focus-row">
              <OverviewPaceAdjustedCard summary={paceAdjusted} />
              <OverviewDecouplingCard summary={decoupling} />
              <OverviewEpocCard summary={epoc} />
            </div>
          </section>

          {/* Section CHARGE & FATIGUE (synthèse, duplication assumée avec onglet Charges) */}
          <section className="alpine-overview-section">
            <h2 className="alpine-overview-section-title">Charge & fatigue</h2>
            <OverviewChargeFatigueRow
              trainingLoadModel={trainingLoadModel}
              loadDynamicsProfile={loadDynamicsProfile}
            />
          </section>

        </main>

        {/* === Right rail === */}
        <aside className="alpine-overview-rail">
          <OverviewTakeawayBullets bullets={takeawayBullets} linkTo="/analytics#charges" />
          <OverviewIntensityDonut intensityModel={intensityModel} linkTo="/analytics#intensites" />
        </aside>
      </div>
    </div>
  );
}

export default memo(AnalyticsOverviewTab);
