import { memo, useMemo } from "react";
import AnalysisConfidenceBadge from "./AnalysisConfidenceBadge.jsx";
import { buildActivityTrailConfidence } from "../utils/analysisConfidence.js";
import { buildTrailProfile } from "../utils/trailProfile.js";

function formatDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  if (!safe) return "-";
  const hours = Math.floor(safe / 3600);
  const minutes = Math.round((safe % 3600) / 60);
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, "0")}`;
  return `${minutes} min`;
}

function formatMeters(value) {
  return `${Math.round(Number(value) || 0).toLocaleString("fr-FR")} m`;
}

function Metric({ label, value, detail = "" }) {
  return (
    <div className="trail-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function ActivityTrailCard({ activity = null }) {
  const profile = useMemo(() => buildTrailProfile(activity || {}), [activity]);
  const confidence = useMemo(
    () => buildActivityTrailConfidence({ activity: activity || {}, trailProfile: profile }),
    [activity, profile],
  );

  if (!profile.hasData) {
    return (
      <section className="subcard trail-card">
        <div className="card-header-row wrap-on-mobile align-center">
          <h3 className="subcard-title">Lecture trail</h3>
          <AnalysisConfidenceBadge confidence={confidence} compact />
        </div>
        <p className="muted">{profile.dataQuality?.label || "Donnees altitude insuffisantes."}</p>
      </section>
    );
  }

  if (!profile.hasTrailContext) {
    return (
      <section className="subcard trail-card">
        <div className="card-header-row wrap-on-mobile align-center">
          <h3 className="subcard-title">Lecture trail</h3>
          <AnalysisConfidenceBadge confidence={confidence} compact />
        </div>
        <p className="muted">Profil plutot route ou peu vallonne : aucune lecture trail detaillee n'est ajoutee.</p>
      </section>
    );
  }

  return (
    <section className="subcard trail-card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h3 className="subcard-title">Lecture trail</h3>
          <p className="muted">{profile.message}</p>
        </div>
        <div className="trail-card-actions">
          <AnalysisConfidenceBadge confidence={confidence} compact />
          <span className={`status-pill status-${profile.downhillLoad.tone === "danger" ? "danger" : "idle"}`.trim()}>
            Charge descente {profile.downhillLoad.label}
          </span>
        </div>
      </div>

      <div className="trail-metric-grid">
        <Metric label="Profil terrain" value={profile.terrain.label} detail={profile.dataQuality.label} />
        <Metric label="D+ / km" value={`${profile.elevationGainPerKm} m/km`} detail={`${formatMeters(profile.elevationGain)} D+ total`} />
        <Metric label="D- / km" value={`${profile.elevationLossPerKm} m/km`} detail={`${formatMeters(profile.elevationLoss)} D- total`} />
        <Metric label="Temps montee" value={formatDuration(profile.ascentTimeSeconds)} />
        <Metric label="Temps descente" value={formatDuration(profile.descentTimeSeconds)} />
        <Metric label="Plus longue montee" value={formatMeters(profile.longestClimbMeters)} />
        <Metric label="Plus longue descente" value={formatMeters(profile.longestDescentMeters)} />
        <Metric label="Charge montee" value={profile.uphillLoad.label} />
      </div>

      <p className="small-text trail-caution">
        Lecture prudente : une descente couteuse peut traduire de la technicite, de la fatigue ou un terrain peu roulant,
        pas une erreur de pilotage.
      </p>
    </section>
  );
}

export default memo(ActivityTrailCard);
