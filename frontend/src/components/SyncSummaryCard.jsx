function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR");
}

function getStatusLabel({ currentJob, isStravaConnected, totalActivities }) {
  if (currentJob?.status === "running") return "En cours";
  if (currentJob?.status === "queued") return "En attente";
  if (!isStravaConnected) return "À connecter";
  if (totalActivities > 0) return "Prêt";
  return "Connecté";
}

function getStatusClass({ currentJob, isStravaConnected, totalActivities }) {
  if (currentJob?.status) {
    return `status-${currentJob.status}`;
  }

  if (!isStravaConnected) {
    return "status-idle";
  }

  return totalActivities > 0 ? "status-success" : "status-idle";
}

export default function SyncSummaryCard({ summary, athlete, currentJob, isStravaConnected = false }) {
  const athleteName = athlete
    ? `${athlete.firstname || ""} ${athlete.lastname || ""}`.trim() || athlete.username || "Connecté"
    : "Non connecté";
  const totalActivities = Number(summary?.totalActivities || 0);
  const detailedActivities = Number(summary?.detailedActivities || 0);
  const pendingDetailEnrichment = Number(summary?.pendingDetailEnrichment || 0);

  const latestSyncDate =
    summary?.lastIncrementalSync?.endedAt ||
    summary?.lastDetailBackfillSync?.endedAt ||
    summary?.lastHistoricalSync?.endedAt ||
    summary?.latestActivity?.startDate ||
    null;
  const statusContext = {
    currentJob,
    isStravaConnected,
    totalActivities,
  };
  const progress = Number(currentJob?.progressPercent || 0);

  return (
    <section className="card glass-card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h2 className="card-title">3. État</h2>
          <p className="card-subtitle">L'essentiel sur le compte Strava et les données locales.</p>
        </div>
        <span className={`status-pill ${getStatusClass(statusContext)}`}>
          {getStatusLabel(statusContext)}
        </span>
      </div>

      <div className="admin-mini-stats">
        <div className="admin-mini-stat">
          <span className="metric-label">Profil</span>
          <strong className="admin-mini-value">{athleteName}</strong>
          <span className="metric-secondary">
            {athlete?.city ? `${athlete.city}${athlete.country ? `, ${athlete.country}` : ""}` : athlete?.username || "Aucun compte relie"}
          </span>
        </div>

        <div className="admin-mini-stat">
          <span className="metric-label">Activités</span>
          <strong className="admin-mini-value">{totalActivities}</strong>
          <span className="metric-secondary">{summary?.latestActivity?.name || "Aucune activité importée"}</span>
        </div>

        <div className="admin-mini-stat">
          <span className="metric-label">JSON détaillé</span>
          <strong className="admin-mini-value">{detailedActivities}</strong>
          <span className="metric-secondary">
            {pendingDetailEnrichment > 0
              ? `${pendingDetailEnrichment} activité(s) à enrichir`
              : "Base détaillée à jour"}
          </span>
        </div>

        <div className="admin-mini-stat">
          <span className="metric-label">{currentJob ? "Synchronisation" : "Dernière mise à jour"}</span>
          <strong className="admin-mini-value">{currentJob ? getStatusLabel(statusContext) : formatDate(latestSyncDate)}</strong>
          <span className="metric-secondary">
            {summary?.lastIncrementalSync?.message
              || summary?.lastDetailBackfillSync?.message
              || summary?.lastHistoricalSync?.message
              || "Aucune synchronisation récente"}
          </span>
        </div>
      </div>

      {currentJob ? (
        <>
          <div className="progress-shell top-gap-sm" aria-hidden="true">
            <div className="progress-bar-fill" style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
          </div>
          <div className="progress-caption">
            {currentJob.message || "Synchronisation en cours."}
          </div>
        </>
      ) : null}
    </section>
  );
}
