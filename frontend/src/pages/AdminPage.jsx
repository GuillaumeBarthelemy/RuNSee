import AppTopbar from "../components/AppTopbar.jsx";
import SyncActions from "../components/SyncActions.jsx";
import SyncStatusCard from "../components/SyncStatusCard.jsx";
import SyncSummaryCard from "../components/SyncSummaryCard.jsx";
import useRunSeeData from "../hooks/useRunSeeData.js";
import { startHistoricalSync, startIncrementalSync } from "../services/sync.service.js";
import { stravaLoginUrl } from "../config/env.js";

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.userMessage || error?.response?.data?.message || error?.message || fallback;
}

export default function AdminPage() {
  const { athlete, summary, currentJob, isBusy, error, setError, reload } = useRunSeeData({ includeActivities: false });

  const handleConnectStrava = () => {
    window.location.href = stravaLoginUrl;
  };

  const handleStartHistorical = async () => {
    setError("");
    try {
      await startHistoricalSync();
      await reload();
    } catch (err) {
      setError(extractErrorMessage(err, "Erreur lors du lancement du rechargement historique."));
    }
  };

  const handleStartIncremental = async () => {
    setError("");
    try {
      await startIncrementalSync();
      await reload();
    } catch (err) {
      setError(extractErrorMessage(err, "Erreur lors du lancement de la synchronisation incrémentale."));
    }
  };

  return (
    <div className="page premium-page">
      <div className="container">
        <AppTopbar
          title="Administration et synchronisation"
          subtitle="Pilote la connexion Strava, les rechargements et la supervision technique depuis un espace dédié, séparé des analyses métier."
        />

        {error ? <div className="alert alert-error section">{error}</div> : null}

        <div className="section">
          <SyncActions
            onConnectStrava={handleConnectStrava}
            onStartHistorical={handleStartHistorical}
            onStartIncremental={handleStartIncremental}
            isBusy={isBusy}
          />
        </div>

        <div className="section">
          <SyncSummaryCard summary={summary} athlete={athlete} />
        </div>

        <div className="grid two-columns section admin-layout-grid">
          <SyncStatusCard currentJob={currentJob} />
          <section className="card card-accent status-side-card">
            <h2 className="card-title">État général</h2>
            <p className="muted">
              {athlete
                ? "La connexion Strava est active. Les synchronisations et le suivi des jobs sont centralisés ici pour laisser le tableau de bord concentré sur l'analyse."
                : "Aucun athlète connecté. Commence par la connexion Strava, puis lance un historique initial avant d'utiliser l'incrémental."}
            </p>
            <div className="top-gap-sm admin-checklist">
              <div className="admin-check-item">
                <strong>Connexion</strong>
                <span>{athlete ? "Active" : "À établir"}</span>
              </div>
              <div className="admin-check-item">
                <strong>Historique</strong>
                <span>{summary?.lastHistoricalSync?.endedAt ? "Déjà exécuté" : "À lancer"}</span>
              </div>
              <div className="admin-check-item">
                <strong>Incrémental</strong>
                <span>{summary?.lastIncrementalSync?.endedAt ? "Disponible" : "Pas encore utilisé"}</span>
              </div>
              <div className="admin-check-item">
                <strong>Données locales</strong>
                <span>{summary?.totalActivities ?? 0} activité(s)</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
