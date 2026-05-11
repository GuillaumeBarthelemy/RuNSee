import { memo, useMemo } from "react";
import ZoneLoadDistributionCard from "../ZoneLoadDistributionCard.jsx";
import { computePolarizationIndex } from "../../utils/polarizationIndex.js";
import { clampTone } from "../../utils/tonePicker.js";

/**
 * AnalyticsIntensitiesTab — onglet "Intensités" (Lot 04, plan §4).
 *
 * Affiche :
 *   - ZoneLoadDistributionCard : distribution charge ou durée par zone FC.
 *   - Carte Polarization Index (Treff 2019) : indice numérique log10
 *     calculé à partir des shares Seiler 3 zones (low/moderate/high)
 *     déjà fournies par buildIntensityPolarizationProfile.
 *
 * Aucun calcul métier modifié — Polarization Index est un agrégé statistique
 * pur appliqué sur des données déjà calculées par utils existants.
 */
function AnalyticsIntensitiesTab({
  intensityModel = {},
  polarizationModel = {},
  intensityInfo = {},
  intensityNarrative = "",
  selectedMetric = "load",
  metricOptions = [],
  onMetricChange = () => {},
}) {
  const polarizationIndex = useMemo(() => {
    if (!polarizationModel || !polarizationModel.hasData) {
      return computePolarizationIndex({});
    }
    return computePolarizationIndex({
      z1Pct: polarizationModel.lowShare,
      z2Pct: polarizationModel.moderateShare,
      z3Pct: polarizationModel.highShare,
    });
  }, [polarizationModel]);

  const piTone = clampTone(polarizationIndex.tone || 3);
  const hasPi = Number.isFinite(polarizationIndex.index);

  return (
    <div className="alpine-analytics-tab alpine-analytics-tab--intensities">
      <div className="alpine-analytics-tab-section">
        <div className="analysis-section-intro">
          <span className="eyebrow">Intensités</span>
          <h2 className="card-title">Répartition des intensités</h2>
          <p className="card-subtitle">Charge ou durée par zone FC.</p>
        </div>
        <ZoneLoadDistributionCard
          model={intensityModel}
          title="Répartition des intensités"
          subtitle=""
          info={intensityInfo}
          accentColor="#F97316"
          selectedMetric={selectedMetric}
          metricControlLabel="Mesure"
          metricOptions={metricOptions}
          onMetricChange={onMetricChange}
          insight={intensityNarrative}
        />
      </div>

      <div className="alpine-analytics-tab-section">
        <article className={`alpine-pi-card tone-${piTone}`}>
          <header className="alpine-pi-card-head">
            <span className="eyebrow">Indice de polarisation</span>
            <h3 className="card-title">Polarization Index (Treff 2019)</h3>
            <p className="card-subtitle">
              Formule : PI = log<sub>10</sub>((Z1 % × Z3 %) / Z2 %²)
            </p>
          </header>

          <div className="alpine-pi-card-body">
            <div className="alpine-pi-card-value-block">
              <strong className={`alpine-pi-card-value tone-${piTone}`}>
                {hasPi ? polarizationIndex.index.toFixed(2) : "—"}
              </strong>
              <span className={`alpine-pi-card-level tone-${piTone}`}>
                {polarizationIndex.label}
              </span>
            </div>

            <div className="alpine-pi-card-zones">
              {polarizationModel?.hasData ? (
                <ul>
                  <li><span>Z1 (facile)</span><strong>{polarizationModel.lowShare} %</strong></li>
                  <li><span>Z2 (modérée)</span><strong>{polarizationModel.moderateShare} %</strong></li>
                  <li><span>Z3 (intense)</span><strong>{polarizationModel.highShare} %</strong></li>
                </ul>
              ) : (
                <p className="alpine-rr-empty">Configurez vos zones FC pour évaluer la polarisation.</p>
              )}
            </div>
          </div>

          <p className="alpine-pi-card-note">{polarizationIndex.note}</p>
          <p className="alpine-pi-card-source">
            Source : Treff G, Winkert K, Sareban M, Steinacker JM, Sperlich B (2019).
            <i> Front Physiol</i> 10:707.
          </p>
        </article>
      </div>
    </div>
  );
}

export default memo(AnalyticsIntensitiesTab);
