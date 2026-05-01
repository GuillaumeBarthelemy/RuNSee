import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import ActivityDetailCard from "../components/ActivityDetailCard.jsx";
import useRunSeeData from "../hooks/useRunSeeData.js";
import AppShell from "../layouts/AppShell.jsx";
import { enrichActivity, getActivityById } from "../services/activity.service.js";

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.details || error?.response?.data?.message || error?.message || fallback;
}

function getStoredReturnLocation() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return { pathname: "/", hash: "" };
  }

  try {
    const raw = sessionStorage.getItem("runsee-return-location");

    if (!raw) {
      return {
        pathname: "/",
        hash: sessionStorage.getItem("runsee-return-hash") || "",
      };
    }

    const parsed = JSON.parse(raw);
    return {
      pathname: parsed?.pathname || "/",
      hash: parsed?.hash || sessionStorage.getItem("runsee-return-hash") || "",
    };
  } catch {
    return {
      pathname: "/",
      hash: sessionStorage.getItem("runsee-return-hash") || "",
    };
  }
}

function getReturnLabel(pathname) {
  if (pathname === "/activities") {
    return "Retour aux activites";
  }

  if (pathname === "/analytics") {
    return "Retour aux analyses";
  }

  return "Retour a Aujourd'hui";
}

export default function ActivityDetailPage() {
  const { stravaActivityId } = useParams();
  const location = useLocation();
  const { trainingAnalyticsSettings } = useRunSeeData({ includeActivities: false });
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const storedReturnLocation = useMemo(() => getStoredReturnLocation(), []);
  const returnPath = location.state?.returnPath || storedReturnLocation.pathname || "/";
  const returnHash = location.state?.returnHash || storedReturnLocation.hash || "";
  const returnLabel = getReturnLabel(returnPath);

  const loadActivity = useCallback(async () => {
    if (!stravaActivityId) {
      setActivity(null);
      setError("Identifiant d'activite manquant.");
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
      setError(extractErrorMessage(err, "Impossible de charger la fiche activite."));
    } finally {
      setLoading(false);
    }
  }, [stravaActivityId]);

  const handleEnrich = useCallback(async () => {
    if (!stravaActivityId) {
      return;
    }

    try {
      setIsEnriching(true);
      setError("");
      setSuccessMessage("");
      const response = await enrichActivity(stravaActivityId);
      const nextActivity = response?.activity?.activity || response?.activity || response || null;
      setActivity(nextActivity);
      setSuccessMessage("Activite enrichie avec succes depuis Strava.");
    } catch (err) {
      setError(extractErrorMessage(err, "Erreur lors de l'enrichissement de l'activite."));
    } finally {
      setIsEnriching(false);
    }
  }, [stravaActivityId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  return (
    <AppShell
      eyebrow="Activite"
      title="Analyse detaillee"
      subtitle="Carte, splits, charge de seance et efficience allure / FC sans perdre le contexte de navigation."
      actions={(
        <Link className="link-button" to={{ pathname: returnPath, hash: returnHash ? `#${returnHash}` : "" }}>
          {returnLabel}
        </Link>
      )}
    >
      {loading ? <div className="card">Chargement de l'activite...</div> : null}
      {!loading && error ? <div className="alert alert-error section">{error}</div> : null}
      {!loading && successMessage ? <div className="alert alert-success section">{successMessage}</div> : null}
      {!loading && activity ? (
        <ActivityDetailCard
          activity={activity}
          trainingAnalyticsSettings={trainingAnalyticsSettings}
          onEnrich={handleEnrich}
          isEnriching={isEnriching}
          onActivityUpdated={setActivity}
        />
      ) : null}
      {!loading && !activity && !error ? (
        <div className="card">Aucune activite disponible pour cet identifiant.</div>
      ) : null}
    </AppShell>
  );
}
