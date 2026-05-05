import KpiGrid from "./KpiGrid.jsx";

function formatSleepDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${hours}h`;
}

function formatSnapshotDate(snapshotDate) {
  if (!snapshotDate) return null;
  try {
    return new Date(snapshotDate).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return null;
  }
}

function buildRecoveryKpiItems(snapshot) {
  const items = [];

  const sleepScore = snapshot.sleepScore != null ? Math.round(snapshot.sleepScore) : null;
  items.push({
    label: "Sommeil",
    value: sleepScore != null ? `${sleepScore} / 100` : "-",
    hint: formatSleepDuration(snapshot.sleepDurationSeconds) || "score Garmin",
    valueClassName: sleepScore != null && sleepScore < 50 ? "metric-value-warning" : "",
  });

  const hrv = snapshot.hrvAvgMs != null ? Math.round(snapshot.hrvAvgMs) : null;
  const hrvStatus = snapshot.hrvStatus;
  items.push({
    label: "VFC moy.",
    value: hrv != null ? `${hrv} ms` : "-",
    hint: hrvStatus ? hrvStatus.toLowerCase().replace("_", " ") : "variabilite de frequence cardiaque",
  });

  const restingHr = snapshot.restingHr != null ? Math.round(snapshot.restingHr) : null;
  items.push({
    label: "FC repos",
    value: restingHr != null ? `${restingHr} bpm` : "-",
    hint: "frequence cardiaque au repos",
  });

  const bodyBattery = snapshot.bodyBatteryMorning ?? snapshot.bodyBatteryEnd ?? null;
  items.push({
    label: "Énergie",
    value: bodyBattery != null ? `${bodyBattery} %` : "-",
    hint: bodyBattery != null && snapshot.bodyBatteryMorning != null ? "au reveil" : "en journee",
    valueClassName: bodyBattery != null && bodyBattery < 30 ? "metric-value-warning" : "",
  });

  const readiness = snapshot.trainingReadinessScore != null
    ? Math.round(snapshot.trainingReadinessScore)
    : null;
  if (readiness != null || snapshot.trainingReadinessStatus) {
    items.push({
      label: "Readiness",
      value: readiness != null ? `${readiness} / 100` : "-",
      hint: snapshot.trainingReadinessStatus
        ? snapshot.trainingReadinessStatus.toLowerCase().replace("_", " ")
        : "aptitude a l'entrainement",
    });
  }

  const stressAvg = snapshot.stressAvg != null ? Math.round(snapshot.stressAvg) : null;
  if (stressAvg != null) {
    items.push({
      label: "Stress moy.",
      value: `${stressAvg} / 100`,
      hint: "niveau de stress journalier",
      valueClassName: stressAvg > 60 ? "metric-value-warning" : "",
    });
  }

  return items;
}

export default function RecoverySnapshotCard({ snapshots = [] }) {
  if (!snapshots.length) {
    return null;
  }

  // Snapshots are sorted asc — take the most recent
  const latestSnapshot = snapshots[snapshots.length - 1];
  const dateLabel = formatSnapshotDate(latestSnapshot.snapshotDate);
  const items = buildRecoveryKpiItems(latestSnapshot);

  return (
    <section className="card recovery-snapshot-card">
      <div className="card-header">
        <div className="card-title-block">
          <h2 className="card-title">Recuperation Garmin</h2>
          {dateLabel ? (
            <span className="card-subtitle">Derniere mesure : {dateLabel}</span>
          ) : null}
        </div>
      </div>
      <KpiGrid items={items} className="kpi-grid recovery-kpi-grid" />
    </section>
  );
}
