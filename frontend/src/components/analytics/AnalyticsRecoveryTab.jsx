import { memo, useMemo } from "react";
import RecoveryVsLoadChart from "../RecoveryVsLoadChart.jsx";
import EmptyState from "../visuals/alpine/EmptyState.jsx";
import { computeHrvCv } from "../../utils/recoveryAdvanced.js";
import { buildPersonalPatterns } from "../../utils/crossDataAnalytics.js";
import { clampTone } from "../../utils/tonePicker.js";
import { Link } from "react-router-dom";

/**
 * AnalyticsRecoveryTab — onglet "Sommeil & récupération" (Lot 04, plan §4).
 *
 * Affiche :
 *   - Recovery vs Load : nuage de points charge ↔ récupération (existant).
 *   - CV-HRV (Plews 2013) : coefficient de variation VFC sur 7j.
 *   - Insights croisés (buildPersonalPatterns crossDataAnalytics.js) :
 *     qualité du sommeil ↔ récupération, charge ↔ sommeil, monotony ↔ HRV.
 *
 * État vide propre si Garmin non connecté (plan §8).
 */

function InsightCard({ insight, fallback }) {
  if (!insight || !insight.hasData) {
    return insight?.message
      ? <p className="alpine-insight-empty">{insight.message}</p>
      : <p className="alpine-insight-empty">{fallback}</p>;
  }
  return (
    <div className="alpine-insight-row">
      {insight.headline ? <h4 className="alpine-insight-headline">{insight.headline}</h4> : null}
      {insight.insight ? <p className="alpine-insight-text">{insight.insight}</p> : null}
      {insight.confidence ? (
        <span className="alpine-insight-confidence">Fiabilité : {insight.confidence}</span>
      ) : null}
    </div>
  );
}

function AnalyticsRecoveryTab({
  recoveryVm = null,
  recoveryCorrelation = null,
  activities = [],
  snapshots = [],
}) {
  // CV-HRV calculé sur la série recoveryVm.hrv.series (28j Garmin)
  const hrvCv = useMemo(() => {
    if (!recoveryVm?.hrv?.series) return computeHrvCv([]);
    return computeHrvCv(recoveryVm.hrv.series, 7);
  }, [recoveryVm]);

  // Insights croisés (déjà calculés via crossDataAnalytics)
  const patterns = useMemo(
    () => buildPersonalPatterns({ activities, snapshots }),
    [activities, snapshots],
  );

  const hasHrvData = !!recoveryVm?.hrv?.recentAvg;
  const hasGarminAtAll = hasHrvData || !!recoveryVm?.sleep?.recentAvg || !!recoveryVm?.restingHr?.recentAvg;

  if (!hasGarminAtAll) {
    return (
      <div className="alpine-analytics-tab alpine-analytics-tab--recovery">
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 13 a8 8 0 1 1 -10 -10 a6.5 6.5 0 0 0 10 10 Z" fill="currentColor" />
            </svg>
          }
          title="Données de récupération non disponibles"
          description="Connectez votre montre Garmin pour activer le suivi du sommeil, de la VFC et de la fréquence cardiaque au repos."
          action={{
            label: "Configurer les connexions",
            onClick: () => { window.location.assign("/admin#connexions"); },
          }}
        />
      </div>
    );
  }

  const cvTone = clampTone(hrvCv.tone || 3);

  return (
    <div className="alpine-analytics-tab alpine-analytics-tab--recovery">
      {/* CV-HRV (Plews 2013) */}
      <div className="alpine-analytics-tab-section">
        <article className={`alpine-pi-card tone-${cvTone}`}>
          <header className="alpine-pi-card-head">
            <span className="eyebrow">Stabilité VFC</span>
            <h3 className="card-title">Coefficient de variation VFC (CV-HRV)</h3>
            <p className="card-subtitle">
              CV = (écart-type VFC 7j / moyenne VFC 7j) × 100.
            </p>
          </header>

          <div className="alpine-pi-card-body">
            <div className="alpine-pi-card-value-block">
              <strong className={`alpine-pi-card-value tone-${cvTone}`}>
                {hrvCv.cv != null ? `${hrvCv.cv}` : "—"}
              </strong>
              <span className="alpine-pi-card-unit">%</span>
              <span className={`alpine-pi-card-level tone-${cvTone}`}>{hrvCv.label}</span>
            </div>

            {hrvCv.mean != null ? (
              <div className="alpine-pi-card-zones">
                <ul>
                  <li><span>VFC moyenne 7j</span><strong>{hrvCv.mean} ms</strong></li>
                  <li><span>Écart-type 7j</span><strong>{hrvCv.sd} ms</strong></li>
                  <li><span>Mesures utilisées</span><strong>{hrvCv.nValid}/7</strong></li>
                </ul>
              </div>
            ) : null}
          </div>

          <p className="alpine-pi-card-note">
            Un CV faible (&lt; 6 %) reflète une parasympathique stable.
            Un CV élevé (&gt; 10 %) peut signaler un stress accumulé.
          </p>
          <p className="alpine-pi-card-source">
            Source : Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M (2013).
            <i> Sports Med</i> 43(9):773–781.
          </p>
        </article>
      </div>

      {/* Recovery vs Load (existant) */}
      {recoveryCorrelation?.hasData ? (
        <div className="alpine-analytics-tab-section">
          <RecoveryVsLoadChart points={recoveryCorrelation.points} />
        </div>
      ) : null}

      {/* Insights croisés (buildPersonalPatterns) */}
      <div className="alpine-analytics-tab-section">
        <div className="analysis-section-intro">
          <span className="eyebrow">Lectures croisées</span>
          <h2 className="card-title">Récupération × Charge × Sommeil</h2>
          <p className="card-subtitle">
            Trois corrélations issues de votre historique.
            Fiabilité globale : <strong>{patterns.globalConfidence}</strong>
            {patterns.activitiesAnalyzed ? ` · ${patterns.activitiesAnalyzed} sorties analysées` : ""}
            {patterns.daysAnalyzed ? `, ${patterns.daysAnalyzed} jours de données` : ""}.
          </p>
        </div>

        <div className="grid two-columns alpine-insights-grid">
          <div className="alpine-insight-card">
            <h4>Sommeil → récupération</h4>
            <InsightCard
              insight={patterns.qualityVsRecovery}
              fallback="Pas encore assez de mesures pour relier qualité du sommeil et récupération."
            />
          </div>
          <div className="alpine-insight-card">
            <h4>Charge → sommeil</h4>
            <InsightCard
              insight={patterns.chargeImpactOnSleep}
              fallback="Pas encore assez de mesures pour relier charge d'entraînement et sommeil."
            />
          </div>
          <div className="alpine-insight-card">
            <h4>Monotonie → VFC</h4>
            <InsightCard
              insight={patterns.monotonyVsHrv}
              fallback="Pas encore assez de mesures pour relier monotonie de charge et VFC."
            />
          </div>
        </div>

        {!patterns.hasMinimumData ? (
          <p className="alpine-takeaway-card-missing">
            Continuez à porter votre montre et à enregistrer vos sorties pour fiabiliser ces lectures.
            <Link to="/admin#connexions"> Vérifier les connexions →</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default memo(AnalyticsRecoveryTab);
