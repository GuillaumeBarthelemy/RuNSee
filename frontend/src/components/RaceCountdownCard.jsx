import { memo } from "react";
import AnalysisConfidenceBadge from "./AnalysisConfidenceBadge.jsx";
import InfoTooltip from "./InfoTooltip.jsx";

function formatDate(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", { dateStyle: "long" });
}

function formatRaceTime(seconds) {
  const safe = Math.round(Number(seconds) || 0);
  if (safe <= 0) return "-";
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remaining = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function formatPace(secondsPerKm) {
  const safe = Math.round(Number(secondsPerKm) || 0);
  if (safe <= 0) return "-";
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function formatDistance(meters) {
  const safe = Number(meters) || 0;
  if (safe >= 1000) {
    return `${(safe / 1000).toFixed(safe % 1000 === 0 ? 0 : 1)} km`;
  }
  return `${safe} m`;
}

const INFO_BLOCKS = [
  { label: "En bref", text: "Suivi de ta course objectif active : countdown, chrono predit, allure cible et plan de taper recommande." },
  { label: "Calcul", text: "Le chrono predit combine la formule de Riegel sur ton record le plus proche en distance et la prediction Daniels VO2max, ponderees selon la specificite. Le plan de taper s'inspire de Mujika (2010) : reduction progressive du volume sur 7 a 21 jours selon la distance, avec maintien de l'intensite jusqu'a J-7." },
  { label: "Comment lire ta valeur", text: "Phase 'preparation' = construction. Phase 'taper en cours' = affutage actif. La courbe TSB doit remonter pour atteindre la fenetre fraicheur (+10 a +25) le jour J." },
  { label: "Action concrete", text: "Pendant le taper, conserve l'intensite des seances qualite mais reduis la duree (-25 a -50 %). Coupe les sorties longues a J-10 pour le marathon, J-7 pour le semi." },
  { label: "Pour aller plus loin", text: "Mujika I (2010), Intense training: the key to optimal performance before and during the taper. Bosquet et al. (2007), Effects of tapering on performance: a meta-analysis." },
];

function RaceCountdownCard({ profile = {}, confidence = null }) {
  if (!profile?.hasRace) {
    return (
      <section className="card race-countdown-card race-countdown-empty">
        <div className="card-header-row wrap-on-mobile">
          <div>
            <div className="title-with-info">
              <h2 className="card-title">Course objectif</h2>
              <InfoTooltip title="Course objectif" content={INFO_BLOCKS} label="Afficher l'aide pour la course objectif" />
            </div>
            <p className="card-subtitle">{profile?.message || "Aucune course active."}</p>
          </div>
        </div>
      </section>
    );
  }

  const { race, daysToRace, phase, prediction, recommendedTargetPaceSecondsPerKm, userTargetSeconds, taper } = profile;

  return (
    <section className={`card race-countdown-card race-countdown-${phase?.tone || "neutral"}`}>
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">Course objectif : {race.name}</h2>
            <InfoTooltip title="Course objectif" content={INFO_BLOCKS} label="Afficher l'aide pour la course objectif" />
          </div>
          <p className="card-subtitle">
            {formatDate(race.raceDate)} - {formatDistance(race.distanceMeters)}.
            {race.notes ? ` ${race.notes}` : ""}
          </p>
        </div>
        <div className="race-countdown-header-actions">
          <AnalysisConfidenceBadge confidence={confidence} compact />
          <div className="race-countdown-summary">
            <span className="race-countdown-summary-label">{phase?.label || "Phase"}</span>
            <strong className="race-countdown-summary-value">
              {daysToRace > 0 ? `J-${daysToRace}` : daysToRace === 0 ? "Jour J" : `J+${Math.abs(daysToRace)}`}
            </strong>
          </div>
        </div>
      </div>

      <div className="race-countdown-grid">
        <section className="race-countdown-block">
          <span className="field-label">Chrono predit</span>
          <strong className="race-countdown-value">{formatRaceTime(prediction?.predictedSeconds)}</strong>
          <span className="small-text">
            Riegel : {formatRaceTime(prediction?.riegelSeconds)}. Daniels (VO2max {prediction?.averageVdot}) : {formatRaceTime(prediction?.danielsSeconds)}.
          </span>
        </section>

        <section className="race-countdown-block">
          <span className="field-label">Allure recommandee</span>
          <strong className="race-countdown-value">
            {formatPace(recommendedTargetPaceSecondsPerKm)}<span className="small-text"> /km</span>
          </strong>
          {race.targetPaceSecondsPerKm ? (
            <span className="small-text">
              Ta cible : {formatPace(race.targetPaceSecondsPerKm)} /km
              {userTargetSeconds > 0 ? ` (${formatRaceTime(userTargetSeconds)})` : ""}.
            </span>
          ) : (
            <span className="small-text">Indique ton allure cible dans Administration pour personnaliser le rappel.</span>
          )}
        </section>

        <section className="race-countdown-block">
          <span className="field-label">TSB cible J-J</span>
          <strong className="race-countdown-value">+{taper?.tsbTarget ?? "-"}</strong>
          <span className="small-text">
            TSB final estime apres taper : {taper?.expectedFinalTsb !== null && taper?.expectedFinalTsb !== undefined
              ? taper.expectedFinalTsb.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
              : "-"}
          </span>
        </section>
      </div>

      {Array.isArray(taper?.planDays) && taper.planDays.length ? (
        <section className="top-gap-sm">
          <h3 className="subcard-title">Plan de taper recommande ({taper.taperWindow} jours)</h3>
          <table className="table compact-table">
            <thead>
              <tr>
                <th>J-</th>
                <th>Charge cible (pts/jour)</th>
                <th>CTL projete</th>
                <th>ATL projete</th>
                <th>TSB projete</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {taper.planDays.map((day) => (
                <tr key={day.daysBefore}>
                  <td>J-{day.daysBefore}</td>
                  <td>{day.dailyLoad}</td>
                  <td>{day.projectedCtl}</td>
                  <td>{day.projectedAtl}</td>
                  <td>{day.projectedTsb}</td>
                  <td className="small-text">{day.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small-text top-gap-sm">
            Plan indicatif : il privilegie une reduction progressive du volume tout en preservant l'intensite jusqu'a J-7.
            Adapte la charge selon ton ressenti et ton kilometrage habituel.
          </p>
        </section>
      ) : null}
    </section>
  );
}

export default memo(RaceCountdownCard);
