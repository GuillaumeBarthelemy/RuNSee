import { memo, useMemo } from "react";
import InfoTooltip from "./InfoTooltip.jsx";
import {
  buildAerobicDecouplingProfile,
  buildCadenceProfile,
  buildSessionTimeInZone,
  buildVariabilityIndex,
} from "../utils/intraSessionMetrics.js";
import { isRunLikeActivity } from "../utils/activityInsights.js";

function formatPaceFromSpeedKmh(speedKmh) {
  const safeSpeed = Number(speedKmh);

  if (!Number.isFinite(safeSpeed) || safeSpeed <= 0) {
    return "-";
  }

  const secondsPerKm = 3600 / safeSpeed;
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm - minutes * 60);
  return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
}

function formatMinutesFromSeconds(seconds) {
  const safe = Number(seconds);

  if (!Number.isFinite(safe) || safe <= 0) {
    return "-";
  }

  const minutes = Math.floor(safe / 60);
  const remainingSeconds = Math.round(safe - minutes * 60);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const minutesRemainder = minutes - hours * 60;
    return `${hours} h ${String(minutesRemainder).padStart(2, "0")} min`;
  }

  return `${minutes} min ${String(remainingSeconds).padStart(2, "0")} s`;
}

const SIGNAL_INFO = {
  decoupling: [
    { label: "En bref", text: "Pourcentage d'augmentation du ratio FC / vitesse entre la 1re et la 2e moitie d'une sortie longue.", glossaryKey: "aerobicDecoupling" },
    { label: "Calcul", text: "On compare le ratio vitesse / FC sur la premiere et la deuxieme moitie de la seance, sur les splits enrichis. Reserve aux sorties >= 60 min en endurance fondamentale (FC < 82 % FC max)." },
    { label: "Comment lire ta valeur", text: "< 3 % = excellente base aerobie. 3-5 % = base correcte. 5-8 % = sortie limite ou conditions difficiles. > 8 % = base aerobie a renforcer." },
    { label: "Action concrete", text: "Si ta derive depasse 5 % regulierement, augmente la part de tes sorties longues a allure tres facile pour epaissir ta base." },
    { label: "Pour aller plus loin", text: "Joe Friel, The Triathlete's Training Bible ; trainingpeaks.com/blog/how-to-test-your-aerobic-fitness." },
  ],
  variability: [
    { label: "En bref", text: "Mesure si l'allure de ta seance etait lineaire ou tres variable." },
    { label: "Calcul", text: "Variability Index = vitesse normalisee (moyenne quadratique des splits ponderee par la duree) / vitesse moyenne. Adaptation course du VI puissance de Coggan." },
    { label: "Comment lire ta valeur", text: "1.00-1.06 = effort lineaire (sortie continue). 1.07-1.14 = effort module (terrain accidente, fartlek). >= 1.15 = effort tres fractionne (intervalles, cotes)." },
    { label: "Action concrete", text: "Compare le VI a ton intention : un fartlek doit avoir un VI eleve, une sortie longue EF un VI proche de 1." },
  ],
  zones: [
    { label: "En bref", text: "Temps passe dans chaque zone FC sur cette seance precise." },
    { label: "Calcul", text: "Chaque split est classe dans la zone correspondant a sa FC moyenne, puis on totalise la duree par zone." },
    { label: "Comment lire ta valeur", text: "Pour une sortie EF, vise > 80 % du temps en Z1+Z2. Pour un seuil, vise une dominante Z3-Z4. Pour un VO2max, vise des pics nets en Z4-Z5." },
    { label: "Action concrete", text: "Si une sortie EF a passe trop de temps en Z3 (zone grise), c'etait probablement une fausse EF qui fatigue sans construire la base." },
  ],
  cadence: [
    { label: "En bref", text: "Cadence en pas/min totale et amplitude moyenne (longueur de pas)." },
    { label: "Calcul", text: "Cadence Strava x 2 (Strava donne pas par jambe). Amplitude = vitesse moyenne / cadence." },
    { label: "Comment lire ta valeur", text: "Cibles indicatives chez les coureurs : 165-180 spm en sortie standard. Une cadence stable proche de 175-180 reduit l'impact au sol et la fatigue musculaire." },
    { label: "Action concrete", text: "Si tu cours regulierement < 160 spm, essaie d'augmenter la cadence de 5-10 % en gardant la meme allure : pas plus rapides, plus courts, moins traumatisants." },
    { label: "Pour aller plus loin", text: "Cavanagh & Williams (1982), The effect of stride length variation on oxygen uptake during distance running." },
  ],
};

