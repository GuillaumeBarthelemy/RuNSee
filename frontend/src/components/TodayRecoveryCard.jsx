import { memo } from "react";
import { TRAINING_MVP_RECOVERY_INFO } from "../content/trainingMvpCopy.js";
import { buildRecoveryViewModel } from "../utils/recoveryViewModel.js";
import InfoTooltip from "./InfoTooltip.jsx";

// ---------------------------------------------------------------------------
// Sparkline helpers (same dimensions as TodayFormCards)
// ---------------------------------------------------------------------------

const SPARK_WIDTH = 180;
const SPARK_HEIGHT = 52;
const SPARK_PADDING = 6;

function buildLinePath(values, minValue, maxValue) {
  const valid = values.filter((v) => v != null);
  if (!valid.length) return "";

  // Map null to the minimum so gaps don't distort the line
  const filled = values.map((v) => (v != null ? v : minValue));
  const span = Math.max(1, maxValue - minValue);
  const w = SPARK_WIDTH - SPARK_PADDING * 2;
  const h = SPARK_HEIGHT - SPARK_PADDING * 2;

  return filled
    .map((v, i) => {
      const x = SPARK_PADDING + (filled.length === 1 ? w : (i / (filled.length - 1)) * w);
      const y = SPARK_PADDING + ((maxValue - v) / span) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function SparkLine({ series = [], toneClassName = "" }) {
  const valid = series.filter((v) => v != null);
  if (valid.length < 2) return null;

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const path = buildLinePath(series, min, max);

  return (
    <svg
      className={`recovery-spark ${toneClassName}`}
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      aria-hidden="true"
    >
      <path d={path} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Single metric tile
// ---------------------------------------------------------------------------

function formatDelta(deltaPct) {
  if (deltaPct == null) return null;
  const sign = deltaPct >= 0 ? "+" : "";
  return `${sign}${deltaPct.toFixed(1)} % vs repère`;
}

function toneClass(tone) {
  if (tone === "good") return "tone-good";
  if (tone === "warning") return "tone-warning";
  return "";
}

function MetricTile({ label, unit, metricModel, info }) {
  if (!metricModel) return null;

  const { recentAvg, latestValue, deltaPct, series, tone } = metricModel;
  // Affiche la moyenne 14 j (cohérent avec le sous-titre de la carte).
  // Fallback sur latestValue si la moyenne n'a pas pu être calculée (< 3 valeurs).
  const displayedNumber = recentAvg != null ? recentAvg : latestValue;
  const displayValue = displayedNumber != null ? `${Math.round(displayedNumber)} ${unit}` : "—";
  const delta = formatDelta(deltaPct);
  const tc = toneClass(tone);

  return (
    <div className={`recovery-tile ${tc}`}>
      <div className="recovery-tile-header">
        <span className="recovery-tile-label">{label}</span>
        {info ? (
          <InfoTooltip
            title={info.title}
            content={info.content}
            glossaryKey={info.glossaryKey}
          />
        ) : null}
      </div>
      <span className={`recovery-tile-value ${tc}`}>{displayValue}</span>
      {delta ? <span className="recovery-tile-delta">{delta}</span> : null}
      <SparkLine series={series} toneClassName={tc} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

function TodayRecoveryCard({ snapshots = [] }) {
  const vm = buildRecoveryViewModel(snapshots);

  if (!vm.hasData) {
    return (
      <section className="card today-recovery-card today-recovery-card--empty">
        <div className="card-header">
          <div className="card-title-block">
            <h2 className="card-title">Récupération Garmin</h2>
          </div>
        </div>
        <p className="today-recovery-empty-hint">
          Connecte ton compte Garmin depuis la page&nbsp;Admin pour voir tes métriques de récupération ici.
        </p>
      </section>
    );
  }

  return (
    <section className="card today-recovery-card">
      <div className="card-header">
        <div className="card-title-block">
          <h2 className="card-title">Récupération Garmin</h2>
          <span className="card-subtitle">{vm.confidenceLabel} · moyenne 7 j (sparkline 14 j)</span>
        </div>
        {TRAINING_MVP_RECOVERY_INFO?.card ? (
          <InfoTooltip
            title={TRAINING_MVP_RECOVERY_INFO.card.title}
            content={TRAINING_MVP_RECOVERY_INFO.card.content}
          />
        ) : null}
      </div>

      <div className="recovery-tiles-grid">
        <MetricTile
          label="Sommeil"
          unit="/ 100"
          metricModel={vm.sleep}
          info={TRAINING_MVP_RECOVERY_INFO?.sleep}
        />
        <MetricTile
          label="HRV moy."
          unit="ms"
          metricModel={vm.hrv}
          info={TRAINING_MVP_RECOVERY_INFO?.hrv}
        />
        <MetricTile
          label="FC repos"
          unit="bpm"
          metricModel={vm.restingHr}
          info={TRAINING_MVP_RECOVERY_INFO?.restingHr}
        />
        <MetricTile
          label="Body Battery"
          unit="%"
          metricModel={vm.bodyBattery}
          info={TRAINING_MVP_RECOVERY_INFO?.bodyBattery}
        />
      </div>
    </section>
  );
}

export default memo(TodayRecoveryCard);
