import { memo } from "react";
import GlossaryLink from "./GlossaryLink.jsx";
import { classifyEpoc, extractEpocFromGarminPayload } from "../utils/epocLevel.js";

/**
 * ActivityIntensityCard — Phase H4.
 *
 * Regroupe les indicateurs d'intensité d'une activité :
 *  - Allure ajustée (GAP Minetti) déjà calculée par activityInsights
 *  - Dette d'oxygène (EPOC vulgarisé qualitatif)
 *
 * La dérive cardiaque (Pa:Hr) est volontairement affichée uniquement dans
 * IntraSessionInsightsCard, qui utilise un calcul plus rigoureux
 * (buildAerobicDecouplingProfile : gate EF < 82 % FCmax, ≥ 60 min, moitiés
 * par durée cumulée), pour éviter deux valeurs divergentes sur la même fiche.
 *
 * Affiche uniquement les indicateurs disponibles, vulgarisés.
 */

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatPaceMinKm(secondsPerKm) {
  if (!secondsPerKm || secondsPerKm <= 0) return "—";
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

function ActivityIntensityCard({ activity = null, detailedPayload = null, garminSnapshot = null }) {
  if (!activity) return null;

  // --- GAP (déjà précalculé dans activityInsights) ---
  const observedPace = toNumber(activity.__paceSecondsPerKm);
  const adjustedPace = toNumber(activity.__gradeAdjustedPaceSecondsPerKm);
  const hasGap = observedPace != null && adjustedPace != null
    && observedPace > 0 && adjustedPace > 0
    && Math.abs(observedPace - adjustedPace) >= 1;

  // --- EPOC ---
  const epocRaw = extractEpocFromGarminPayload(garminSnapshot)
    || extractEpocFromGarminPayload(detailedPayload);
  const epoc = classifyEpoc(epocRaw);

  // Si aucun indicateur n'est disponible, on n'affiche pas la carte
  if (!hasGap && !epoc.hasData) {
    return null;
  }

  return (
    <section className="card activity-intensity-card">
      <div className="card-header">
        <div className="card-title-block">
          <h2 className="card-title">Intensité de la séance</h2>
          <p className="card-subtitle">
            Indicateurs vulgarisés — voir glossaire pour le détail.
          </p>
        </div>
      </div>

      <div className="activity-intensity-rows">
        {/* Allure ajustée vs allure brute */}
        {hasGap ? (
          <div className="activity-intensity-row">
            <div className="activity-intensity-row-label">
              <span>Allure ajustée</span>
              <GlossaryLink termKey="gap">?</GlossaryLink>
            </div>
            <div className="activity-intensity-row-content">
              <strong className="activity-intensity-value">{formatPaceMinKm(adjustedPace)}</strong>
              <span className="activity-intensity-context">
                Allure brute : {formatPaceMinKm(observedPace)}
              </span>
              {adjustedPace < observedPace ? (
                <span className="activity-intensity-hint">
                  Équivalent terrain plat plus rapide — la sortie était vallonnée.
                </span>
              ) : adjustedPace > observedPace ? (
                <span className="activity-intensity-hint">
                  Équivalent terrain plat plus lent — descente prédominante.
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Dette d'oxygène (EPOC vulgarisé) */}
        {epoc.hasData ? (
          <div className="activity-intensity-row">
            <div className="activity-intensity-row-label">
              <span>Dette d'oxygène</span>
              <GlossaryLink termKey="epoc">?</GlossaryLink>
            </div>
            <div className="activity-intensity-row-content">
              <strong className={`activity-intensity-value tone-${epoc.tone}`}>{epoc.level}</strong>
              <span className="activity-intensity-context">{epoc.recoveryHoursLabel}</span>
              <span className="activity-intensity-hint">{epoc.description}</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default memo(ActivityIntensityCard);
