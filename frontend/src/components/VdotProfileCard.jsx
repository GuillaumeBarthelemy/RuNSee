import { memo } from "react";
import AnalysisConfidenceBadge from "./AnalysisConfidenceBadge.jsx";
import InfoTooltip from "./InfoTooltip.jsx";
import { formatPace } from "../utils/activityInsights.js";

function formatVdotValue(vdot = 0) {
  if (!Number.isFinite(Number(vdot)) || Number(vdot) <= 0) {
    return "-";
  }

  return Number(vdot).toFixed(1).replace(".", ",");
}

function formatRaceTime(seconds = 0) {
  const safeSeconds = Math.round(Number(seconds) || 0);

  if (safeSeconds <= 0) {
    return "-";
  }

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getPaceTone(entry = {}) {
  return String(entry?.key || "").toLowerCase();
}

function formatPaceRange(entry = {}) {
  const faster = entry?.paceRangeSecondsPerKm?.faster;
  const slower = entry?.paceRangeSecondsPerKm?.slower;

  if (faster > 0 && slower > 0) {
    return `${formatPace(faster)} - ${formatPace(slower)}`;
  }

  return entry?.paceSecondsPerKm > 0 ? formatPace(entry.paceSecondsPerKm) : "-";
}

function PaceRow({ entry }) {
  const tone = getPaceTone(entry);

  return (
    <div className={`vdot-pace-row vdot-pace-row-${tone}`}>
      <div className="vdot-pace-row-head">
        <div className="vdot-pace-title">
          <span className="vdot-pace-dot" aria-hidden="true" />
          <div>
            <strong>{entry.label}</strong>
            <span className="small-text">{entry.fullLabel}</span>
          </div>
        </div>
        <span className="status-pill status-idle">{entry.range}</span>
      </div>
      <div className="vdot-pace-row-body">
        <span className="vdot-pace-value">{formatPaceRange(entry)}<span className="small-text"> /km</span></span>
        <span className="small-text">{entry.description}</span>
      </div>
    </div>
  );
}

function RacePredictionRow({ entry }) {
  const recordLabel = entry?.recordSeconds > 0 ? formatRaceTime(entry.recordSeconds) : "-";
  const estimateLabel = formatRaceTime(entry?.predictedSeconds);
  const paceLabel = entry?.predictedPaceSecondsPerKm > 0 ? formatPace(entry.predictedPaceSecondsPerKm) : "-";
  const confidenceTone = entry?.confidence?.tone || "neutral";
  const terrainNote = entry?.isTerrainLimited ? "Terrain non strictement route" : "";

  return (
    <div className="vdot-race-row">
      <div>
        <span className="field-label">{entry.label}</span>
        {terrainNote ? <span className="small-text">{terrainNote}</span> : null}
      </div>
      <div>
        <span className="small-text">Record connu</span>
        <strong>{recordLabel}</strong>
      </div>
      <div>
        <span className="small-text">Potentiel estime</span>
        <strong>{estimateLabel}</strong>
      </div>
      <div>
        <span className="small-text">Allure</span>
        <strong>{paceLabel}<span className="small-text"> /km</span></strong>
      </div>
      <span className={`vdot-confidence-pill vdot-confidence-${confidenceTone}`}>
        {entry?.confidence?.label || "Prudente"}
      </span>
    </div>
  );
}

function VdotProfileCard({ profile = {}, info = [], confidence = null }) {
  const safeProfile = profile || {};
  const hasData = Boolean(safeProfile.hasData);
  const vo2maxLabel = formatVdotValue(safeProfile.vo2maxEstimate ?? safeProfile.vdot);
  const levelLabel = safeProfile.level?.label || "-";
  const tone = safeProfile.level?.tone || "neutral";
  const profileConfidence = safeProfile.confidence || {};

  const paces = Array.isArray(safeProfile.roadPaces) ? safeProfile.roadPaces : [];
  const raceRows = Array.isArray(safeProfile.raceRows) ? safeProfile.raceRows : [];

  return (
    <section className="card vdot-profile-card">
      <div className="card-header-row wrap-on-mobile align-center">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">Potentiel route</h2>
            <InfoTooltip title="Potentiel route" content={info} label="Afficher l'aide pour le potentiel route" />
          </div>
          <p className="card-subtitle">
            Estimation de ton VO2max performance, de tes temps route et de tes allures EF / S1 / S2 a partir des records fiables.
          </p>
          {safeProfile.message ? <p className="small-text">{safeProfile.message}</p> : null}
        </div>
        <div className="vdot-summary-row">
          <AnalysisConfidenceBadge confidence={confidence} compact />
          <div className={`vdot-summary vdot-summary-${tone}`.trim()}>
            <span className="vdot-summary-label">VO2max perf.</span>
            <strong className="vdot-summary-value">{vo2maxLabel}</strong>
            <span className="small-text">VO2max equivalent</span>
          </div>
          <div className={`vdot-summary vdot-summary-${profileConfidence.tone || "neutral"}`.trim()}>
            <span className="vdot-summary-label">Fiabilite VO2max</span>
            <strong className="vdot-summary-value">{profileConfidence.label || "-"}</strong>
            <span className="small-text">{levelLabel}</span>
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="vdot-profile-body">
          <div className="vdot-panel vdot-profile-summary-panel">
            <div className="vdot-panel-head">
              <h3 className="subcard-title">Lecture consolidee</h3>
              <p className="small-text">{safeProfile.profileSummary}</p>
            </div>
          </div>

          <div className="vdot-panel vdot-race-panel">
            <div className="vdot-panel-head">
              <h3 className="subcard-title">Temps route</h3>
              <p className="small-text">Record observe, potentiel estime et confiance par distance. Le potentiel combine records reels, extrapolation endurance et modele Daniels.</p>
            </div>
            <div className="vdot-race-table">
              {raceRows.map((entry) => (
                <RacePredictionRow key={entry.key} entry={entry} />
              ))}
            </div>
          </div>

          <div className="vdot-panel">
            <div className="vdot-panel-head">
              <h3 className="subcard-title">Allures route utiles</h3>
              <p className="small-text">Plages d'entrainement derivees du meme VO2max : elles servent a calibrer les seances, pas a predire directement une course.</p>
            </div>
            <div className="vdot-pace-grid">
              {paces.map((entry) => (
                <PaceRow key={entry.key} entry={entry} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          Tu n'as pas encore de record route exploitable. Importe ou enrichis une sortie 5 km, 10 km, semi ou marathon pour activer cette carte.
        </div>
      )}

      {safeProfile.source ? (
        <p className="small-text top-gap-sm">
          Source principale : {safeProfile.source.recordLabel}
          {safeProfile.source.elapsedSeconds ? ` (${formatPace(safeProfile.source.paceSecondsPerKm)} /km)` : ""}
          {Number.isFinite(safeProfile.source.ageDays) ? `, il y a ${safeProfile.source.ageDays} jours` : ""}
          .
        </p>
      ) : null}
    </section>
  );
}

export default memo(VdotProfileCard);
