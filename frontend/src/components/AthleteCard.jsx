function formatAthleteName(athlete) {
  if (!athlete) {
    return "Aucun athlète connecté";
  }

  const fullName = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ").trim();
  return fullName || athlete.username || `Athlète #${athlete.stravaAthleteId ?? "N/A"}`;
}

export default function AthleteCard({ athlete, loading }) {
  if (loading) {
    return (
      <section className="card">
        <h2>Strava</h2>
        <p>Chargement du profil…</p>
      </section>
    );
  }

  if (!athlete) {
    return (
      <section className="card">
        <h2>Strava</h2>
        <p>Aucun athlète connecté.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Strava</h2>
      <div className="athlete-card">
        {athlete.profileMediumUrl ? (
          <img
            className="avatar"
            src={athlete.profileMediumUrl}
            alt={formatAthleteName(athlete)}
          />
        ) : (
          <div className="avatar avatar-placeholder">RS</div>
        )}
        <div>
          <p className="athlete-name">{formatAthleteName(athlete)}</p>
          <p className="muted">ID Strava : {athlete.stravaAthleteId ?? "N/A"}</p>
          <p className="muted">
            {[athlete.city, athlete.state, athlete.country].filter(Boolean).join(", ") || "Localisation non renseignée"}
          </p>
        </div>
      </div>
    </section>
  );
}
