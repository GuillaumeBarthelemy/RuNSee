import { memo } from "react";
import { formatPace } from "../utils/activityInsights.js";
import InfoTooltip from "./InfoTooltip.jsx";

function formatNumber(value, decimals = 1) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }

  return Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatSigned(value, suffix = "") {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }

  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })}${suffix}`;
}

function formatShare(value) {
  return `${formatNumber(value, 0)} %`;
}

function formatSocleStatus(label = "") {
  if (label === "Pas de detraining") {
    return "Socle stable";
  }

  if (label === "Detraining en cours") {
    return "Socle en baisse";
  }

  return label || "Non calcule";
}

function buildDynamicsAction({
  acwr = {},
  detraining = {},
  timeToRecover = {},
  ctlProgression = {},
  loadVarianceModel = {},
  polarizationModel = {},
} = {}) {
  if (acwr.tone === "danger" || detraining.tone === "danger" || timeToRecover.tone === "warning") {
    return {
      tone: "danger",
      title: "Absorbe avant de recharger",
      detail: "Garde du facile avant d'ajouter une grosse seance.",
    };
  }

  if (acwr.tone === "warning" || loadVarianceModel.tone === "warning" || polarizationModel.tone === "warning") {
    return {
      tone: "warning",
      title: "Surveille l'accumulation",
      detail: "Alterne vraiment facile et dur.",
    };
  }

  if (detraining.isLosingFitness || Number(ctlProgression.weeklyPercent) < -5) {
    return {
      tone: "neutral",
      title: "Relance progressivement",
      detail: "Repars par du volume facile.",
    };
  }

  if (ctlProgression.tone === "positive" && ["positive", "neutral"].includes(timeToRecover.tone || "neutral")) {
    return {
      tone: "positive",
      title: "Tu peux construire",
      detail: "Continue a doser progressivement.",
    };
  }

  return {
    tone: "neutral",
    title: "Bloc a maintenir",
    detail: "Croise avec tes sensations, ton sommeil et les douleurs.",
  };
}

function DynamicsTile({
  title,
  value,
  status = "",
  detail = "",
  meta = "",
  tone = "neutral",
  info = [],
  surfaceDetail = false,
  surfaceMeta = false,
  children = null,
}) {
  const shouldShowDetail = Boolean(detail) && (surfaceDetail || tone === "warning" || tone === "danger");

  return (
    <article className={`dynamics-tile dynamics-tile-${tone}`.trim()}>
      <header className="dynamics-tile-header">
        <span className="field-label">{title}</span>
        <InfoTooltip title={title} content={info} label={`Afficher l'aide pour ${title}`} />
      </header>
      <div className="dynamics-tile-main">
        <strong className="dynamics-tile-value">{value}</strong>
        {status ? <span className={`dynamics-status dynamics-status-${tone}`.trim()}>{status}</span> : null}
      </div>
      {shouldShowDetail ? <p className="dynamics-tile-detail">{detail}</p> : null}
      {children}
      {surfaceMeta && meta ? <span className="small-text">{meta}</span> : null}
    </article>
  );
}

function IntensityShareBar({ lowShare = 0, moderateShare = 0, highShare = 0 }) {
  const low = Math.max(0, Number(lowShare) || 0);
  const moderate = Math.max(0, Number(moderateShare) || 0);
  const high = Math.max(0, Number(highShare) || 0);
  const total = low + moderate + high;

  if (total <= 0) {
    return null;
  }

  return (
    <div className="dynamics-intensity-share">
      <div className="dynamics-intensity-bar" aria-hidden="true">
        <span className="dynamics-intensity-segment dynamics-intensity-low" style={{ flexBasis: `${low}%` }} />
        <span className="dynamics-intensity-segment dynamics-intensity-moderate" style={{ flexBasis: `${moderate}%` }} />
        <span className="dynamics-intensity-segment dynamics-intensity-high" style={{ flexBasis: `${high}%` }} />
      </div>
      <div className="dynamics-intensity-legend">
        <span>Facile {formatShare(low)}</span>
        <span>Z3 {formatShare(moderate)}</span>
        <span>Intense {formatShare(high)}</span>
      </div>
    </div>
  );
}

function DynamicsGroup({ title = "", subtitle = "", children = null }) {
  return (
    <section className="dynamics-group">
      <div className="dynamics-group-header">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="dynamics-grid">{children}</div>
    </section>
  );
}

