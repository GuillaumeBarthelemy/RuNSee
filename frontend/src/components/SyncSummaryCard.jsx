function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR");
}

export default function SyncSummaryCard({ summary, athlete }) {
  const athleteName = athlete
    ? `${athlete.firstname || ""} ${athlete.lastname || ""}`.trim() || athlete.username || "Connecte"
    : "Non connecte";

  const latestSyncDate =
    summary?.lastIncrementalSync?.endedAt ||
    summary?.lastHistoricalSync?.endedAt ||
    summary?.latestActivity?.startDate ||
    null;

  return (
    <section className="card glass-card">
      <div className="card-header-row wrap-on-mobile">
        <div>
          <h2 className="card-title">Connexion Strava</h2>
          <p className="card-subtitle">Etat du compte source et des donnees importees.</p>
        </div>
      </div>

      <div className="grid three-columns">
        <div className="metric-card">
          <span className="metric-label">Profil Strava</span>
          <div className="metric-value medium-metric">{athleteName}</div>
          <div className="metric-secondary">
            {athlete?.city ? `${athlete.city}${athlete.country ? `, ${athlete.country}` : ""}` : athlete?.username || "Aucun profil relie"}
          </div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Activites locales</span>
          <div className="metric-value">{summary?.totalActivities ?? 0}</div>
          <div className="metric-secondary">{summary?.latestActivity?.name || "Aucune activite importee"}</div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Derniere mise a jour</span>
          <div className="metric-value medium-metric">{formatDate(latestSyncDate)}</div>
          <div className="metric-secondary">
            {summary?.lastIncrementalSync?.message || summary?.lastHistoricalSync?.message || "Aucune synchronisation recente"}
          </div>
        </div>
      </div>
    </section>
  );
}
