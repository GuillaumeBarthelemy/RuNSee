import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import ActivityDetailCard from "../components/ActivityDetailCard.jsx";
import AppNavigation from "../components/AppNavigation.jsx";
import { enrichActivity, getActivityById } from "../services/activity.service.js";

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.details || error?.response?.data?.message || error?.message || fallback;
}

function getStoredReturnHash() {
  if (typeof window === "undefined" || !window.sessionStorage) return "";
  return sessionStorage.getItem("runsee-return-hash") || "";
}

export default function ActivityDetailPage() {
  const { stravaActivityId } = useParams();
  const location = useLocation();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const returnHash = useMemo(() => location.state?.returnHash || getStoredReturnHash(), [location.state]);

  const loadActivity = useCallback(async () => {
    if (!stravaActivityId) {
      setActivity(null);
      setError("Identifiant d'activité manquant.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await getActivityById(stravaActivityId);
      setActivity(data ?? null);
    } catch (err) {
      setActivity(null);
      setError(extractErrorMessage(err, "Impossible de charger la fiche activité."));
    } finally {
      setLoading(false);
    }
  }, [stravaActivityId]);

  const handleEnrich = useCallback(async () => {
    if (!stravaActivityId) return;

    try {
      setIsEnriching(true);
      setError("");
      setSuccessMessage("");
      const response = await enrichActivity(stravaActivityId);
      setActivity(response?.activity || response || null);
      setSuccessMessage("Activité enrichie avec succès depuis Strava.");
    } catch (err) {
      setError(extractErrorMessage(err, "Erreur lors de l'enrichissement de l'activité."));
    } finally {
      setIsEnriching(false);
    }
  }, [stravaActivityId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  return (
    <div className="page premium-page">
      <div className="container detail-container">
        <div className="page-header premium-detail-header">
          <div>
            <div className="brand-line">
              <span className="brand-badge">RuNSee</span>
              <AppNavigation />
            </div>
            <span className="eyebrow">Fiche activité</span>
            <h1 className="page-title">Analyse détaillée</h1>
            <p className="page-subtitle">Carte du parcours, splits Strava et laps montre, sans perdre le contexte du tableau de bord.</p>
          </div>
          <Link className="link-button" to={{ pathname: "/", hash: returnHash ? `#${returnHash}` : "" }}>
            Retour au tableau de bord
          </Link>
        </div>

        {loading ? <div className="card">Chargement de l'activité...</div> : null}
        {!loading && error ? <div className="alert alert-error section">{error}</div> : null}
        {!loading && successMessage ? <div className="alert alert-success section">{successMessage}</div> : null}
        {!loading && activity ? <ActivityDetailCard activity={activity} onEnrich={handleEnrich} isEnriching={isEnriching} /> : null}
        {!loading && !activity && !error ? <div className="card">Aucune activité disponible pour cet identifiant.</div> : null}
      </div>
    </div>
  );
}
