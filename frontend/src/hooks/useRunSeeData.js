import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentAthlete } from "../services/athlete.service.js";
import { getActivities } from "../services/activity.service.js";
import { getCurrentSyncJob, getSyncSummary } from "../services/sync.service.js";

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.userMessage || error?.response?.data?.message || error?.message || fallback;
}

export default function useRunSeeData({ includeActivities = true } = {}) {
  const [athlete, setAthlete] = useState(null);
  const [summary, setSummary] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setIsLoading(true);

    try {
      setError("");
      const requests = [getCurrentAthlete(), getSyncSummary(), getCurrentSyncJob()];
      if (includeActivities) requests.push(getActivities());
      const [athleteRes, summaryRes, currentJobRes, activitiesRes] = await Promise.allSettled(requests);
      const errors = [];

      if (athleteRes.status === "fulfilled") {
        setAthlete(athleteRes.value ?? null);
      } else if (athleteRes.reason?.response?.status !== 404) {
        setAthlete(null);
        errors.push(athleteRes.reason);
      } else {
        setAthlete(null);
      }

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value ?? null);
      } else {
        setSummary(null);
        errors.push(summaryRes.reason);
      }

      if (currentJobRes.status === "fulfilled") {
        setCurrentJob(currentJobRes.value ?? null);
      } else {
        setCurrentJob(null);
        errors.push(currentJobRes.reason);
      }

      if (includeActivities) {
        if (activitiesRes.status === "fulfilled") {
          setActivities(Array.isArray(activitiesRes.value) ? activitiesRes.value : []);
        } else {
          setActivities([]);
          errors.push(activitiesRes.reason);
        }
      } else {
        setActivities([]);
      }

      if (errors.length) {
        setError(extractErrorMessage(errors[0], "Erreur de chargement des données RuNSee."));
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Erreur de chargement des données RuNSee."));
      setAthlete(null);
      setSummary(null);
      setCurrentJob(null);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [includeActivities]);

  useEffect(() => {
    reload();
  }, [reload]);

  const isBusy = useMemo(() => ["queued", "running"].includes(currentJob?.status), [currentJob]);

  useEffect(() => {
    if (!isBusy) return undefined;
    const timer = setInterval(() => {
      reload();
    }, 3000);
    return () => clearInterval(timer);
  }, [isBusy, reload]);

  return {
    athlete,
    summary,
    currentJob,
    activities,
    isLoading,
    error,
    setError,
    reload,
    isBusy,
  };
}
