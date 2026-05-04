import { memo } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

function formatSleepDelta(deltaMin) {
  if (deltaMin == null) return "";
  const sign = deltaMin >= 0 ? "+" : "";
  return ` (${sign}${deltaMin} min vs repère)`;
}

function formatHrvDelta(deltaPct) {
  if (deltaPct == null) return "";
  const sign = deltaPct >= 0 ? "+" : "";
  return ` (${sign}${deltaPct} % vs repère)`;
}

function formatHrDelta(deltaBpm) {
  if (deltaBpm == null) return "";
  const sign = deltaBpm >= 0 ? "+" : "";
  return ` (${sign}${deltaBpm} bpm)`;
}

function deltaTone(value, positiveIsGood) {
  if (value == null) return "";
  const signed = positiveIsGood ? value : -value;
  if (signed > 5) return "tone-good";
  if (signed < -5) return "tone-warning";
  return "";
}

// ---------------------------------------------------------------------------
// Snapshot row
// ---------------------------------------------------------------------------

function ContextRow({ label, snapshot }) {
  if (!snapshot) {
    return (
      <div className="activity-recovery-row activity-recovery-row--empty">
        <span className="activity-recovery-label">{label}</span>
        <span className="activity-recovery-empty">Donnée absente</span>
      </div>
    );
  }

  return (
    <div className="activity-recovery-row">
      <span className="activity-recovery-label">{label}</span>
      <div className="activity-recovery-metrics">
        <span className={deltaTone(snapshot.sleepDeltaMin, true)}>
          Sommeil {formatDuration(snapshot.sleepDurationSeconds)}
          {formatSleepDelta(snapshot.sleepDeltaMin)}
        </span>
        <span className={deltaTone(snapshot.hrvDeltaPct, true)}>
          HRV {snapshot.hrvAvgMs ? `${Math.round(snapshot.hrvAvgMs)} ms` : "—"}
          {formatHrvDelta(snapshot.hrvDeltaPct)}
        </span>
        <span className={deltaTone(snapshot.restingHrDeltaBpm, false)}>
          FC repos {snapshot.restingHr ? `${Math.round(snapshot.restingHr)} bpm` : "—"}
          {formatHrDelta(snapshot.restingHrDeltaBpm)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

function ActivityRecoveryContextCard({ context = null }) {
  if (!context || !context.hasData) return null;

  return (
    <section className="activity-recovery-context-card">
      <h3 className="subcard-title">Contexte récupération avant / après</h3>
      <ContextRow label="Avant (nuit précédente)" snapshot={context.before} />
      <ContextRow label="Après (nuit suivante)" snapshot={context.after} />
    </section>
  );
}

export default memo(ActivityRecoveryContextCard);
