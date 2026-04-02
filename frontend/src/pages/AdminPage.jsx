import { useCallback } from "react";
import AppNavigation from "../components/AppNavigation.jsx";
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
  const { athlete, summary, currentJob, error, setError, reload, isBusy } = useRunSeeData({ includeActivities: false });

  const handleConnectStrava = useCallback(() => {
    window.location.href = stravaLoginUrl;
  }, []);

  const handleStartHistorical = useCallback(async () => {
    setError("");
    try {
      await startHistoricalSync();
      await reload();
    } catch (err) {
      setError(extractErrorMessage(err, "Erreur lors du lancement du rechargement historique."));
    }
  }, [reload, setError]);

  const handleStartIncremental = useCallback(async () => {
    setError("");
    try {
      await startIncrementalSync();
      await reload();
    } catch (err) {
      setError(extractErrorMessage(err, "Erreur lors du lancement de la synchronisation incrémentale."));
    }
  }, [reload, setError]);

  return (
    <div className="page premium-page">
      <div className="container">
        <header className="topbar premium-topbar">
          <div>
            <div className="brand-line">
              <span className="brand-badge">RuNSee</span>
              <AppNavigation />
            </div>
            <h1 className="topbar-title">Administration</h1>
            <p className="page-subtitle">Pilote les synchronisations, contrôle l'état local et supervise la connexion Strava.</p>
          </div>
        </header>

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

        <div className="grid two-columns section">
          <SyncStatusCard currentJob={currentJob} />
          <section className="card card-accent status-side-card">
            <h2 className="card-title">État général</h2>
            <p className="muted">
              {athlete
                ? "Connexion Strava active. La base locale est prête à être synchronisée et enrichie à la demande."
                : "Aucun athlète connecté. Lance d'abord la connexion Strava pour alimenter l'application."}
            </p>
            <div className="top-gap-sm small-text">La page d'administration conserve désormais le contexte du tableau de bord pendant ta navigation.</div>
          </section>
        </div>
      </div>
    </div>
  );
}
