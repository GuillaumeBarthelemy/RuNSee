import { memo } from "react";
import GlossaryLink from "./GlossaryLink.jsx";
import MetricGauge from "./visuals/MetricGauge.jsx";
import MicroBars from "./visuals/MicroBars.jsx";
import TrendChip from "./visuals/TrendChip.jsx";
import { buildRecoveryViewModel } from "../utils/recoveryViewModel.js";
import {
  energyLevelTone,
  readinessTone,
  restingHrDeltaTone,
  sleepScoreTone,
  vfcDeltaTone,
} from "../utils/tonePicker.js";

/**
 * TodayReadinessCard — Phase F1.
 *
 * Composant unique remplaçant les 3 doublons :
 * - RecoverySnapshotCard (KpiGrid simple)
 * - TodayRecoveryCard (sparklines)
 * - Section "Signaux Garmin" du DashboardDecisionSummaryCard
 *
 * Affiche :
 * - Jauge Aptitude RuNSee (composite 0-100, formule transparente)
 * - 4 tuiles : Sommeil, VFC, FC repos, Énergie (valeur 7j + delta + MicroBars 14j)
 * - Indicateur de confiance basé sur la couverture des données
 *
 * Référence :
 * - GLOSSAIRE.md (entrées vfc, sleepScore, restingHr, energyLevel, trainingReadinessRunsee)
 * - UX_AUDIT.md section Phase F1
 */

/**
 * Pour chaque tuile recovery, le tone est calculé sur le **delta vs baseline**
 * (logique scientifique correcte) — PAS sur la valeur absolue.
 *
 * - Sommeil : score 0-100 directement comparable (sleepScoreTone(value))
 * - VFC, FC repos, Énergie : tone basé sur deltaPct vs baseline
 *
 * `isAbsolute` : passe la valeur brute à toneFn (ex: sleepScore).
 * Sinon : passe le deltaPct.
 *
 * Pour les MicroBars : on calcule le tone de chaque jour vs sa propre baseline
 * (la moyenne de la fenêtre). Cela évite le bug où une FC repos absolue de 49
 * bpm tombait dans la zone "+5 bpm = alerte" alors que c'est la valeur normale
 * de l'utilisateur.
 */
function MetricTile({ label, unit, valueModel, glossaryKey, toneFn, isAbsolute = false }) {
  if (!valueModel) return null;

  const value = valueModel.recentAvg ?? valueModel.latestValue;
  const display = value != null ? `${Math.round(value)} ${unit}` : "—";

  // Tone du résumé : basé sur delta vs baseline (scientifique correct)
  // ou sur la valeur absolue pour les scores normalisés (sleepScore 0-100)
  let summaryTone = 3;
  if (value != null && toneFn) {
    if (isAbsolute) {
      summaryTone = toneFn(value);
    } else if (valueModel.deltaPct != null) {
      summaryTone = toneFn(valueModel.deltaPct);
    }
  }

  // Tones des MicroBars : pour les valeurs absolues (sleepScore), on applique
  // toneFn directement à chaque valeur.
  // Pour les deltas (VFC, FC repos, Énergie), on compare chaque barre à la
  // moyenne baseline de la fenêtre (= un "delta % vs moyenne").
  const series = valueModel.series || [];
  const baselineMean = valueModel.baselineAvg ?? valueModel.recentAvg ?? null;
  const tones = series.map((v) => {
    if (v == null || !toneFn) return 3;
    if (isAbsolute) {
      return toneFn(v);
    }
    if (baselineMean != null && baselineMean > 0) {
      const deltaPct = ((v - baselineMean) / baselineMean) * 100;
      return toneFn(deltaPct);
    }
    return 3;
  });

  return (
    <div className="readiness-tile">
      <div className="readiness-tile-header">
        <span className="readiness-tile-label">{label}</span>
        {glossaryKey ? <GlossaryLink termKey={glossaryKey}>?</GlossaryLink> : null}
      </div>
      <span className={`readiness-tile-value tone-${summaryTone}`}>{display}</span>
      {valueModel.deltaPct != null ? (
        <TrendChip
          delta={valueModel.deltaPct}
          unit="%"
          tone={summaryTone}
          label="vs repère"
        />
      ) : null}
      {series.length > 1 ? (
        <MicroBars
          series={series}
          tones={tones}
          height="sm"
          ariaLabel={`${label} sur 14 jours`}
        />
      ) : null}
    </div>
  );
}

function TodayReadinessCard({ snapshots = [] }) {
  const vm = buildRecoveryViewModel(snapshots);

  if (!vm.hasData) {
    return (
      <section className="card today-readiness-card today-readiness-card--empty">
        <div className="card-header">
          <div className="card-title-block">
            <h2 className="card-title">Aptitude du jour</h2>
            <span className="card-subtitle">Garmin non connecté</span>
          </div>
        </div>
        <p className="today-readiness-empty-hint">
          Connecte ton compte Garmin depuis la page&nbsp;Réglages pour voir ton aptitude
          du jour, ta VFC, ta FC repos et ton énergie.
        </p>
      </section>
    );
  }

  const readinessScore = vm.readiness?.score ?? null;
  const readinessConfidence = vm.readiness?.confidence ?? "Faible";

  return (
    <section className="card today-readiness-card">
      <div className="card-header">
        <div className="card-title-block">
          <h2 className="card-title">Aptitude du jour</h2>
          <span className="card-subtitle">
            Confiance : {readinessConfidence} · {vm.confidenceLabel}
          </span>
        </div>
      </div>

      <div className="readiness-layout">
        {/* Jauge principale Aptitude RuNSee */}
        <div className="readiness-gauge-block">
          <MetricGauge
            value={readinessScore}
            min={0}
            max={100}
            tone={readinessScore != null ? readinessTone(readinessScore) : 3}
            unit="/ 100"
            label="Aptitude RunNSee"
            size="md"
          />
          <GlossaryLink termKey="trainingReadinessRunsee">
            Comment c'est calculé ?
          </GlossaryLink>
        </div>

        {/* 4 tuiles : Sommeil, VFC, FC repos, Énergie */}
        <div className="readiness-tiles-grid">
          <MetricTile
            label="Sommeil"
            unit="/ 100"
            valueModel={vm.sleep}
            glossaryKey="sleepScore"
            toneFn={sleepScoreTone}
            isAbsolute
          />
          <MetricTile
            label="VFC moy."
            unit="ms"
            valueModel={vm.hrv}
            glossaryKey="vfc"
            toneFn={vfcDeltaTone}
          />
          <MetricTile
            label="FC repos"
            unit="bpm"
            valueModel={vm.restingHr}
            glossaryKey="restingHr"
            toneFn={restingHrDeltaTone}
          />
          <MetricTile
            label="Énergie"
            unit="%"
            valueModel={vm.bodyBattery}
            glossaryKey="energyLevel"
            toneFn={energyLevelTone}
            isAbsolute
          />
        </div>
      </div>
    </section>
  );
}

export default memo(TodayReadinessCard);
