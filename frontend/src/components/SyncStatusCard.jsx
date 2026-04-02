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
      return "Termine";
    case "failed":
      return "En erreur";
    case "cancelled":
      return "Annule";
    default:
      return "Inactif";
  }
}

function getJobTypeLabel(jobType) {
  if (jobType === "historical") return "Historique";
  if (jobType === "incremental") return "Incrementale";
  return jobType || "-";
}

export default function SyncStatusCard({ currentJob }) {
  if (!currentJob) {
    return (
      <section className="card">
        <div className="card-header-row wrap-on-mobile">
          <div>
            <h2 className="card-title">Etat de synchronisation</h2>
            <p className="card-subtitle">Aucune synchronisation en cours.</p>
          </div>
          <span className="status-pill status-idle">Inactif</span>
        </div>
        <p className="muted">
          Utilisez les actions ci-dessus pour connecter Strava, recharger l'historique ou recuperer les nouveautes.
        </p>
      </section>
    );
  }

  const progress = Number(currentJob.progressPercent || 0);

  return (
    <section className="card card-accent">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h2 className="card-title">Etat de synchronisation</h2>
          <p className="card-subtitle">Suivi du dernier job execute cote backend.</p>
        </div>
        <span className={`status-pill ${getStatusClass(currentJob.status)}`}>{getStatusLabel(currentJob.status)}</span>
      </div>

      <div className="inline-meta-grid">
        <span><strong>Type</strong> {getJobTypeLabel(currentJob.jobType)}</span>
        <span><strong>Debut</strong> {formatDate(currentJob.startedAt || currentJob.queuedAt)}</span>
        <span><strong>Fin</strong> {formatDate(currentJob.endedAt)}</span>
      </div>

      <div className="progress-shell" aria-hidden="true">
        <div className="progress-bar-fill" style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
      </div>
      <div className="progress-caption">Progression estimee : {progress}%</div>

      <div className="grid two-columns top-gap-sm">
        <div className="metric-card compact-metric">
          <span className="metric-label">Activites vues</span>
          <div className="metric-value small-metric">{currentJob.activitiesSeen ?? 0}</div>
        </div>
        <div className="metric-card compact-metric">
          <span className="metric-label">Ajoutees ou mises a jour</span>
          <div className="metric-value small-metric">
            {(currentJob.activitiesInserted ?? 0) + (currentJob.activitiesUpdated ?? 0)}
          </div>
        </div>
      </div>

      <div className="job-message top-gap-sm">{currentJob.message || "Aucun message complementaire."}</div>
    </section>
  );
}
