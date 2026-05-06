import { memo } from "react";
import {
  buildActivityEnrichmentModel,
  formatRecoveryTime,
} from "../utils/activityEnrichment.js";

function formatValue(value, unit, decimals = 0) {
  if (value == null || value === 0) return "-";
  return `${Number(value).toFixed(decimals)} ${unit}`;
}

function formatScore(value) {
  if (value == null || value === 0) return "-";
  return `${Math.round(value)} / 100`;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "-";
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

const noop = () => {};

function resolveActivityEnrichmentModel(activityEnrichment) {
  if (!activityEnrichment) {
    return null;
  }

  if (activityEnrichment.normalized) {
    return buildActivityEnrichmentModel(activityEnrichment.normalized);
  }

  if (
    activityEnrichment.aerobicTrainingEffect?.classification
      || activityEnrichment.anaerobicTrainingEffect?.classification
      || activityEnrichment.performanceCondition?.classification
  ) {
    return activityEnrichment;
  }

  return buildActivityEnrichmentModel(activityEnrichment);
}

function EnrichmentAction({ onEnrichActivity = noop, isEnrichingActivity = false }) {
  return (
    <div className="garmin-enrichment-action">
      <div>
        <h3 className="subcard-title">Metriques Garmin de seance</h3>
        <p className="muted">
          Recupere uniquement la sortie Garmin proche de cette activite Strava. Aucun backfill massif n'est lance.
        </p>
      </div>
      <button
        type="button"
        className="button button-secondary"
        onClick={onEnrichActivity}
        disabled={isEnrichingActivity}
      >
        {isEnrichingActivity ? "Recherche Garmin..." : "Completer cette seance"}
      </button>
    </div>
  );
}

function EmptyState({ onEnrichActivity = noop, isEnrichingActivity = false }) {
  return (
    <section className="garmin-enrichment-panel garmin-enrichment-panel--empty">
      <p className="muted">
        Aucune donnee Garmin disponible pour cette date. Lance un sync recent depuis les Reglages pour mettre a jour les derniers jours.
      </p>
      <EnrichmentAction
        onEnrichActivity={onEnrichActivity}
        isEnrichingActivity={isEnrichingActivity}
      />
    </section>
  );
}

function GarminEnrichmentPanel({
  snapshot = null,
  activityEnrichment = null,
  onEnrichActivity = noop,
  isEnrichingActivity = false,
}) {
  const activityEnrichmentModel = resolveActivityEnrichmentModel(activityEnrichment);

  if (!snapshot && !activityEnrichmentModel) {
    return (
      <EmptyState
        onEnrichActivity={onEnrichActivity}
        isEnrichingActivity={isEnrichingActivity}
      />
    );
  }

  if (!snapshot) {
    return (
      <section className="garmin-enrichment-panel">
        <ActivityEnrichmentBlock
          enrichment={activityEnrichmentModel}
          onEnrichActivity={onEnrichActivity}
          isEnrichingActivity={isEnrichingActivity}
        />
      </section>
    );
  }

  return (
    <section className="garmin-enrichment-panel">
      <div className="garmin-enrichment-group">
        <h3 className="subcard-title">Sommeil</h3>
        <Row label="Score sommeil" value={formatScore(snapshot.sleepScore)} />
        <Row label="Duree" value={formatDuration(snapshot.sleepDurationSeconds)} />
      </div>

      <div className="garmin-enrichment-group">
        <h3 className="subcard-title">Cardio</h3>
        <Row
          label="VFC moy."
          value={formatValue(snapshot.hrvAvgMs, "ms")}
          hint={snapshot.hrvStatus ? snapshot.hrvStatus.toLowerCase().replace(/_/g, " ") : null}
          toneClass={statusToneClass(snapshot.hrvStatus)}
        />
        <Row label="FC repos" value={formatValue(snapshot.restingHr, "bpm")} />
      </div>

      <div className="garmin-enrichment-group">
        <h3 className="subcard-title">Energie</h3>
        <Row
          label="Energie (matin)"
          value={formatValue(snapshot.bodyBatteryMorning, "%")}
          toneClass={snapshot.bodyBatteryMorning != null && snapshot.bodyBatteryMorning < 30 ? "tone-warning" : ""}
        />
        <Row label="Energie (soir)" value={formatValue(snapshot.bodyBatteryEnd, "%")} />
        <Row
          label="Stress moyen"
          value={formatValue(snapshot.stressAvg, "/ 100")}
          toneClass={snapshot.stressAvg != null && snapshot.stressAvg > 60 ? "tone-warning" : ""}
        />
      </div>

      {snapshot.trainingReadinessScore != null || snapshot.trainingReadinessStatus ? (
        <div className="garmin-enrichment-group">
          <h3 className="subcard-title">Aptitude a l'entrainement</h3>
          <Row
            label="Aptitude (Garmin)"
            value={formatScore(snapshot.trainingReadinessScore)}
            hint={snapshot.trainingReadinessStatus ? snapshot.trainingReadinessStatus.toLowerCase().replace(/_/g, " ") : null}
            toneClass={statusToneClass(snapshot.trainingReadinessStatus)}
          />
        </div>
      ) : null}

      <ActivityEnrichmentBlock
        enrichment={activityEnrichmentModel}
        onEnrichActivity={onEnrichActivity}
        isEnrichingActivity={isEnrichingActivity}
      />
    </section>
  );
}

function ActivityEnrichmentBlock({
  enrichment,
  onEnrichActivity = noop,
  isEnrichingActivity = false,
}) {
  if (!enrichment) {
    return (
      <div className="garmin-enrichment-group garmin-enrichment-activity-group">
        <EnrichmentAction
          onEnrichActivity={onEnrichActivity}
          isEnrichingActivity={isEnrichingActivity}
        />
      </div>
    );
  }

  const {
    aerobicTrainingEffect,
    anaerobicTrainingEffect,
    vo2max,
    performanceCondition,
    recoveryHeartRate,
    recoveryTime,
    epoc,
  } = enrichment;
  const hasAny = aerobicTrainingEffect?.value
    || anaerobicTrainingEffect?.value
    || vo2max
    || performanceCondition?.value != null
    || recoveryHeartRate
    || recoveryTime
    || epoc;

  if (!hasAny) {
    return (
      <div className="garmin-enrichment-group garmin-enrichment-activity-group">
        <EnrichmentAction
          onEnrichActivity={onEnrichActivity}
          isEnrichingActivity={isEnrichingActivity}
        />
      </div>
    );
  }

  return (
    <div className="garmin-enrichment-group garmin-enrichment-activity-group">
      <h3 className="subcard-title">Metriques Garmin de seance</h3>

      {aerobicTrainingEffect?.classification ? (
        <Row
          label="Effet aerobie"
          value={`${aerobicTrainingEffect.value.toFixed(1)} / 5`}
          hint={aerobicTrainingEffect.classification.label}
          toneClass={`tone-${aerobicTrainingEffect.classification.tone}`}
        />
      ) : null}

      {anaerobicTrainingEffect?.classification && anaerobicTrainingEffect.value > 0 ? (
        <Row
          label="Effet anaerobie"
          value={`${anaerobicTrainingEffect.value.toFixed(1)} / 5`}
          hint={anaerobicTrainingEffect.classification.label}
          toneClass={`tone-${anaerobicTrainingEffect.classification.tone}`}
        />
      ) : null}

      {vo2max ? <Row label="VO2max seance" value={`${vo2max.toFixed(1)} mL/kg/min`} /> : null}

      {performanceCondition?.classification ? (
        <Row
          label="Forme du jour"
          value={performanceCondition.classification.valueLabel}
          hint={performanceCondition.classification.label}
          toneClass={`tone-${performanceCondition.classification.tone}`}
        />
      ) : null}

      {recoveryHeartRate ? <Row label="FC a la recup (-1 min)" value={`-${recoveryHeartRate} bpm`} /> : null}

      {recoveryTime ? <Row label="Temps de recuperation" value={formatRecoveryTime(recoveryTime) || "-"} /> : null}

      {epoc ? (
        <Row
          label="EPOC"
          value={`${Math.round(epoc)} ml/kg`}
          hint="Dette physiologique estimee par Garmin"
        />
      ) : null}
    </div>
  );
}

export default memo(GarminEnrichmentPanel);
