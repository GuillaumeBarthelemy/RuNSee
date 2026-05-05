import { memo } from "react";
import GlossaryLink from "./GlossaryLink.jsx";
import RangeBar from "./visuals/RangeBar.jsx";
import { calculateCardiacDecouplingFromPayload } from "../utils/cardiacDecoupling.js";
import { classifyEpoc, extractEpocFromGarminPayload } from "../utils/epocLevel.js";
import { decouplingTone } from "../utils/tonePicker.js";

/**
 * ActivityIntensityCard — Phase H4.
 *
 * Regroupe les 3 indicateurs Phase H sur une activité :
 *  - Allure ajustée (GAP Minetti) déjà calculée par activityInsights
 *  - Dérive cardiaque (Decoupling Pa:Hr)
 *  - Dette d'oxygène (EPOC vulgarisé qualitatif)
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

  // --- Decoupling cardiaque ---
  const decoupling = calculateCardiacDecouplingFromPayload(detailedPayload);

  // --- EPOC ---
  const epocRaw = extractEpocFromGarminPayload(garminSnapshot)
    || extractEpocFromGarminPayload(detailedPayload);
  const epoc = classifyEpoc(epocRaw);

  // Si aucun des 3 indicateurs n'est disponible, on n'affiche pas la carte
  if (!hasGap && !decoupling.hasData && !epoc.hasData) {
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

        {/* Dérive cardiaque */}
        {decoupling.hasData ? (
          <div className="activity-intensity-row">
            <div className="activity-intensity-row-label">
              <span>Dérive cardiaque</span>
              <GlossaryLink termKey="aerobicDecoupling">?</GlossaryLink>
            </div>
            <div className="activity-intensity-row-content">
              <RangeBar
                label=""
                value={decoupling.decouplingPercent}
                min={-3}
                max={12}
                unit="%"
                zones={[
                  { from: -3, to: 2, tone: 1, label: "Excellent" },
                  { from: 2, to: 5, tone: 2, label: "Bon" },
                  { from: 5, to: 8, tone: 4, label: "Vigilance" },
                  { from: 8, to: 12, tone: 5, label: "Alerte" },
                ]}
                tone={decouplingTone(decoupling.decouplingPercent)}
              />
              <span className="activity-intensity-hint">
                {decoupling.decouplingPercent < 2
                  ? "Endurance aérobie solide sur cette sortie."
                  : decoupling.decouplingPercent < 5
                  ? "Bonne stabilité allure/FC."
                  : decoupling.decouplingPercent < 8
                  ? "Légère dérive — sortie un peu trop longue ou intense."
                  : "Dérive marquée — bloc trop dense pour le moment."}
              </span>
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
