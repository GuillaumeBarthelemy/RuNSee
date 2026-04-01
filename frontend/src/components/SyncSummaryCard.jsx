import { getDisplaySportLabel } from "../utils/activityAggregations.js";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR");
}

export default function SyncSummaryCard({ summary, athlete }) {
  const athleteName = athlete
    ? `${athlete.firstname || ""} ${athlete.lastname || ""}`.trim() || athlete.username || "Connecté"
    : "Non connecté";

  return (
    <section className="card glass-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Vue d'ensemble locale</h2>
          <p className="card-subtitle">État de la base locale et dernières synchronisations réussies.</p>
        </div>
      </div>

      <div className="grid three-columns">
        <div className="metric-card">
          <span className="metric-label">Athlète connecté</span>
          <div className="metric-value medium-metric">{athleteName}</div>
          <div className="metric-secondary">{athlete?.city ? `${athlete.city}${athlete.country ? `, ${athlete.country}` : ""}` : athlete?.username || "-"}</div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Activités locales</span>
          <div className="metric-value">{summary?.totalActivities ?? 0}</div>
          <div className="metric-secondary">Dernière activité : {summary?.latestActivity?.name || "-"}</div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Dernière activité stockée</span>
          <div className="metric-value medium-metric">{formatDate(summary?.latestActivity?.startDate)}</div>
          <div className="metric-secondary">{summary?.latestActivity ? getDisplaySportLabel(summary.latestActivity) : "-"}</div>
        </div>
      </div>

      <div className="grid two-columns top-gap-sm">
        <div className="metric-card">
          <span className="metric-label">Dernier historique réussi</span>
          <div className="metric-value medium-metric">{formatDate(summary?.lastHistoricalSync?.endedAt)}</div>
          <div className="metric-secondary">{summary?.lastHistoricalSync?.message || "-"}</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Dernière synchro incrémentale</span>
          <div className="metric-value medium-metric">{formatDate(summary?.lastIncrementalSync?.endedAt)}</div>
          <div className="metric-secondary">{summary?.lastIncrementalSync?.message || "-"}</div>
        </div>
      </div>
    </section>
  );
}
