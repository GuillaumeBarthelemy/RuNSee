import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { buildTodayVolumeSummary } from "../utils/todayVolumeSummary.js";
import InfoTooltip from "./InfoTooltip.jsx";

function formatDecimal(value, decimals = 1) {
  return Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatRecoverySnapshot(snapshot = {}) {
  if (!snapshot || !Object.keys(snapshot).length) {
    return {
      label: "Données partielles",
      detail: "Aucun signal Garmin récent exploitable.",
      tone: "neutral",
    };
  }

  const sleepScore = Number(snapshot.sleepScore || 0);
  const hrvStatus = String(snapshot.hrvStatus || "").trim().toUpperCase();
  const restingHr = Number(snapshot.restingHr || 0);
  const details = [];

  if (hrvStatus) {
    details.push(`VFC ${hrvStatus.toLowerCase()}`);
  }

  if (sleepScore > 0) {
    details.push(`sommeil ${Math.round(sleepScore)}`);
  }

  if (restingHr > 0) {
    details.push(`FC repos ${Math.round(restingHr)}`);
  }

  if (hrvStatus === "LOW" || hrvStatus === "POOR" || sleepScore < 55) {
    return {
      label: "Fragile",
      detail: details.join(" · ") || "Signal de récupération à surveiller.",
      tone: "warning",
    };
  }

  if (hrvStatus === "BALANCED" || sleepScore >= 70) {
    return {
      label: "Correcte",
      detail: details.join(" · ") || "Signaux de récupération cohérents.",
      tone: "positive",
    };
  }

  return {
    label: "À confirmer",
    detail: details.join(" · ") || "Signaux disponibles mais incomplets.",
    tone: "neutral",
  };
}

function buildTrailLine(trailContext = null, volumeModel = {}) {
  if (trailContext?.shouldShow) {
    const elevationGain = Number(trailContext.elevationGain7d || 0);
    const elevationLoss = Number(trailContext.elevationLoss7d || 0);
    const detail = [
      elevationGain > 0 ? `${Math.round(elevationGain).toLocaleString("fr-FR")} m D+` : "",
      elevationLoss > 0 ? `${Math.round(elevationLoss).toLocaleString("fr-FR")} m D-` : "",
    ].filter(Boolean).join(" · ");

    return {
      label: trailContext.label || "Contexte actif",
      detail: trailContext.vigilance || trailContext.context || detail || "Signal trail récent intégré.",
      tone: trailContext.tone === "danger" ? "negative" : trailContext.tone === "warning" ? "warning" : "neutral",
    };
  }

  const elevationGain = Number(volumeModel.current?.elevationGain || 0);

  return {
    label: elevationGain > 0 ? "Faible" : "Aucun signal",
    detail: elevationGain > 0
      ? `${Math.round(elevationGain).toLocaleString("fr-FR")} m D+ sur 7 jours.`
      : "Pas de vigilance trail majeure.",
    tone: "neutral",
  };
}

function SummaryTile({ label = "", value = "", detail = "", tone = "neutral" }) {
  return (
    <article className={`today-summary-tile today-summary-tile-${tone}`.trim()}>
      <span className="today-summary-label">{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function TodaySevenDaySummary({
  weeklySummary = {},
  decisionModel = {},
  recoverySnapshots = [],
  trailContext = null,
}) {
  const volumeModel = useMemo(() => buildTodayVolumeSummary(weeklySummary), [weeklySummary]);
  const latestRecovery = Array.isArray(recoverySnapshots) && recoverySnapshots.length
    ? recoverySnapshots[recoverySnapshots.length - 1]
    : null;
  const recovery = formatRecoverySnapshot(latestRecovery);
  const trail = buildTrailLine(trailContext, volumeModel);
  const distance = `${formatDecimal(volumeModel.current.distanceKm)} km`;
  const volumeDetail = [
    `${Math.round(volumeModel.current.elevationGain || 0).toLocaleString("fr-FR")} m D+`,
    `${Math.round(volumeModel.current.count || 0).toLocaleString("fr-FR")} séance${volumeModel.current.count > 1 ? "s" : ""}`,
  ].join(" · ");

  return (
    <section className="card today-seven-day-card">
      <div className="card-header-row align-center wrap-on-mobile">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">Synthèse 7 jours</h2>
            <InfoTooltip
              title="Synthèse 7 jours"
              content={[
                {
                  title: "En bref",
                  body: "Lecture compacte des signaux utiles au pilotage du jour : récupération, charge, volume et contexte trail.",
                },
                {
                  title: "Lecture",
                  body: "Les détails complets restent dans Analyses pour éviter de transformer Aujourd'hui en tableau de bord analytique.",
                },
              ]}
              label="Afficher l'aide pour Synthèse 7 jours"
              compact
            />
          </div>
          <p className="card-subtitle">Les repères qui expliquent la recommandation, sans graphique lourd.</p>
        </div>
        <Link className="button button-outline" to="/analytics">
          Voir l'analyse complète
        </Link>
      </div>

      <div className="today-summary-grid">
        <SummaryTile
          label="Récupération"
          value={recovery.label}
          detail={recovery.detail}
          tone={recovery.tone}
        />
        <SummaryTile
          label="Charge"
          value={decisionModel.charge?.label || "À lire"}
          detail={decisionModel.charge?.detail || "Pas assez d'historique consolidé."}
          tone={decisionModel.charge?.tone || "neutral"}
        />
        <SummaryTile
          label="Volume"
          value={distance}
          detail={volumeDetail}
          tone={volumeModel.hasData ? volumeModel.tones.distanceKm : "neutral"}
        />
        <SummaryTile
          label="Trail"
          value={trail.label}
          detail={trail.detail}
          tone={trail.tone}
        />
      </div>
    </section>
  );
}

export default memo(TodaySevenDaySummary);
