import { memo } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatValue(value, unit, decimals = 0) {
  if (value == null || value === 0) return "—";
  return `${Number(value).toFixed(decimals)} ${unit}`;
}

function formatScore(value) {
  if (value == null || value === 0) return "—";
  return `${Math.round(value)} / 100`;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

function statusToneClass(status) {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s.includes("good") || s.includes("high") || s.includes("excellent")) return "tone-good";
  if (s.includes("low") || s.includes("poor") || s.includes("fair")) return "tone-warning";
  return "";
}

function Row({ label, value, hint = null, toneClass = "" }) {
  return (
    <div className={`garmin-enrichment-row ${toneClass}`}>
      <span className="garmin-enrichment-label">{label}</span>
      <span className={`garmin-enrichment-value ${toneClass}`}>{value}</span>
      {hint ? <span className="garmin-enrichment-hint">{hint}</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * GarminEnrichmentPanel
 *
 * Props:
 *   snapshot — ExternalDailyRecoverySnapshot for the activity's date (or null)
 *   activityEnrichment — modèle Phase K (Option B) avec métriques par activité
 *     (Training Effect, VO2max séance, Performance Condition...). Optionnel.
 */
function GarminEnrichmentPanel({ snapshot = null, activityEnrichment = null }) {
  if (!snapshot && !activityEnrichment) {
    return (
      <section className="garmin-enrichment-panel garmin-enrichment-panel--empty">
        <p className="muted">
          Aucune donnée Garmin disponible pour cette date. Lance un sync récent depuis la page
          Réglages pour mettre à jour les 4 derniers jours.
        </p>
      </section>
    );
  }

  if (!snapshot) {
    return (
      <section className="garmin-enrichment-panel">
        <ActivityEnrichmentBlock enrichment={activityEnrichment} />
      </section>
    );
  }

  return (
    <section className="garmin-enrichment-panel">
      <div className="garmin-enrichment-group">
        <h3 className="subcard-title">Sommeil</h3>
        <Row
          label="Score sommeil"
          value={formatScore(snapshot.sleepScore)}
        />
        <Row
          label="Durée"
          value={formatDuration(snapshot.sleepDurationSeconds)}
        />
      </div>

      <div className="garmin-enrichment-group">
        <h3 className="subcard-title">Cardio</h3>
        <Row
          label="VFC moy."
          value={formatValue(snapshot.hrvAvgMs, "ms")}
          hint={snapshot.hrvStatus ? snapshot.hrvStatus.toLowerCase().replace(/_/g, " ") : null}
          toneClass={statusToneClass(snapshot.hrvStatus)}
        />
        <Row
          label="FC repos"
          value={formatValue(snapshot.restingHr, "bpm")}
        />
      </div>

      <div className="garmin-enrichment-group">
        <h3 className="subcard-title">Énergie</h3>
        <Row
          label="Énergie (matin)"
          value={formatValue(snapshot.bodyBatteryMorning, "%")}
          toneClass={
            snapshot.bodyBatteryMorning != null && snapshot.bodyBatteryMorning < 30
              ? "tone-warning"
              : ""
          }
        />
        <Row
          label="Énergie (soir)"
          value={formatValue(snapshot.bodyBatteryEnd, "%")}
        />
        <Row
          label="Stress moyen"
          value={formatValue(snapshot.stressAvg, "/ 100")}
          toneClass={
            snapshot.stressAvg != null && snapshot.stressAvg > 60 ? "tone-warning" : ""
          }
        />
      </div>

      {(snapshot.trainingReadinessScore != null || snapshot.trainingReadinessStatus) ? (
        <div className="garmin-enrichment-group">
          <h3 className="subcard-title">Aptitude à l'entraînement</h3>
          <Row
            label="Aptitude (Garmin)"
            value={formatScore(snapshot.trainingReadinessScore)}
            hint={
              snapshot.trainingReadinessStatus
                ? snapshot.trainingReadinessStatus.toLowerCase().replace(/_/g, " ")
                : null
            }
            toneClass={statusToneClass(snapshot.trainingReadinessStatus)}
          />
        </div>
      ) : null}

      <ActivityEnrichmentBlock enrichment={activityEnrichment} />
    </section>
  );
}

/**
 * Bloc affichant les métriques Garmin par activité (Phase K — Option B).
 * Affiche uniquement les métriques disponibles.
 */
function ActivityEnrichmentBlock({ enrichment }) {
  if (!enrichment) return null;

  const { aerobicTrainingEffect, anaerobicTrainingEffect, vo2max, performanceCondition, recoveryHeartRate, epoc } = enrichment;

  // Si aucune métrique exploitable, ne pas afficher le bloc
  const hasAny = aerobicTrainingEffect?.value
    || anaerobicTrainingEffect?.value
    || vo2max
    || performanceCondition?.value != null
    || recoveryHeartRate
    || epoc;
  if (!hasAny) return null;

  return (
    <div className="garmin-enrichment-group garmin-enrichment-activity-group">
      <h3 className="subcard-title">Métriques de la séance</h3>

      {aerobicTrainingEffect?.classification ? (
        <Row
          label="Effet aérobie"
          value={`${aerobicTrainingEffect.value.toFixed(1)} / 5`}
          hint={aerobicTrainingEffect.classification.label}
          toneClass={`tone-${aerobicTrainingEffect.classification.tone}`}
        />
      ) : null}

      {anaerobicTrainingEffect?.classification && anaerobicTrainingEffect.value > 0 ? (
        <Row
          label="Effet anaérobie"
          value={`${anaerobicTrainingEffect.value.toFixed(1)} / 5`}
          hint={anaerobicTrainingEffect.classification.label}
          toneClass={`tone-${anaerobicTrainingEffect.classification.tone}`}
        />
      ) : null}

      {vo2max ? (
        <Row
          label="VO2max séance"
          value={`${vo2max.toFixed(1)} mL/kg/min`}
        />
      ) : null}

      {performanceCondition?.classification ? (
        <Row
          label="Forme du jour"
          value={performanceCondition.classification.valueLabel}
          hint={performanceCondition.classification.label}
          toneClass={`tone-${performanceCondition.classification.tone}`}
        />
      ) : null}

      {recoveryHeartRate ? (
        <Row
          label="FC à la récup (-1 min)"
          value={`-${recoveryHeartRate} bpm`}
        />
      ) : null}
    </div>
  );
}

export default memo(GarminEnrichmentPanel);