function DynamicsGrid({
  loadVarianceModel = {},
  polarizationModel = {},
  loadDynamicsProfile = {},
  criticalSpeedModel = {},
  signalInfo = {},
  loadDynamicsInfo = {},
  cardInfo = [],
}) {
  const acwr = loadDynamicsProfile?.acwrEwma || {};
  const detraining = loadDynamicsProfile?.detraining || {};
  const timeToRecover = loadDynamicsProfile?.timeToRecover || {};
  const ctlProgression = loadDynamicsProfile?.ctlProgression || {};
  const efficiencyPlateau = loadDynamicsProfile?.efficiencyPlateau || {};
  const recoveryContext = loadDynamicsProfile?.recoveryContext || {};
  const criticalSpeedValue = criticalSpeedModel?.hasData
    ? `${formatNumber(criticalSpeedModel.criticalSpeedKmh, 2)} km/h`
    : "-";
  const criticalSpeedMeta = criticalSpeedModel?.hasData
    ? `${formatPace(criticalSpeedModel.paceSecondsPerKm)} - ${criticalSpeedModel.message}`
    : criticalSpeedModel?.message || "En attente de records route enrichis.";
  const actionHint = buildDynamicsAction({
    acwr,
    detraining,
    timeToRecover,
    ctlProgression,
    loadVarianceModel,
    polarizationModel,
  });

  return (
    <section className="card dynamics-grid-card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <div className="title-with-info">
            <h2 className="card-title">Ce qui explique la tendance</h2>
            <InfoTooltip title="Ce qui explique la tendance" content={cardInfo} label="Afficher l'aide pour la dynamique" />
          </div>
        </div>
      </div>

      <div className={`dynamics-action dynamics-action-${actionHint.tone}`.trim()}>
        <span>Et maintenant ?</span>
        <strong>{actionHint.title}</strong>
        <p>{actionHint.detail}</p>
      </div>

      <div className="dynamics-groups">
        <DynamicsGroup
          title="Absorption de la charge"
        >
          <DynamicsTile
            title="Hausse de charge"
            value={acwr.hasData ? formatNumber(acwr.ratio, 2) : "-"}
            status={acwr.label || "Non calcule"}
            detail={acwr.hasData ? "Ta charge recente monte-t-elle trop vite ?" : acwr.message}
            meta={acwr.hasData ? acwr.message : ""}
            tone={acwr.tone || "neutral"}
            info={loadDynamicsInfo.acwrEwma}
          />
          <DynamicsTile
            title="Pression cumulee 7 j"
            value={loadVarianceModel?.hasData ? `${formatNumber(loadVarianceModel.strain, 0)} pts` : "-"}
            status={loadVarianceModel?.hasData ? `${formatNumber(loadVarianceModel.weeklyLoad, 0)} pts / 7 j` : "Non calcule"}
            detail="Plus c'est haut, plus ton bloc demande a etre absorbe."
            meta="Calcul Foster : charge 7 j × régularité de charge."
            tone={loadVarianceModel?.tone || "neutral"}
            info={signalInfo.strain}
          />
          <DynamicsTile
            title="Regularite de charge"
            value={loadVarianceModel?.hasData ? formatNumber(loadVarianceModel.monotony, 2) : "-"}
            status={loadVarianceModel?.hasData ? loadVarianceModel.label : "Non calculee"}
            detail="Tes jours sont-ils bien alternes ou trop semblables ?"
            meta={loadVarianceModel?.hasData ? "Variation des charges quotidiennes sur 7 jours." : "Pas assez de charge recente."}
            tone={loadVarianceModel?.tone || "neutral"}
            info={signalInfo.monotony}
          />
          <DynamicsTile
            title="Jours faciles necessaires"
            value={timeToRecover.hasData
              ? (timeToRecover.daysToTarget !== null ? `${timeToRecover.daysToTarget} j` : "> 21 j")
              : "-"}
            status={timeToRecover.label || "Non calcule"}
            detail="Estimation du temps pour retrouver une marge de fraîcheur."
            meta={timeToRecover.message}
            tone={timeToRecover.tone || "neutral"}
            info={loadDynamicsInfo.timeToRecover}
          />
          <DynamicsTile
            title="Socle en recul"
            value={detraining.hasData ? formatSigned(detraining.dropPercent, " %") : "-"}
            status={formatSocleStatus(detraining.label)}
            detail="Ta base recule-t-elle depuis plusieurs semaines ?"
            meta={detraining.message}
            tone={detraining.tone || "neutral"}
            info={loadDynamicsInfo.detraining}
          />
          <DynamicsTile
            title="Construction de la base"
            value={ctlProgression.hasData ? formatSigned(ctlProgression.weeklyPercent, " %/sem") : "-"}
            status={ctlProgression.label || "Non calcule"}
            detail="Vitesse a laquelle tu construis ton socle."
            meta={ctlProgression.message}
            tone={ctlProgression.tone || "neutral"}
            info={loadDynamicsInfo.ctlProgression}
          />
        </DynamicsGroup>

        <DynamicsGroup
          title="Qualite du bloc"
        >
          <DynamicsTile
            title="Structure d'intensite"
            value={polarizationModel?.label || "-"}
            status={polarizationModel?.metric === "load" ? "Charge" : "Durée"}
            detail="Répartition facile, tempo et intense."
            meta={polarizationModel?.message || "Zones indisponibles."}
            tone={polarizationModel?.tone || "neutral"}
            info={signalInfo.intensityStructure}
          >
            {polarizationModel?.hasData ? (
              <IntensityShareBar
                lowShare={polarizationModel.lowShare}
                moderateShare={polarizationModel.moderateShare}
                highShare={polarizationModel.highShare}
              />
            ) : null}
          </DynamicsTile>
          <DynamicsTile
            title="Tendance d'efficience"
            value={efficiencyPlateau.hasData ? formatSigned(efficiencyPlateau.slopePercentPerWeek, " %/sem") : "-"}
            status={efficiencyPlateau.label || "Non calcule"}
            detail="Ton rendement cardio-vitesse progresse-t-il encore ?"
            meta={efficiencyPlateau.message}
            tone={efficiencyPlateau.tone || "neutral"}
            info={loadDynamicsInfo.efficiencyPlateau}
          />
          <DynamicsTile
            title="Repere seuil route"
            value={criticalSpeedValue}
            status={criticalSpeedModel?.hasData ? "Estimee" : "A confirmer"}
            detail={criticalSpeedModel?.hasData ? "Allure repere proche de ton seuil soutenable." : "En attente d'au moins deux records exploitables."}
            meta={criticalSpeedMeta}
            tone={criticalSpeedModel?.hasData ? "positive" : "neutral"}
            info={signalInfo.criticalSpeed}
          />
        </DynamicsGroup>

        {recoveryContext.hasData ? (
          <DynamicsGroup title="Recuperation biologique">
            <DynamicsTile
              title="Etat general"
              value={recoveryContext.label}
              status={`${recoveryContext.sampleDays} jour(s) analyses`}
              detail="Lecture croisée sommeil, VFC et FC repos sur la période récente."
              meta={recoveryContext.message}
              tone={recoveryContext.tone || "neutral"}
            />
            <DynamicsTile
              title="Sommeil (score moyen)"
              value={recoveryContext.avgSleepScore != null ? `${recoveryContext.avgSleepScore} / 100` : "-"}
              status={recoveryContext.latestSleepScore != null ? `Dernier : ${recoveryContext.latestSleepScore}` : "Indisponible"}
              detail="Score de qualite du sommeil Garmin."
              meta={recoveryContext.sleepWarning ? "Qualite insuffisante — impact probable sur l'absorption de la charge." : "Qualite correcte."}
              tone={recoveryContext.sleepWarning ? "warning" : "positive"}
            />
            <DynamicsTile
              title="VFC moyenne (ms)"
              value={recoveryContext.avgHrvMs != null ? `${recoveryContext.avgHrvMs} ms` : "-"}
              status={recoveryContext.latestHrvMs != null ? `Derniere : ${recoveryContext.latestHrvMs} ms` : "Indisponible"}
              detail="Variabilite de frequence cardiaque nocturne. Baisse = fatigue systemique probable."
              meta={recoveryContext.hrvDeclineFlag ? "VFC en recul vs début de période : surveiller." : "VFC stable ou en hausse."}
              tone={recoveryContext.hrvDeclineFlag ? "warning" : "positive"}
            />
            <DynamicsTile
              title="FC repos"
              value={recoveryContext.latestRestingHr != null ? `${recoveryContext.latestRestingHr} bpm` : "-"}
              status={recoveryContext.restingHrElevatedFlag ? "Elevee" : "Normale"}
              detail="FC de repos matinale. Hausse = récupération insuffisante ou stress."
              meta={recoveryContext.restingHrElevatedFlag ? "FC repos au-dessus du repère de la période." : "FC repos dans les normes."}
              tone={recoveryContext.restingHrElevatedFlag ? "warning" : "positive"}
            />
            {recoveryContext.latestBodyBattery != null ? (
              <DynamicsTile
                title="Energie"
                value={`${recoveryContext.latestBodyBattery} %`}
                status="Derniere mesure"
                detail="Energie disponible (Body Battery Garmin), au reveil ou en journee."
                meta={recoveryContext.latestBodyBattery < 30 ? "Niveau faible — favoriser la récupération." : "Niveau suffisant."}
                tone={recoveryContext.latestBodyBattery < 30 ? "warning" : "positive"}
              />
            ) : null}
          </DynamicsGroup>
        ) : null}
      </div>
    </section>
  );
}

export default memo(DynamicsGrid);
