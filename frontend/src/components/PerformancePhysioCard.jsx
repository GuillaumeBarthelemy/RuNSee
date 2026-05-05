import { memo } from "react";
import { TRAINING_MVP_RECOVERY_INFO } from "../content/trainingMvpCopy.js";
import { buildRecoveryViewModel } from "../utils/recoveryViewModel.js";
import InfoTooltip from "./InfoTooltip.jsx";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toneClass(tone) {
  if (tone === "good") return "tone-good";
  if (tone === "warning") return "tone-warning";
  return "";
}

function formatDelta(deltaPct) {
  if (deltaPct == null) return null;
  const sign = deltaPct >= 0 ? "+" : "";
  return `${sign}${deltaPct.toFixed(1)} %`;
}

function Gauge({ value, max = 100, color = "var(--color-accent)" }) {
  if (value == null) return <div className="physio-gauge physio-gauge--empty" />;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="physio-gauge">
      <div
        className="physio-gauge-fill"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function PhysioRow({ label, unit, metricModel, max, color, info }) {
  if (!metricModel) return null;
  const { latestValue, recentAvg, deltaPct, tone } = metricModel;
  const tc = toneClass(tone);
  const display = latestValue != null ? `${Math.round(latestValue)} ${unit}` : "—";
  const delta = formatDelta(deltaPct);

  return (
    <div className={`physio-row ${tc}`}>
      <div className="physio-row-header">
        <span className="physio-row-label">{label}</span>
        {info ? (
          <InfoTooltip title={info.title} content={info.content} glossaryKey={info.glossaryKey} />
        ) : null}
        <span className={`physio-row-value ${tc}`}>{display}</span>
        {delta ? <span className="physio-row-delta">{delta}</span> : null}
      </div>
      <Gauge value={recentAvg} max={max} color={color} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

function PerformancePhysioCard({ snapshots = [] }) {
  const vm = buildRecoveryViewModel(snapshots);

  if (!vm.hasData) {
    return (
      <section className="card performance-physio-card performance-physio-card--empty">
        <div className="card-header">
          <div className="card-title-block">
            <h2 className="card-title">Profil physiologique</h2>
            <p className="card-subtitle">Données Garmin non disponibles</p>
          </div>
        </div>
        <p className="physio-empty-hint">
          Connecte ton compte Garmin depuis la page Admin pour voir ton profil physiologique ici.
        </p>
      </section>
    );
  }

  return (
    <section className="card performance-physio-card">
      <div className="card-header">
        <div className="card-title-block">
          <h2 className="card-title">Profil physiologique</h2>
          <p className="card-subtitle">
            {vm.confidenceLabel} · Comparaison vs repère −35 j à −8 j
          </p>
        </div>
        {TRAINING_MVP_RECOVERY_INFO?.card ? (
          <InfoTooltip
            title={TRAINING_MVP_RECOVERY_INFO.card.title}
            content={TRAINING_MVP_RECOVERY_INFO.card.content}
          />
        ) : null}
      </div>

      <div className="physio-rows">
        <PhysioRow
          label="Sommeil"
          unit="/ 100"
          metricModel={vm.sleep}
          max={100}
          color="var(--recovery-sleep-color, #7c6af7)"
          info={TRAINING_MVP_RECOVERY_INFO?.sleep}
        />
        <PhysioRow
          label="VFC moy."
          unit="ms"
          metricModel={vm.hrv}
          max={120}
          color="var(--recovery-hrv-color, #38bdf8)"
          info={TRAINING_MVP_RECOVERY_INFO?.hrv}
        />
        <PhysioRow
          label="FC repos"
          unit="bpm"
          metricModel={vm.restingHr}
          max={100}
          color="var(--recovery-hr-color, #f97316)"
          info={TRAINING_MVP_RECOVERY_INFO?.restingHr}
        />
        <PhysioRow
          label="Énergie"
          unit="%"
          metricModel={vm.bodyBattery}
          max={100}
          color="var(--recovery-bb-color, #22d3ee)"
          info={TRAINING_MVP_RECOVERY_INFO?.bodyBattery}
        />
      </div>
    </section>
  );
}

export default memo(PerformancePhysioCard);