// Jauge horizontale generique : place un marqueur sur une echelle [min,max]
// avec une zone "cible" optionnelle. Utilisee pour VI et cadence (C2b).
function MiniGauge({ value, min, max, target = null, ariaLabel = "" }) {
  if (!Number.isFinite(value)) return null;
  const clamp = (v) => Math.min(100, Math.max(0, v));
  const pct = clamp(((value - min) / (max - min)) * 100);
  const targetStart = target ? clamp(((target[0] - min) / (max - min)) * 100) : null;
  const targetWidth = target ? clamp(((target[1] - target[0]) / (max - min)) * 100) : null;
  return (
    <div className="intra-gauge" role="img" aria-label={ariaLabel}>
      <div className="intra-gauge-track">
        {target ? (
          <span className="intra-gauge-target" style={{ left: `${targetStart}%`, width: `${targetWidth}%` }} />
        ) : null}
        <span className="intra-gauge-marker" style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
}

function MetricBlock({ title, info, headline, detail, tone = "neutral", children }) {
  return (
    <section className={`intra-session-block intra-session-block-${tone}`.trim()}>
      <header className="intra-session-block-header">
        <div className="title-with-info">
          <h4 className="intra-session-block-title">{title}</h4>
          <InfoTooltip title={title} content={info || []} label={`Afficher l'aide pour ${title}`} />
        </div>
      </header>

      {headline ? <strong className="intra-session-block-value">{headline}</strong> : null}
      {detail ? <span className="small-text">{detail}</span> : null}
      {children}
    </section>
  );
}

function IntraSessionInsightsCard({ activity = null, trainingAnalyticsSettings = null }) {
  const isRun = isRunLikeActivity(activity || {});

  const decoupling = useMemo(
    () => buildAerobicDecouplingProfile(activity || {}, { settings: trainingAnalyticsSettings }),
    [activity, trainingAnalyticsSettings],
  );

  const variability = useMemo(
    () => buildVariabilityIndex(activity || {}),
    [activity],
  );

  const timeInZone = useMemo(
    () => buildSessionTimeInZone(activity || {}, { settings: trainingAnalyticsSettings }),
    [activity, trainingAnalyticsSettings],
  );

  const cadence = useMemo(
    () => buildCadenceProfile(activity || {}),
    [activity],
  );

  if (!activity) {
    return null;
  }

  const decouplingHeadline = decoupling.hasData
    ? `${decoupling.decouplingPercent.toLocaleString("fr-FR")} %`
    : "-";
  const decouplingDetail = decoupling.hasData
    ? `${decoupling.label}. 1re moitie ${formatPaceFromSpeedKmh(decoupling.firstHalfSpeedKmh)} a ${decoupling.firstHalfHr} bpm, 2e moitie ${formatPaceFromSpeedKmh(decoupling.secondHalfSpeedKmh)} a ${decoupling.secondHalfHr} bpm.`
    : decoupling.message;

  const variabilityHeadline = variability.hasData
    ? variability.variabilityIndex.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "-";
  const variabilityDetail = variability.hasData
    ? `${variability.label}. Vitesse moyenne ${variability.meanSpeedKmh.toLocaleString("fr-FR")} km/h, normalisee ${variability.normalizedSpeedKmh.toLocaleString("fr-FR")} km/h sur ${variability.splitCount} splits.`
    : variability.message;

  const cadenceHeadline = cadence.hasData
    ? `${cadence.cadenceSpm} spm`
    : "-";
  const cadenceDetail = cadence.hasData
    ? `${cadence.cadenceLabel}. Amplitude moyenne ${cadence.strideLengthMeters.toLocaleString("fr-FR")} m / pas.`
    : cadence.message;

  return (
    <section className="card intra-session-card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h3 className="subcard-title">Lecture intra-seance</h3>
          <p className="card-subtitle">
            Reperes detailles sur cette seance : derive cardiaque, variabilite, repartition des zones et cadence.
          </p>
        </div>
      </div>

      <div className="intra-session-grid">
        {isRun ? (
          <MetricBlock
            title="Derive cardiaque"
            info={SIGNAL_INFO.decoupling}
            headline={decouplingHeadline}
            detail={decouplingDetail}
            tone={decoupling.tone || "neutral"}
          />
        ) : null}

        <MetricBlock
          title="Variability Index"
          info={SIGNAL_INFO.variability}
          headline={variabilityHeadline}
          detail={variabilityDetail}
          tone={variability.tone || "neutral"}
        >
          {variability.hasData ? (
            <MiniGauge
              value={variability.variabilityIndex}
              min={0.95}
              max={1.20}
              target={[0.95, 1.05]}
              ariaLabel={`Variability Index ${variability.variabilityIndex}`}
            />
          ) : null}
        </MetricBlock>

        {isRun ? (
          <MetricBlock
            title="Cadence et amplitude"
            info={SIGNAL_INFO.cadence}
            headline={cadenceHeadline}
            detail={cadenceDetail}
            tone={cadence.cadenceTone || "neutral"}
          >
            {cadence.hasData ? (
              <MiniGauge
                value={cadence.cadenceSpm}
                min={150}
                max={195}
                target={[170, 185]}
                ariaLabel={`Cadence ${cadence.cadenceSpm} spm`}
              />
            ) : null}
          </MetricBlock>
        ) : null}
      </div>

      <section className="intra-session-zones top-gap-sm">
        <header className="title-with-info">
          <h4 className="intra-session-block-title">Temps par zone FC sur cette seance</h4>
          <InfoTooltip title="Temps par zone FC" content={SIGNAL_INFO.zones} label="Afficher l'aide pour le temps par zone FC" />
        </header>

        {timeInZone.hasData ? (
          <>
            {/* Barre empilee proportionnelle : lecture immediate de la repartition */}
            <div className="intra-session-zone-bar" role="img" aria-label="Répartition du temps par zone FC">
              {timeInZone.zones
                .filter((z) => z.sharePercent > 0)
                .map((zone) => (
                  <span
                    key={zone.key}
                    className={`intra-session-zone-seg intra-session-zone-seg-${zone.key}`}
                    style={{ width: `${zone.sharePercent}%` }}
                    title={`${zone.shortLabel} : ${zone.sharePercent}% (${formatMinutesFromSeconds(zone.durationSeconds)})`}
                  >
                    {zone.sharePercent >= 8 ? `${zone.sharePercent}%` : ""}
                  </span>
                ))}
            </div>
            <div className="intra-session-zone-grid">
              {timeInZone.zones.map((zone) => (
                <div key={zone.key} className={`intra-session-zone-cell intra-session-zone-cell-${zone.key}`}>
                  <span className="status-pill status-idle">{zone.shortLabel}</span>
                  <strong>{formatMinutesFromSeconds(zone.durationSeconds)}</strong>
                  <span className="small-text">{zone.sharePercent} % · {zone.rangeLabel || "-"}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="small-text">{timeInZone.message}</p>
        )}
      </section>
    </section>
  );
}

export default memo(IntraSessionInsightsCard);
