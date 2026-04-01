import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import ActivityDetailCard from "../components/ActivityDetailCard.jsx";
import AppTopbar from "../components/AppTopbar.jsx";
import { enrichActivity, getActivityById } from "../services/activity.service.js";

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.details || error?.response?.data?.message || error?.message || fallback;
}

export default function ActivityDetailPage() {
  const { stravaActivityId } = useParams();
  const location = useLocation();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const returnHash = useMemo(() => {
    return location.state?.returnHash || sessionStorage.getItem("runsee-return-hash") || "";
  }, [location.state]);

  const loadActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getActivityById(stravaActivityId);
      setActivity(data);
    } catch (err) {
      setError(extractErrorMessage(err, "Impossible de charger la fiche activité."));
    } finally {
      setLoading(false);
    }
  }, [stravaActivityId]);

  const handleEnrich = useCallback(async () => {
    try {
      setIsEnriching(true);
      setError("");
      setSuccessMessage("");
      const response = await enrichActivity(stravaActivityId);
      setActivity(response.activity || response);
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
        <AppTopbar
          title="Fiche activité"
          subtitle="Lecture locale détaillée avec enrichissement à la demande depuis Strava, puis retour direct à la ligne d'origine dans le tableau de bord."
          actions={
            <Link className="link-button" to={{ pathname: "/", hash: returnHash ? `#${returnHash}` : "" }}>
              Retour au tableau de bord
            </Link>
          }
          badge="Activité"
        />

        {loading ? <div className="card">Chargement de l'activité…</div> : null}
        {!loading && error ? <div className="alert alert-error section">{error}</div> : null}
        {!loading && successMessage ? <div className="alert alert-success section">{successMessage}</div> : null}
        {!loading && activity ? <ActivityDetailCard activity={activity} onEnrich={handleEnrich} isEnriching={isEnriching} /> : null}
      </div>
    </div>
  );
}
