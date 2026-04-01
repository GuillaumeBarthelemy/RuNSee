function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR");
}

function getStatusClass(status) {
  if (!status) return "status-idle";
  return `status-${status}`;
}

function getStatusLabel(status) {
  switch (status) {
    case "queued":
      return "En attente";
    case "running":
      return "En cours";
    case "success":
      return "Terminé";
    case "failed":
      return "En erreur";
    case "cancelled":
      return "Annulé";
    default:
      return "Inactif";
  }
}

function getJobTypeLabel(jobType) {
  if (jobType === "historical") return "Historique";
  if (jobType === "incremental") return "Incrémental";
  return jobType || "-";
}

export default function SyncStatusCard({ currentJob }) {
  if (!currentJob) {
    return (
      <section className="card card-accent">
        <div className="card-header-row">
          <div>
            <h2 className="card-title">Synchronisation en direct</h2>
            <p className="card-subtitle">Aucun job actif pour le moment.</p>
          </div>
          <span className="status-pill status-idle">Inactif</span>
        </div>
        <p className="muted">Le backend est prêt. Lance un historique ou une synchro incrémentale depuis le bandeau d'action.</p>
      </section>
    );
  }

  const progress = Number(currentJob.progressPercent || 0);

  return (
    <section className="card card-accent">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Synchronisation en direct</h2>
          <p className="card-subtitle">Suivi du dernier job côté backend.</p>
        </div>
        <span className={`status-pill ${getStatusClass(currentJob.status)}`}>{getStatusLabel(currentJob.status)}</span>
      </div>

      <div className="inline-meta-grid">
        <span><strong>Type</strong> {getJobTypeLabel(currentJob.jobType)}</span>
        <span><strong>Début</strong> {formatDate(currentJob.startedAt || currentJob.queuedAt)}</span>
        <span><strong>Fin</strong> {formatDate(currentJob.endedAt)}</span>
      </div>

      <div className="progress-shell" aria-hidden="true">
        <div className="progress-bar-fill" style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
      </div>
      <div className="progress-caption">Progression estimée : {progress}%</div>

      <div className="grid two-columns top-gap-sm">
        <div className="metric-card compact-metric"><span className="metric-label">Pages traitées</span><div className="metric-value small-metric">{currentJob.pagesProcessed ?? 0}</div></div>
        <div className="metric-card compact-metric"><span className="metric-label">Activités vues</span><div className="metric-value small-metric">{currentJob.activitiesSeen ?? 0}</div></div>
        <div className="metric-card compact-metric"><span className="metric-label">Insérées</span><div className="metric-value small-metric">{currentJob.activitiesInserted ?? 0}</div></div>
        <div className="metric-card compact-metric"><span className="metric-label">Mises à jour</span><div className="metric-value small-metric">{currentJob.activitiesUpdated ?? 0}</div></div>
      </div>

      <div className="job-message top-gap-sm">{currentJob.message || "Aucun message complémentaire."}</div>
    </section>
  );
}
