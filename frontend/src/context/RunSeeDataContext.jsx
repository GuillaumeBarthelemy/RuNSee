import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentAthlete } from "../services/athlete.service.js";
import { getActivities } from "../services/activity.service.js";
import { getCurrentSyncJob, getSyncSummary } from "../services/sync.service.js";
import { getTrainingAnalyticsSettings } from "../services/trainingAnalyticsSettings.service.js";
import { RunSeeDataContext } from "./RunSeeDataContextBase.js";

const BASE_STALE_MS = 60_000;
const ACTIVITIES_STALE_MS = 60_000;
const BACKGROUND_REFRESH_MS = 60_000;

const INITIAL_STATE = {
  athlete: null,
  summary: null,
  currentJob: null,
  trainingAnalyticsSettings: null,
  trainingAnalyticsSettingsHistory: [],
  activities: [],
  isBaseLoading: false,
  isActivitiesLoading: false,
  baseLoaded: false,
  activitiesLoaded: false,
  error: "",
};

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.userMessage || error?.response?.data?.message || error?.message || fallback;
}


export function RunSeeDataProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);
  const stateRef = useRef(INITIAL_STATE);
  const baseRequestRef = useRef(null);
  const activitiesRequestRef = useRef(null);
  const lastBaseLoadedAtRef = useRef(0);
  const lastActivitiesLoadedAtRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setError = useCallback((value) => {
    setState((current) => ({ ...current, error: String(value || "") }));
  }, []);

  const loadBase = useCallback(async ({ force = false } = {}) => {
    const current = stateRef.current;

    if (baseRequestRef.current) {
      return baseRequestRef.current;
    }

    if (!force && current.baseLoaded && Date.now() - lastBaseLoadedAtRef.current < BASE_STALE_MS) {
      return current;
    }

    setState((previous) => ({ ...previous, isBaseLoading: true }));

    const request = (async () => {
      try {
        const [athleteRes, summaryRes, currentJobRes, trainingSettingsRes] = await Promise.allSettled([
          getCurrentAthlete(),
          getSyncSummary(),
          getCurrentSyncJob(),
          getTrainingAnalyticsSettings(),
        ]);

        const errors = [];
        let athlete = null;
        let summary = null;
        let currentJob = null;
        let trainingAnalyticsSettings = null;
        let trainingAnalyticsSettingsHistory = [];

        if (athleteRes.status === "fulfilled") {
          athlete = athleteRes.value ?? null;
        } else if (athleteRes.reason?.response?.status !== 404) {
          errors.push(athleteRes.reason);
        }

        if (summaryRes.status === "fulfilled") {
          summary = summaryRes.value ?? null;
        } else {
          errors.push(summaryRes.reason);
        }

        if (currentJobRes.status === "fulfilled") {
          currentJob = currentJobRes.value ?? null;
        } else {
          errors.push(currentJobRes.reason);
        }

        if (trainingSettingsRes.status === "fulfilled") {
          trainingAnalyticsSettings = trainingSettingsRes.value?.settings ?? null;
          trainingAnalyticsSettingsHistory = Array.isArray(trainingSettingsRes.value?.history)
            ? trainingSettingsRes.value.history
            : [];
        } else {
          errors.push(trainingSettingsRes.reason);
        }

        lastBaseLoadedAtRef.current = Date.now();
        setState((previous) => ({
          ...previous,
          athlete,
          summary,
          currentJob,
          trainingAnalyticsSettings,
          trainingAnalyticsSettingsHistory,
          isBaseLoading: false,
          baseLoaded: true,
          error: errors.length ? extractErrorMessage(errors[0], "Erreur de chargement des donnees RuNSee.") : "",
        }));
      } catch (error) {
        setState((previous) => ({
          ...previous,
          athlete: null,
          summary: null,
          currentJob: null,
          trainingAnalyticsSettings: null,
          trainingAnalyticsSettingsHistory: [],
          isBaseLoading: false,
          baseLoaded: true,
          error: extractErrorMessage(error, "Erreur de chargement des donnees RuNSee."),
        }));
      }
    })();

    baseRequestRef.current = request.finally(() => {
      baseRequestRef.current = null;
    });

    return baseRequestRef.current;
  }, []);

  const loadActivities = useCallback(async ({ force = false } = {}) => {
    const current = stateRef.current;

    if (activitiesRequestRef.current) {
      return activitiesRequestRef.current;
    }

    if (!force && current.activitiesLoaded && Date.now() - lastActivitiesLoadedAtRef.current < ACTIVITIES_STALE_MS) {
      return current.activities;
    }

    setState((previous) => ({ ...previous, isActivitiesLoading: true }));

    const request = (async () => {
      try {
        const activities = await getActivities();
        lastActivitiesLoadedAtRef.current = Date.now();
        setState((previous) => ({
          ...previous,
          activities: Array.isArray(activities) ? activities : [],
          isActivitiesLoading: false,
          activitiesLoaded: true,
          error: "",
        }));
      } catch (error) {
        setState((previous) => ({
          ...previous,
          activities: [],
          isActivitiesLoading: false,
          activitiesLoaded: true,
          error: extractErrorMessage(error, "Erreur de chargement des donnees RuNSee."),
        }));
      }
    })();

    activitiesRequestRef.current = request.finally(() => {
      activitiesRequestRef.current = null;
    });

    return activitiesRequestRef.current;
  }, []);

  const ensureData = useCallback(async ({ includeActivities = false, force = false } = {}) => {
    await loadBase({ force });

    if (includeActivities) {
      await loadActivities({ force });
    }
  }, [loadActivities, loadBase]);

  const reload = useCallback(async ({ includeActivities = false } = {}) => {
    await ensureData({ includeActivities, force: true });
  }, [ensureData]);

  useEffect(() => {
    ensureData({ includeActivities: false }).catch(() => {});
  }, [ensureData]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadBase({ force: true }).catch(() => {});

      if (stateRef.current.activitiesLoaded) {
        loadActivities({ force: true }).catch(() => {});
      }
    }, BACKGROUND_REFRESH_MS);

    return () => clearInterval(timer);
  }, [loadActivities, loadBase]);

  const isBusy = ["queued", "running"].includes(state.currentJob?.status);

  useEffect(() => {
    if (!isBusy) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadBase({ force: true }).catch(() => {});

      if (stateRef.current.activitiesLoaded) {
        loadActivities({ force: true }).catch(() => {});
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [isBusy, loadActivities, loadBase]);

  const value = useMemo(
    () => ({
      state,
      setError,
      ensureData,
      reload,
    }),
    [ensureData, reload, setError, state],
  );

  return (
    <RunSeeDataContext.Provider value={value}>
      {children}
    </RunSeeDataContext.Provider>
  );
}
